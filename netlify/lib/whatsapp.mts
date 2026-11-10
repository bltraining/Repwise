import { createHmac, timingSafeEqual } from 'node:crypto'
import { getEnv, HttpError } from './billing.mts'
import { buildWhatsAppTextTemplatePayload, isInsideWhatsAppCustomerServiceWindow } from './whatsapp-policy.mjs'

export function verifyWhatsAppSignature(body: string, signature: string | null) {
  const secret = getEnv('WHATSAPP_APP_SECRET')
  if (!secret || !signature || !/^sha256=[0-9a-f]{64}$/i.test(signature)) return false
  const expected = `sha256=${createHmac('sha256', secret).update(body, 'utf8').digest('hex')}`
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function normalizePhone(value: string) {
  return value.replace(/[^0-9]/g, '')
}

async function sendWhatsAppPayload(to: string, payload: Record<string, unknown>) {
  if (getEnv('CASSANDRE_WHATSAPP_TEST_MODE') !== 'true') throw new HttpError(503, 'Envoi WhatsApp désactivé hors environnement Meta de test.')
  const token = getEnv('WHATSAPP_ACCESS_TOKEN')
  const phoneId = getEnv('WHATSAPP_PHONE_NUMBER_ID')
  const testPhoneId = getEnv('WHATSAPP_TEST_PHONE_NUMBER_ID')
  const version = getEnv('WHATSAPP_GRAPH_API_VERSION')
  if (!token || !phoneId || !testPhoneId || phoneId !== testPhoneId || !version || !/^v\d+\.\d+$/.test(version)) throw new HttpError(503, 'Envoi WhatsApp désactivé : la configuration Meta officielle de test est incomplète.')
  const response = await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(phoneId)}/messages`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: normalizePhone(to), ...payload }),
  })
  if (!response.ok) throw new HttpError(503, 'Meta n’a pas accepté le message WhatsApp.')
  const result = await response.json() as { messages?: Array<{ id?: string }> }
  if (!result.messages?.[0]?.id) throw new HttpError(503, 'Meta n’a pas retourné d’identifiant de message.')
  return result.messages[0].id
}

export async function sendWhatsAppText(to: string, text: string, lastInboundAt: string | Date) {
  if (!isInsideWhatsAppCustomerServiceWindow(lastInboundAt)) {
    throw new HttpError(409, 'La fenêtre WhatsApp de 24 heures est expirée; un modèle approuvé est requis.')
  }
  return sendWhatsAppPayload(to, { type: 'text', text: { preview_url: false, body: text.slice(0, 4000) } })
}

export async function sendWhatsAppTemplate(to: string, templateName: string, language: string, bodyParameter?: string) {
  if (!/^[a-z0-9_]{2,512}$/.test(templateName) || !/^[a-z]{2,3}_[A-Z]{2,3}$/.test(language)) {
    throw new HttpError(503, 'Le modèle WhatsApp de test est mal configuré.')
  }
  return sendWhatsAppPayload(to, buildWhatsAppTextTemplatePayload(templateName, language, bodyParameter))
}

export async function sendWhatsAppNotification(to: string, text: string, lastInboundAt?: string | Date | null) {
  if (lastInboundAt && isInsideWhatsAppCustomerServiceWindow(lastInboundAt)) {
    return { id: await sendWhatsAppText(to, text, lastInboundAt), messageType: 'text' as const, content: text.slice(0, 4000) }
  }
  const templateName = getEnv('WHATSAPP_NOTIFICATION_TEMPLATE_NAME')
  const language = getEnv('WHATSAPP_NOTIFICATION_TEMPLATE_LANGUAGE')
  if (!templateName || !language) throw new HttpError(409, 'La fenêtre WhatsApp de 24 heures est expirée et aucun modèle approuvé n’est configuré.')
  const content = text.slice(0, 900)
  return { id: await sendWhatsAppTemplate(to, templateName, language, content), messageType: 'template' as const, content }
}

export function validFounderWebhookPhone(raw: string) {
  const owner = getEnv('CASSANDRE_OWNER_WHATSAPP_PHONE')
  return !!owner && normalizePhone(raw) === normalizePhone(owner)
}
