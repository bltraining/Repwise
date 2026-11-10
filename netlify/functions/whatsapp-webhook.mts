import type { Config } from '@netlify/functions'
import { timingSafeEqual } from 'node:crypto'
import { audit, db } from '../lib/cassandre.mts'
import { assertSupabaseTargetForRequest, getEnv, json } from '../lib/billing.mts'
import { normalizePhone, verifyWhatsAppSignature } from '../lib/whatsapp.mts'

type HookMessage = { id?: string; from?: string; type?: string; text?: { body?: string }; button?: { text?: string }; interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } } }
type HookValue = { metadata?: { phone_number_id?: string }; messages?: HookMessage[]; statuses?: Array<{ id?: string; status?: string }> }

export default async (req: Request) => {
  if (getEnv('CASSANDRE_READ_ONLY_MODE') === 'true') return new Response(null, { status: 204 })
  try { assertSupabaseTargetForRequest(req) } catch { return json({ error: 'Configuration de données absente ou interdite.' }, 503) }
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token') || ''
    const challenge = url.searchParams.get('hub.challenge') || ''
    const expected = getEnv('WHATSAPP_WEBHOOK_VERIFY_TOKEN') || ''
    const a = Buffer.from(token)
    const b = Buffer.from(expected)
    if (mode !== 'subscribe' || !expected || a.length !== b.length || !timingSafeEqual(a, b) || !challenge) return new Response('Forbidden', { status: 403 })
    return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' } })
  }
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const raw = await req.text()
  if (!verifyWhatsAppSignature(raw, req.headers.get('x-hub-signature-256'))) return json({ error: 'Signature invalide' }, 401)
  const ownerId = getEnv('CASSANDRE_OWNER_USER_ID')
  const phoneId = getEnv('WHATSAPP_PHONE_NUMBER_ID')
  const internalToken = getEnv('CASSANDRE_INTERNAL_TOKEN')
  if (!ownerId || !phoneId || !internalToken) return json({ error: 'Webhook en attente de configuration.' }, 503)
  let payload: { entry?: Array<{ changes?: Array<{ value?: HookValue }> }> }
  try { payload = JSON.parse(raw) } catch { return json({ error: 'Payload invalide' }, 400) }
  try {
    for (const entry of payload.entry || []) for (const change of entry.changes || []) {
      const value = change.value || {}
      if (value.metadata?.phone_number_id !== phoneId) continue
      for (const status of value.statuses || []) if (status.id && status.status) {
        await db(`cassandre_private/whatsapp_messages?external_message_id=eq.${encodeURIComponent(status.id)}&direction=eq.outbound`, {
          method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: status.status }),
        }).catch(() => null)
      }
      for (const message of value.messages || []) {
        if (!message.id || !message.from) continue
        const from = normalizePhone(message.from)
        const authorized = await db<Array<{ owner_user_id: string }>>(
          `cassandre_private/whatsapp_connections?select=owner_user_id&owner_user_id=eq.${encodeURIComponent(ownerId)}&phone_number=eq.${encodeURIComponent(from)}&enabled=eq.true&verified_at=not.is.null&limit=1`,
        )
        if (!authorized.length) {
          await audit(ownerId, 'whatsapp_sender_rejected', 'cassandre_access', 'founder', { reason: 'unverified_sender' }).catch(() => {
            console.error('Cassandre access audit failed', { event: 'whatsapp_sender_rejected' })
          })
          continue
        }
        const conversation = await db<Array<{ id: string }>>('cassandre_private/whatsapp_conversations?on_conflict=owner_user_id,phone_number', {
          method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
          body: JSON.stringify({ owner_user_id: ownerId, phone_number: from, last_message_at: new Date().toISOString(), last_inbound_at: new Date().toISOString() }),
        })
        if (!conversation[0]?.id) continue
        const body = message.text?.body || message.button?.text || message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || ''
        const type = String(message.type || 'unknown').slice(0, 30)
        const inserted = await db<Array<{ id: string }>>('cassandre_private/whatsapp_messages?on_conflict=external_message_id', {
          method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
          body: JSON.stringify({ external_message_id: message.id, conversation_id: conversation[0].id, direction: 'inbound', message_type: type,
            content: body.slice(0, 4000) || `[${type} message]`, status: 'received' }),
        })
        let stored = inserted[0]
        if (!stored) {
          const [existing] = await db<Array<{ id: string; status: string; request_id: string | null }>>(
            `cassandre_private/whatsapp_messages?select=id,status,request_id&external_message_id=eq.${encodeURIComponent(message.id)}&direction=eq.inbound&limit=1`,
          )
          if (!existing || existing.request_id || existing.status !== 'received') continue
          stored = existing
        }
        const routerUrl = new URL('/.netlify/functions/cassandre-whatsapp-router-background', req.url)
        const dispatched = await fetch(routerUrl, { method: 'POST', headers: { Authorization: `Bearer ${internalToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ message_id: stored.id }) })
        if (!dispatched.ok && dispatched.status !== 202) return json({ error: 'Le routage du message est temporairement indisponible.' }, 503)
      }
    }
    return json({ received: true })
  } catch (error) {
    console.error('WhatsApp webhook processing failed', { error_type: error instanceof Error ? error.name : 'UnknownError' })
    return json({ error: 'Traitement du webhook temporairement indisponible.' }, 503)
  }
}
export const config: Config = { path: '/.netlify/functions/whatsapp-webhook' }
