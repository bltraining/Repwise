import type { Config } from '@netlify/functions'
import { audit, db, requireFounder } from '../lib/cassandre.mts'
import { getEnv, handleError, json } from '../lib/billing.mts'

export default async (req: Request) => {
  try {
    const user = await requireFounder(req)
    const body = await req.json().catch(() => ({})) as { daily_report?: { enabled?: unknown; hour?: unknown } }
    const enabled = body.daily_report?.enabled
    const hour = body.daily_report?.hour
    if (typeof enabled !== 'boolean' || typeof hour !== 'string' || !/^(?:[01]\d|2[0-3]):00$/.test(hour)) return json({ error: 'Choisis une heure pleine et un état valide.' }, 400)
    if (enabled && getEnv('CASSANDRE_DAILY_REPORT_TEST_MODE') !== 'true') return json({ error: 'La programmation du rapport est désactivée tant que le mode de test n’est pas explicitement configuré.' }, 503)
    const value = { enabled, hour, timezone: 'Europe/Paris' }
    await db('cassandre_private/settings?on_conflict=setting_key', {
      method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ setting_key: 'daily_report', setting_value: value, updated_at: new Date().toISOString() }),
    })
    await audit(user.id, enabled ? 'daily_report_scheduled' : 'daily_report_disabled', 'cassandre_setting', 'daily_report', { hour, timezone: 'Europe/Paris' })
    return json({ daily_report: value })
  } catch (err) { return handleError(err) }
}
export const config: Config = { path: '/api/cassandre-settings', method: 'POST' }
