import Anthropic from '@anthropic-ai/sdk'
import { adminHeaders, getEnv, requireUser, SUPABASE } from '../lib/billing.mts'

// Génère avec l'IA une proposition de programme (statut « en_attente ») que le coach valide ou refuse.
// Déclenchée : après l'envoi du questionnaire par le client, après un refus du coach, ou à la demande du coach.
// Fonction d'arrière-plan : l'appli reçoit tout de suite une réponse 202, la proposition apparaît ensuite.

type Body = { questionnaire_id?: string; refus_programme_id?: string; client_id?: string; motif?: string }
type Ex = { nom_exercice: string; libelle_jour: string; position: number; series: number; repetitions: string; charge_kg: number; repos_secondes?: number | null; notes?: string | null }

const REST = `${SUPABASE.url}/rest/v1`
const uuid = /^[0-9a-f-]{36}$/i

async function q<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${REST}/${path}`, { ...init, headers: { ...adminHeaders(), ...(init.headers as Record<string, string> || {}) } })
  const txt = await res.text()
  if (!res.ok) throw new Error(`Supabase ${path.split('?')[0]} (${res.status}) ${txt}`)
  return (txt ? JSON.parse(txt) : null) as T
}

export default async (req: Request) => {
  if (getEnv('CASSANDRE_READ_ONLY_MODE') === 'true') return new Response(null, { status: 403 })
  try {
    const user = await requireUser(req)
    const body = (await req.json().catch(() => ({}))) as Body

    // 1. Retrouver le client concerné et vérifier les droits.
    let clientId = ''
    let refuse: any = null
    if (body.refus_programme_id && uuid.test(body.refus_programme_id)) {
      refuse = (await q(`programmes?id=eq.${body.refus_programme_id}&select=*,exercices_programme(*)`))[0]
      if (!refuse) throw new Error('Programme refusé introuvable')
      clientId = refuse.client_id
    } else if (body.client_id && uuid.test(body.client_id)) {
      clientId = body.client_id
    } else {
      clientId = user.id
    }
    const client = (await q(`profils?id=eq.${clientId}&select=id,nom_complet,coach_id,role`))[0]
    if (!client) throw new Error('Client introuvable')
    const coachId = client.coach_id || (client.role === 'coach' ? client.id : null)
    if (user.id !== clientId && user.id !== coachId) throw new Error('Accès refusé')
    if (!coachId) throw new Error('Aucun coach assigné à ce client')

    // 2. Contexte : questionnaire, programme actuel, refus récents, catalogue d'exercices.
    const quest = body.questionnaire_id && uuid.test(body.questionnaire_id)
      ? (await q(`questionnaires_programme?id=eq.${body.questionnaire_id}&client_id=eq.${clientId}&select=*`))[0]
      : (await q(`questionnaires_programme?client_id=eq.${clientId}&select=*&order=cree_le.desc&limit=1`))[0]
    const all = await q<any[]>(`programmes?client_id=eq.${clientId}&select=id,titre,statut,version,motif_refus,notes_coach,publie_le,cree_le&order=version.desc&limit=20`)
    const actuel = (await q<any[]>(`programmes?client_id=eq.${clientId}&statut=eq.publie&select=id,titre,version,exercices_programme(*)&order=publie_le.desc.nullslast&limit=1`))[0]
    const catalogue = (await q<any[]>(`exercices?select=nom,groupe_musculaire&order=groupe_musculaire`)).map((e) => `${e.nom} (${e.groupe_musculaire})`)
    const refusRecents = all.filter((p) => p.motif_refus || p.notes_coach).slice(0, 3).map((p) => `v${p.version} : ${p.motif_refus || ''} ${p.notes_coach || ''}`.trim())
    const version = Math.max(0, ...all.map((p) => p.version || 0)) + 1

    const fmt = (p: any) => (p?.exercices_programme || [])
      .sort((a: any, b: any) => a.libelle_jour.localeCompare(b.libelle_jour) || a.position - b.position)
      .map((e: any) => `- ${e.libelle_jour} | ${e.nom_exercice} | ${e.series}x${e.repetitions} | ${e.charge_kg} kg`).join('\n')

    const prompt = [
      `Tu es préparateur physique. Conçois un nouveau programme de musculation (version ${version}) pour ${client.nom_complet || 'le client'}.`,
      quest ? `Questionnaire du client : ${quest.seances_par_semaine} séances par semaine, objectif « ${quest.objectif} », muscles à renforcer : ${(quest.muscles || []).join(', ') || 'aucun'}${quest.remarque ? `, remarque : ${quest.remarque}` : ''}.` : 'Pas de questionnaire : propose un programme équilibré de 3 séances par semaine.',
      actuel ? `Programme actuel (v${actuel.version}, ${actuel.titre}) :\n${fmt(actuel)}` : '',
      refuse ? `Le coach vient de REFUSER la proposition v${refuse.version} « ${refuse.titre} » :\n${fmt(refuse)}\nCe qui ne va pas selon le coach : ${(typeof body.motif === 'string' && body.motif.trim().slice(0, 1000)) || refuse.motif_refus || refuse.notes_coach || 'non précisé'}. Retravaille le programme en corrigeant PRÉCISÉMENT ces points (c'est la consigne prioritaire) ; garde ce qui n'est pas remis en cause.` : '',
      refusRecents.length ? `Remarques du coach sur les refus précédents : ${refusRecents.join(' / ')}` : '',
      `Utilise de préférence des exercices de ce catalogue (nom exact) : ${catalogue.join(', ')}.`,
      `Un jour par séance hebdomadaire, 4 à 6 exercices par jour. Libellés de jour du type « Jour 1 - Haut du corps ». Charges en kg réalistes d'après le programme actuel (0 si poids du corps).`,
      `Réponds UNIQUEMENT avec un JSON : {"titre": string court, "resume_ia": 1-2 phrases pour le coach, "justification_ia": pourquoi ces choix, "message_client": message bref et motivant au client, "exercices": [{"libelle_jour": string, "nom_exercice": string, "series": int, "repetitions": string ex "8-10", "charge_kg": number, "repos_secondes": int}]}`,
    ].filter(Boolean).join('\n\n')

    // 3. Appel à l'IA.
    const ai = new Anthropic()
    const msg = await ai.messages.create({ model: 'claude-sonnet-5', max_tokens: 4000, messages: [{ role: 'user', content: prompt }] })
    const text = msg.content.map((c: any) => (c.type === 'text' ? c.text : '')).join('')
    const m = text.match(/\{[\s\S]*\}/)
    if (!m) throw new Error('Réponse IA illisible')
    const out = JSON.parse(m[0])
    const pos: Record<string, number> = {}
    const exos: Ex[] = (Array.isArray(out.exercices) ? out.exercices : []).filter((e: any) => e?.nom_exercice).slice(0, 48).map((e: any) => {
      const jour = String(e.libelle_jour || 'Jour 1').slice(0, 80)
      pos[jour] = (pos[jour] || 0) + 1
      return {
        libelle_jour: jour,
        nom_exercice: String(e.nom_exercice).slice(0, 80),
        position: pos[jour],
        series: Math.min(10, Math.max(1, parseInt(e.series) || 3)),
        repetitions: String(e.repetitions || '8-12').slice(0, 20),
        charge_kg: Math.max(0, Math.round((Number(e.charge_kg) || 0) * 4) / 4),
        repos_secondes: parseInt(e.repos_secondes) || null,
      }
    })
    if (!exos.length) throw new Error('Programme IA vide')

    // 4. Les anciennes propositions encore en attente sont remplacées par la nouvelle.
    await q(`programmes?client_id=eq.${clientId}&statut=eq.en_attente`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ statut: 'archive' }) })
      .catch((e) => console.error('Archivage des anciennes propositions impossible', e))

    const [prog] = await q<any[]>('programmes', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        coach_id: coachId,
        client_id: clientId,
        titre: String(out.titre || `Programme v${version}`).slice(0, 120),
        statut: 'en_attente',
        cree_par: 'ia',
        version,
        programme_precedent_id: refuse?.id || actuel?.id || null,
        questionnaire_id: quest?.id || null,
        resume_ia: out.resume_ia ? String(out.resume_ia).slice(0, 1000) : null,
        justification_ia: out.justification_ia ? String(out.justification_ia).slice(0, 2000) : null,
        message_client: out.message_client ? String(out.message_client).slice(0, 1000) : null,
      }),
    })
    try {
      await q('exercices_programme', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(exos.map((e) => ({ ...e, programme_id: prog.id }))) })
    } catch (e) {
      await q(`programmes?id=eq.${prog.id}`, { method: 'DELETE' }).catch(() => {})
      throw e
    }
    console.log(`Proposition v${version} créée pour ${clientId} (${exos.length} exercices)`)
  } catch (err) {
    console.error('Génération du programme impossible :', err)
  }
}
