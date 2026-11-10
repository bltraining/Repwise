export function isRepwiseMonthlyPrice(price) {
  return !!price
    && price.active === true
    && String(price.currency || '').toLowerCase() === 'eur'
    && price.unit_amount === 500
    && price.recurring?.interval === 'month'
    && (price.recurring?.interval_count ?? 1) === 1
}

export function parisQuotaDay(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) throw new TypeError('Invalid date')
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date)
  const fields = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${fields.year}-${fields.month}-${fields.day}`
}

export function shouldRevokeAfterRefund(eventType, charge, refund) {
  if (eventType === 'charge.refunded') return charge?.refunded === true
  return eventType === 'refund.updated'
    && refund?.status === 'succeeded'
    && charge?.refunded === true
}

export function disputeAccessAction(status) {
  if (status === 'lost') return 'revoke'
  if (status === 'won' || status === 'warning_closed') return 'sync'
  return 'keep'
}

export const BILLING_WEBHOOK_EVENTS = new Set([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.paused',
  'customer.subscription.resumed',
  'invoice.paid',
  'invoice.payment_failed',
  'invoice.payment_action_required',
  'refund.created',
  'refund.updated',
  'refund.failed',
  'charge.refunded',
  'charge.dispute.created',
  'charge.dispute.updated',
  'charge.dispute.closed',
  'charge.dispute.funds_withdrawn',
  'charge.dispute.funds_reinstated',
  'radar.early_fraud_warning.created',
  'radar.early_fraud_warning.updated',
])

export function isBillingWebhookEvent(type) {
  return BILLING_WEBHOOK_EVENTS.has(type) || type.startsWith('customer.subscription.')
}
