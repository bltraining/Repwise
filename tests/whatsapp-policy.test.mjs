import test from 'node:test'
import assert from 'node:assert/strict'
import { buildWhatsAppTextTemplatePayload, isInsideWhatsAppCustomerServiceWindow, WHATSAPP_CUSTOMER_SERVICE_WINDOW_MS } from '../netlify/lib/whatsapp-policy.mjs'

const now = Date.parse('2026-11-10T12:00:00Z')

test('allows free-form WhatsApp only before the 24-hour limit', () => {
  assert.equal(isInsideWhatsAppCustomerServiceWindow(new Date(now - WHATSAPP_CUSTOMER_SERVICE_WINDOW_MS + 1), now), true)
  assert.equal(isInsideWhatsAppCustomerServiceWindow(new Date(now - WHATSAPP_CUSTOMER_SERVICE_WINDOW_MS), now), false)
})

test('rejects missing, invalid, and future inbound timestamps', () => {
  assert.equal(isInsideWhatsAppCustomerServiceWindow(null, now), false)
  assert.equal(isInsideWhatsAppCustomerServiceWindow('not-a-date', now), false)
  assert.equal(isInsideWhatsAppCustomerServiceWindow(new Date(now + 1), now), false)
})

test('builds an approved text-template message with a body parameter', () => {
  assert.deepEqual(buildWhatsAppTextTemplatePayload('repwise_auth', 'fr_FR', '123456'), {
    type: 'template', template: {
      name: 'repwise_auth', language: { code: 'fr_FR' },
      components: [{ type: 'body', parameters: [{ type: 'text', text: '123456' }] }],
    },
  })
})
