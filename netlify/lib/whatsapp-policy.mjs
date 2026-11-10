export const WHATSAPP_CUSTOMER_SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000

export function isInsideWhatsAppCustomerServiceWindow(lastInboundAt, now = Date.now()) {
  if (typeof lastInboundAt !== 'string' && !(lastInboundAt instanceof Date)) return false
  const timestamp = lastInboundAt instanceof Date ? lastInboundAt.getTime() : Date.parse(lastInboundAt)
  return Number.isFinite(timestamp) && timestamp <= now && now - timestamp < WHATSAPP_CUSTOMER_SERVICE_WINDOW_MS
}

export function buildWhatsAppTextTemplatePayload(templateName, language, bodyParameter) {
  const template = { name: templateName, language: { code: language } }
  if (bodyParameter !== undefined) template.components = [{
    type: 'body', parameters: [{ type: 'text', text: String(bodyParameter).slice(0, 900) }],
  }]
  return { type: 'template', template }
}
