import type { Config } from '@netlify/functions'
import { audit, db, internalTokenMatches } from '../lib/cassandre.mts'
import { getEnv, handleError, json } from '../lib/billing.mts'
import { sendWhatsAppNotification } from '../lib/whatsapp.mts'

export default async (req: Request) => {
  if (!internalTokenMatches(req)) return json({ error: 'Non autorisé' }, 401)
  try {
    const { request_id: requestId } = await req.json() as { request_id?: string }
    const ownerId = getEnv('CASSANDRE_OWNER_USER_ID')
    if (!ownerId || !requestId || !/^[0-9a-f-]{36}$/i.test(requestId)) return json({ error: 'Demande invalide' }, 400)
    const [request] = await db<Array<{ id: string; channel: string; source_message_id: string | null; message: string; summary: string | null }>>(
      `cassandre_private/requests?select=id,channel,source_message_id,message,summary&id=eq.${encodeURIComponent(requestId)}&owner_user_id=eq.${encodeURIComponent(ownerId)}&limit=1`,
    )
    if (!request?.summary) return new Response(null, { status: 202 })

    let phone: string | null = null
    let conversationId: string | null = null
    let lastInboundAt: string | null = null
    if (request.channel === 'whatsapp' && request.source_message_id) {
      const [inbound] = await db<Array<{ conversation_id: string }>>(
        `cassandre_private/whatsapp_messages?select=conversation_id&external_message_id=eq.${encodeURIComponent(request.source_message_id)}&direction=eq.inbound&limit=1`,
      )
      conversationId = inbound?.conversation_id || null
      if (conversationId) {
        const [conversation] = await db<Array<{ phone_number: string; owner_user_id: string; last_inbound_at: string | null }>>(
          `cassandre_private/whatsapp_conversations?select=phone_number,owner_user_id,last_inbound_at&id=eq.${encodeURIComponent(conversationId)}&owner_user_id=eq.${encodeURIComponent(ownerId)}&limit=1`,
        )
        if (conversation?.owner_user_id === ownerId) { phone = conversation.phone_number; lastInboundAt = conversation.last_inbound_at }
      }
    } else if (request.channel === 'system' && request.message.startsWith('daily-report:')) {
      const [connection] = await db<Array<{ phone_number: string }>>(
        `cassandre_private/whatsapp_connections?select=phone_number&owner_user_id=eq.${encodeURIComponent(ownerId)}&enabled=eq.true&verified_at=not.is.null&limit=1`,
      )
      if (connection?.phone_number) {
        phone = connection.phone_number
        const rows = await db<Array<{ id: string; last_inbound_at: string | null }>>('cassandre_private/whatsapp_conversations?on_conflict=owner_user_id,phone_number', {
          method: 'POST', body: JSON.stringify({ owner_user_id: ownerId, phone_number: phone }),
        })
        conversationId = rows[0]?.id || null
        lastInboundAt = rows[0]?.last_inbound_at || null
      }
    }
    if (!phone || !conversationId) return new Response(null, { status: 202 })

    try {
      const content = request.summary.slice(0, 4000)
      const previous = await db<Array<{ content: string; status: string; message_type: string }>>(
        `cassandre_private/whatsapp_messages?select=content,status,message_type&request_id=eq.${encodeURIComponent(requestId)}&direction=eq.outbound&limit=20`,
      )
      if (previous.some(row => row.status === 'sent' && (row.content === content || (row.message_type === 'template' && content.startsWith(row.content))))) return new Response(null, { status: 202 })
      const outbound = await sendWhatsAppNotification(phone, content, lastInboundAt)
      await db('cassandre_private/whatsapp_messages', {
        method: 'POST', body: JSON.stringify({ external_message_id: outbound.id, conversation_id: conversationId,
          request_id: requestId, direction: 'outbound', message_type: outbound.messageType, content: outbound.content, status: 'sent' }),
      })
      await audit(ownerId, 'founder_notification_sent', 'cassandre_request', requestId, { channel: 'whatsapp' })
      return new Response(null, { status: 202 })
    } catch {
      await audit(ownerId, 'founder_notification_failed', 'cassandre_request', requestId, { channel: 'whatsapp' }).catch(() => null)
      return json({ error: 'La notification n’a pas pu être envoyée.' }, 503)
    }
  } catch (err) { return handleError(err) }
}

export const config: Config = { path: '/.netlify/functions/cassandre-notifications-background', method: 'POST', background: true }
