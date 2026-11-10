import type { Config } from '@netlify/functions'
import { audit, db, dispatchTask, internalTokenMatches, processFounderMessage } from '../lib/cassandre.mts'
import { getEnv, handleError, json } from '../lib/billing.mts'
import { sendWhatsAppNotification } from '../lib/whatsapp.mts'

export default async (req: Request) => {
  if (!internalTokenMatches(req)) return json({ error: 'Non autorisé' }, 401)
  if (getEnv('CASSANDRE_READ_ONLY_MODE') === 'true') return new Response(null, { status: 204 })
  try {
    const { message_id: messageId } = await req.json() as { message_id?: string }
    if (!messageId || !/^[0-9a-f-]{36}$/i.test(messageId)) return json({ error: 'Message invalide' }, 400)
    const [message] = await db<Array<{ id: string; external_message_id: string; content: string; status: string; request_id: string | null; conversation_id: string }>>(
      `cassandre_private/whatsapp_messages?select=id,external_message_id,content,status,request_id,conversation_id&id=eq.${encodeURIComponent(messageId)}&direction=eq.inbound&limit=1`,
    )
    if (!message) return new Response(null, { status: 202 })
    const ownerId = getEnv('CASSANDRE_OWNER_USER_ID')
    if (!ownerId) throw new Error('owner_not_configured')
    const [conversation] = await db<Array<{ phone_number: string; owner_user_id: string; last_inbound_at: string | null }>>(
      `cassandre_private/whatsapp_conversations?select=phone_number,owner_user_id,last_inbound_at&id=eq.${encodeURIComponent(message.conversation_id)}&limit=1`,
    )
    if (!conversation || conversation.owner_user_id !== ownerId) throw new Error('unauthorized_conversation')
    if (message.request_id) return new Response(null, { status: 202 })
    if (!message.content || message.content.startsWith('[')) {
      await db(`cassandre_private/whatsapp_messages?id=eq.${message.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'unsupported_type' }) })
      return new Response(null, { status: 202 })
    }
    const created = await processFounderMessage(ownerId, message.content, 'whatsapp', message.external_message_id)
    const tasks = created.taskIds
    await db(`cassandre_private/whatsapp_messages?id=eq.${message.id}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ request_id: created.requestId, status: 'routed' }),
    })
    await Promise.allSettled(tasks.map(id => dispatchTask(req.url, id)))
    const [request] = await db<Array<{ summary: string }>>(`cassandre_private/requests?select=summary&id=eq.${encodeURIComponent(created.requestId)}&limit=1`)
    const confirmation = request?.summary || 'Mission transmise aux agents concernés. Je te communiquerai leur analyse dès qu’elle sera terminée.'
    const outbound = await sendWhatsAppNotification(conversation.phone_number, confirmation, conversation.last_inbound_at)
    await db('cassandre_private/whatsapp_messages', {
      method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ external_message_id: outbound.id, conversation_id: message.conversation_id, request_id: created.requestId,
        direction: 'outbound', message_type: outbound.messageType, content: outbound.content, status: 'sent' }),
    })
    await audit(ownerId, 'whatsapp_command_routed', 'cassandre_request', created.requestId, { task_count: tasks.length })
    return new Response(null, { status: 202 })
  } catch (err) { return handleError(err) }
}
export const config: Config = { path: '/.netlify/functions/cassandre-whatsapp-router-background', method: 'POST', background: true }
