import type { Config } from '@netlify/functions'
import { db, dispatchTask } from '../lib/cassandre.mts'
import { assertSupabaseTargetForRequest, getEnv, handleError } from '../lib/billing.mts'

export default async (req: Request) => {
  if (getEnv('CASSANDRE_READ_ONLY_MODE') === 'true' || getEnv('CASSANDRE_WORKER_ENABLED') !== 'true') return new Response(null, { status: 204 })
  try {
    assertSupabaseTargetForRequest(req)
    const tasks = await db<Array<{ id: string; status: string; locked_at: string | null }>>(
      'cassandre_private/tasks?select=id,status,locked_at&status=in.(pending,assigned,queued,needs_correction,running,in_progress)&order=created_at&limit=100',
    )
    const staleBefore = Date.now() - 22 * 60_000
    const restart = tasks.filter(t => ['pending','assigned','queued','needs_correction'].includes(t.status) ||
      ((t.status === 'running' || t.status === 'in_progress') && t.locked_at && Date.parse(t.locked_at) < staleBefore))
    const results = await Promise.allSettled(restart.map(t => dispatchTask(req.url, t.id)))
    const requests = await db<Array<{ id: string }>>('cassandre_private/requests?select=id&status=eq.running&summary=is.null&order=created_at&limit=50')
    let syntheses = 0
    for (const request of requests) {
      const rows = await db<Array<{ id: string; status: string }>>(`cassandre_private/tasks?select=id,status&request_id=eq.${encodeURIComponent(request.id)}&limit=20`)
      const terminal = new Set(['completed','failed','blocked','cancelled','awaiting_approval'])
      if (rows.length && rows.every(t => terminal.has(t.status))) {
        await fetch(new URL('/.netlify/functions/cassandre-synthesize-background', req.url), {
          method: 'POST', headers: { Authorization: `Bearer ${getEnv('CASSANDRE_INTERNAL_TOKEN') || ''}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ request_id: request.id }),
        }).then(r => { if (r.ok || r.status === 202) syntheses++ }).catch(() => null)
      }
    }
    return Response.json({ restarted: results.filter(r => r.status === 'fulfilled').length, synthesis_jobs: syntheses })
  } catch (err) { return handleError(err) }
}
export const config: Config = { schedule: '*/15 * * * *' }
