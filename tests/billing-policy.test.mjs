import test from 'node:test'
import assert from 'node:assert/strict'
import {
  disputeAccessAction,
  isBillingWebhookEvent,
  isRepwiseMonthlyPrice,
  parisQuotaDay,
  shouldRevokeAfterRefund,
} from '../netlify/lib/billing-policy.mjs'

test('accepts only an active 5 EUR monthly recurring Price', () => {
  const valid = { active: true, currency: 'eur', unit_amount: 500, recurring: { interval: 'month', interval_count: 1 } }
  assert.equal(isRepwiseMonthlyPrice(valid), true)
  assert.equal(isRepwiseMonthlyPrice({ ...valid, active: false }), false)
  assert.equal(isRepwiseMonthlyPrice({ ...valid, unit_amount: 499 }), false)
  assert.equal(isRepwiseMonthlyPrice({ ...valid, currency: 'usd' }), false)
  assert.equal(isRepwiseMonthlyPrice({ ...valid, recurring: { interval: 'year' } }), false)
  assert.equal(isRepwiseMonthlyPrice({ ...valid, recurring: { interval: 'month', interval_count: 2 } }), false)
})

test('uses Europe/Paris local dates across UTC midnight and daylight-saving changes', () => {
  assert.equal(parisQuotaDay('2026-03-28T22:59:00Z'), '2026-03-28')
  assert.equal(parisQuotaDay('2026-03-28T23:01:00Z'), '2026-03-29')
  assert.equal(parisQuotaDay('2026-03-29T00:59:00Z'), '2026-03-29')
  assert.equal(parisQuotaDay('2026-03-29T01:01:00Z'), '2026-03-29')
  assert.equal(parisQuotaDay('2026-03-29T22:01:00Z'), '2026-03-30')
})

test('does not revoke Premium for a partial or pending refund', () => {
  assert.equal(shouldRevokeAfterRefund('refund.updated', { refunded: false }, { status: 'succeeded' }), false)
  assert.equal(shouldRevokeAfterRefund('refund.updated', { refunded: true }, { status: 'pending' }), false)
  assert.equal(shouldRevokeAfterRefund('refund.updated', { refunded: true }, { status: 'succeeded' }), true)
  assert.equal(shouldRevokeAfterRefund('charge.refunded', { refunded: true }, null), true)
})

test('keeps Premium during a pending dispute and revokes only after a loss', () => {
  assert.equal(disputeAccessAction('needs_response'), 'keep')
  assert.equal(disputeAccessAction('under_review'), 'keep')
  assert.equal(disputeAccessAction('won'), 'sync')
  assert.equal(disputeAccessAction('warning_closed'), 'sync')
  assert.equal(disputeAccessAction('lost'), 'revoke')
})

test('recognizes the supported payment, lifecycle and risk events', () => {
  for (const type of [
    'checkout.session.async_payment_succeeded',
    'customer.subscription.trial_will_end',
    'invoice.payment_failed',
    'refund.created',
    'charge.dispute.created',
    'charge.dispute.funds_reinstated',
    'radar.early_fraud_warning.created',
  ]) assert.equal(isBillingWebhookEvent(type), true, type)
  assert.equal(isBillingWebhookEvent('customer.created'), false)
})
