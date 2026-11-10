import type { Config } from '@netlify/functions'
import { db, requireFounder } from '../lib/cassandre.mts'
import { handleError, json } from '../lib/billing.mts'

export default async (req: Request) => {
  try {
    const user = await requireFounder(req)
    const owner = encodeURIComponent(user.id)
    const [agents, requests, tasks, reports, decisions, approvals, connection, settings, conversations] = await Promise.all([
      db('cassandre_private/agents?select=agent_key,display_role,mission,is_active,updated_at&order=agent_key'),
      db(`cassandre_private/requests?select=id,message,status,summary,channel,created_at,completed_at&owner_user_id=eq.${owner}&order=created_at.desc&limit=20`),
      db(`cassandre_private/tasks?select=id,request_id,agent_key,title,status,priority,result,last_error_code,attempt_count,max_attempts,created_at,updated_at&owner_user_id=eq.${owner}&order=created_at.desc&limit=100`),
      db('cassandre_private/daily_reports?select=*&order=report_date.desc&limit=30'),
      db('cassandre_private/decisions?select=id,decision_type,summary,rationale,risk_level,requires_founder_approval,status,requested_at,decided_at&order=requested_at.desc&limit=50'),
      db('cassandre_private/whatsapp_pending_approvals?select=id,task_id,action_description,risk_level,status,requested_at,expires_at&status=eq.awaiting_approval&order=requested_at.desc&limit=50'),
      db(`cassandre_private/whatsapp_connections?select=phone_number,verified_at,enabled,created_at&owner_user_id=eq.${owner}&limit=1`),
      db('cassandre_private/settings?select=setting_key,setting_value&setting_key=eq.daily_report&limit=1'),
      db(`cassandre_private/whatsapp_conversations?select=id,phone_number,last_message_at&owner_user_id=eq.${owner}&order=last_message_at.desc&limit=10`),
    ])
    const ids = (conversations || []).map((x: { id: string }) => x.id)
    const messages = ids.length ? await db(`cassandre_private/whatsapp_messages?select=id,conversation_id,direction,message_type,content,status,created_at&conversation_id=in.(${ids.join(',')})&order=created_at.desc&limit=50`) : []
    return json({ agents, requests, tasks, reports, decisions, approvals, whatsapp: connection?.[0] || null, daily_report: settings?.[0]?.setting_value || null, conversations, messages })
  } catch (err) { return handleError(err) }
}
export const config: Config = { path: '/api/cassandre-dashboard', method: 'GET' }
