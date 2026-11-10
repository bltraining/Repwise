import type { Config } from '@netlify/functions'
import { createHash, timingSafeEqual } from 'node:crypto'
import { audit, db, requireFounder } from '../lib/cassandre.mts'
import { getEnv, handleError, json } from '../lib/billing.mts'

export default async (req: Request) => {
  try {
    const user = await requireFounder(req)
    if (getEnv('CASSANDRE_READ_ONLY_MODE') === 'true') return json({ error: 'WhatsApp est désactivé dans cette bêta.' }, 403)
    const pepper = getEnv('WHATSAPP_CHALLENGE_PEPPER')
    if (getEnv('CASSANDRE_WHATSAPP_TEST_MODE') !== 'true' || !pepper) return json({ error: 'Vérification WhatsApp désactivée.' }, 503)
    const body = await req.json().catch(() => ({})) as { code?: unknown }
    const code = typeof body.code === 'string' ? body.code.trim() : ''
    if (!/^\d{6}$/.test(code)) return json({ error: 'Code invalide.' }, 400)
    const rows = await db<Array<{ id: string; phone_number: string; code_hash: string; attempt_count: number }>>(
      `cassandre_private/whatsapp_connection_challenges?select=id,phone_number,code_hash,attempt_count&owner_user_id=eq.${encodeURIComponent(user.id)}&consumed_at=is.null&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&order=created_at.desc&limit=1`,
    )
    const challenge = rows[0]
    if (!challenge || challenge.attempt_count >= 5) return json({ error: 'Aucun code valide. Recommence la vérification.' }, 400)
    const digest = createHash('sha256').update(`${pepper}:${user.id}:${challenge.phone_number}:${code}`).digest('hex')
    const expected = Buffer.from(challenge.code_hash)
    const provided = Buffer.from(digest)
    if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
      const next = challenge.attempt_count + 1
      await db(`cassandre_private/whatsapp_connection_challenges?id=eq.${challenge.id}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ attempt_count: next, ...(next >= 5 ? { consumed_at: new Date().toISOString() } : {}) }),
      })
      return json({ error: 'Code incorrect ou expiré.' }, 400)
    }
    const now = new Date().toISOString()
    await db(`cassandre_private/whatsapp_connections?on_conflict=owner_user_id`, {
      method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ owner_user_id: user.id, phone_number: challenge.phone_number, verified_at: now, enabled: true }),
    })
    await db(`cassandre_private/whatsapp_connection_challenges?id=eq.${challenge.id}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ consumed_at: now }),
    })
    await audit(user.id, 'whatsapp_number_verified', 'whatsapp_connection', user.id)
    return json({ verified: true })
  } catch (err) { return handleError(err) }
}
export const config: Config = { path: '/api/whatsapp-connection-verify', method: 'POST' }
