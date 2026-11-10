import type { Config } from '@netlify/functions'
import { audit, dispatchTask, processFounderMessage, requireFounder } from '../lib/cassandre.mts'
import { handleError, json } from '../lib/billing.mts'

export default async (req: Request) => {
  try {
    const user = await requireFounder(req)
    const body = await req.json().catch(() => ({})) as { message?: unknown }
    if (typeof body.message !== 'string' || body.message.length > 2000) return json({ error: 'La demande doit contenir au maximum 2 000 caractères.' }, 400)
    const { requestId, taskIds, response, duplicate } = await processFounderMessage(user.id, body.message, 'dashboard')
    const dispatched = await Promise.allSettled(taskIds.map(id => dispatchTask(req.url, id)))
    const failed = dispatched.filter(x => x.status === 'rejected').length
    if (failed) await audit(user.id, 'worker_dispatch_incomplete', 'cassandre_request', requestId, { failed_workers: failed })
    const direct = taskIds.length === 0
    return json({ request_id: requestId, task_ids: taskIds, status: direct ? 'completed' : 'running', response, duplicate, workers_started: taskIds.length - failed }, direct ? 200 : 202)
  } catch (err) {
    return handleError(err)
  }
}
export const config: Config = { path: '/api/cassandre-command', method: 'POST' }
