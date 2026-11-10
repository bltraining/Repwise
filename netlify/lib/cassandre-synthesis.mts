import { askModel, audit, db } from './cassandre.mts'
import { getEnv } from './billing.mts'

export async function synthesizeCassandreRequest(requestId: string, ownerId: string, workerId: string, requestUrl: string) {
  const claimed = await db<boolean>('rpc/cassandre_claim_request_synthesis', { method: 'POST', body: JSON.stringify({ p_request_id: requestId, p_worker_id: workerId }) })
  if (!claimed) return false
  const [request] = await db<Array<{ channel: string; source_message_id: string | null; message: string }>>(
    `cassandre_private/requests?select=channel,source_message_id,message&id=eq.${encodeURIComponent(requestId)}&owner_user_id=eq.${encodeURIComponent(ownerId)}&limit=1`,
  )
  if (!request) throw new Error('request_not_found')
  const rows = await db<Array<{ id: string; agent_key: string; title: string; status: string; last_error_code: string | null; result: Record<string, any> | null }>>(
    `cassandre_private/tasks?select=id,agent_key,title,status,last_error_code,result&request_id=eq.${encodeURIComponent(requestId)}&order=created_at`,
  )
  const output = await askModel([
    'Tu es Cassandre, directrice de Repwise. Synthétise les résultats d’agents et l’état de chaque tâche.',
    'Distingue faits vérifiés, estimations, indisponibilités et recommandations. Signale les tâches échouées, bloquées, annulées ou en attente d’approbation. Ne complète jamais une donnée absente. N’exécute aucune action.',
    'Retourne uniquement du JSON: {"summary":"...","priorities":["..."],"decisions_requested":["..."]}.',
    `Résultats des agents:\n${JSON.stringify(rows)}`,
  ].join('\n\n'))
  const value = output.value as { summary?: unknown; priorities?: unknown; decisions_requested?: unknown }
  if (typeof value.summary !== 'string' || !value.summary.trim()) throw new Error('invalid_synthesis')
  const summary = value.summary.trim().slice(0, 6000)
  if (request.channel === 'system' && request.message.startsWith('daily-report:')) {
    const reportDate = request.message.slice('daily-report:'.length, 'daily-report:'.length + 10)
    const findings = rows.flatMap(row => (Array.isArray(row.result?.findings) ? row.result.findings : []).map((f: any) => ({ agent: row.agent_key, kind: f.kind, text: f.text })))
    await db('rpc/cassandre_save_report', { method: 'POST', body: JSON.stringify({ payload: {
      report_date: reportDate, results: { agents: rows.map(row => ({ agent: row.agent_key, status: row.status, result: row.result })) },
      problems: findings.filter(f => f.kind === 'unavailable'), opportunities: findings.filter(f => f.kind === 'recommendation'),
      decisions: Array.isArray(value.decisions_requested) ? value.decisions_requested.slice(0, 10) : [],
      priorities: Array.isArray(value.priorities) ? value.priorities.slice(0, 5) : [], executive_summary: summary,
    } }) })
  }
  await db(`cassandre_private/requests?id=eq.${encodeURIComponent(requestId)}&synthesis_locked_by=eq.${encodeURIComponent(workerId)}`, {
    method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({
      summary, status: 'completed', completed_at: new Date().toISOString(), synthesis_locked_by: null, synthesis_locked_at: null,
    }),
  })
  await audit(ownerId, 'request_synthesized', 'cassandre_request', requestId, {
    priority_count: Array.isArray(value.priorities) ? Math.min(value.priorities.length, 5) : 0,
  })
  if (request.channel === 'whatsapp' || (request.channel === 'system' && request.message.startsWith('daily-report:'))) {
    const token = getEnv('CASSANDRE_INTERNAL_TOKEN') || ''
    if (token) await fetch(new URL('/.netlify/functions/cassandre-notifications-background', requestUrl), {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: requestId }),
    }).catch(() => null)
  }
  return true
}
