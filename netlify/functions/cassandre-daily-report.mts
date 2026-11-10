import type { Config } from '@netlify/functions'
import { createCassandreRequest, db, dispatchTask } from '../lib/cassandre.mts'
import { assertSupabaseTargetForRequest, getEnv, handleError, json } from '../lib/billing.mts'

export default async (req: Request) => {
  try {
    assertSupabaseTargetForRequest(req)
    const ownerId = getEnv('CASSANDRE_OWNER_USER_ID')
    if (!ownerId || getEnv('CASSANDRE_WORKER_ENABLED') !== 'true') return new Response(null, { status: 204 })
    const [setting] = await db<Array<{ setting_value: { enabled?: boolean; hour?: string; timezone?: string } }>>(
      'cassandre_private/settings?select=setting_value&setting_key=eq.daily_report&limit=1',
    )
    const cfg = setting?.setting_value
    if (!cfg?.enabled || !/^\d{2}:00$/.test(cfg.hour || '') || (cfg.timezone || 'Europe/Paris') !== 'Europe/Paris') return new Response(null, { status: 204 })
    const payload = await req.json().catch(() => ({})) as { next_run?: string }
    const scheduled = payload.next_run ? new Date(payload.next_run) : new Date()
    if (Number.isNaN(scheduled.getTime())) return json({ error: 'Date du déclenchement invalide.' }, 400)
    const localParts = (at: Date) => new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(at).reduce<Record<string, string>>((acc, part) => { acc[part.type] = part.value; return acc }, {})
    const current = localParts(scheduled)
    const previous = localParts(new Date(scheduled.getTime() - 60 * 60_000))
    const localHour = `${current.hour}:${current.minute}`
    const targetHour = Number(cfg.hour.slice(0, 2))
    const skippedHour = previous.year === current.year && previous.month === current.month && previous.day === current.day
      && Number(previous.hour) < targetHour && Number(current.hour) > targetHour
    if (localHour !== cfg.hour && !skippedHour) return new Response(null, { status: 204 })
    const date = `${current.year}-${current.month}-${current.day}`
    const reports = await db<Array<{ id: string }>>(`cassandre_private/daily_reports?select=id&report_date=eq.${date}&limit=1`)
    if (reports.length) return new Response(null, { status: 204 })
    const message = `daily-report:${date} Prépare le rapport quotidien REPWISE ${date}. Analyse tous les domaines utiles avec les six agents. Présente uniquement les données disponibles, distingue les faits, estimations, informations indisponibles et recommandations.`
    const request = await createCassandreRequest(ownerId, message, 'system', `daily-report:${date}`)
    const launched = await Promise.allSettled(request.taskIds.map(id => dispatchTask(req.url, id)))
    return json({ accepted: true, date, dispatched: launched.filter(x => x.status === 'fulfilled').length }, 202)
  } catch (err) { return handleError(err) }
}
export const config: Config = { schedule: '0 * * * *' }
