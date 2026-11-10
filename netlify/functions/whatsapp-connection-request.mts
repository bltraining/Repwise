import type { Config } from '@netlify/functions'
import { createHash, randomInt } from 'node:crypto'
import { audit, db, requireFounder } from '../lib/cassandre.mts'
import { getEnv, handleError, json } from '../lib/billing.mts'
import { normalizePhone, sendWhatsAppTemplate } from '../lib/whatsapp.mts'

export default async (req: Request) => {
  try {
    const user = await requireFounder(req)
    if (getEnv('CASSANDRE_WHATSAPP_TEST_MODE') !== 'true') return json({ error: 'La vérification de numéro est disponible uniquement dans le mode de test Meta.' }, 503)
    const pepper = getEnv('WHATSAPP_CHALLENGE_PEPPER')
    if (!pepper) return json({ error: 'Service de vérification non configuré.' }, 503)
    const body = await req.json().catch(() => ({})) as { phone_number?: unknown }
    if (typeof body.phone_number !== 'string') return json({ error: 'Numéro invalide.' }, 400)
    const phone = normalizePhone(body.phone_number)
    if (phone.length < 10 || phone.length > 15) return json({ error: 'Utilise un numéro au format international.' }, 400)
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
    const rows = await db<Array<{ id: string }>>('cassandre_private/whatsapp_connection_challenges', {
      method: 'POST', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ owner_user_id: user.id, phone_number: phone,
        code_hash: createHash('sha256').update(`${pepper}:${user.id}:${phone}:${code}`).digest('hex'),
        expires_at: new Date(Date.now() + 5 * 60_000).toISOString() }),
    })
    const challenge = rows[0]
    if (!challenge?.id) throw new Error('challenge_create_failed')
    try {
      const templateName = getEnv('WHATSAPP_AUTH_TEMPLATE_NAME')
      const language = getEnv('WHATSAPP_AUTH_TEMPLATE_LANGUAGE')
      if (!templateName || !language) throw new Error('approved_auth_template_not_configured')
      await sendWhatsAppTemplate(phone, templateName, language, code)
    }
    catch (err) {
      await db(`cassandre_private/whatsapp_connection_challenges?id=eq.${challenge.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ consumed_at: new Date().toISOString() }) }).catch(() => null)
      throw err
    }
    await audit(user.id, 'whatsapp_number_challenge_sent', 'whatsapp_connection', user.id)
    return json({ sent: true, expires_in_seconds: 300 })
  } catch (err) { return handleError(err) }
}
export const config: Config = { path: '/api/whatsapp-connection-request', method: 'POST' }
