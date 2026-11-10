import type { Config } from '@netlify/functions'
import type Stripe from 'stripe'
import { getStripe, handleError, json, syncCustomer, uidForCustomer } from '../lib/billing.mts'

// Webhook Stripe : tient le profil à jour lors des renouvellements, échecs de paiement et résiliations.
export default async (req: Request) => {
  try {
    const secret = process.env.STRIPE_WEBHOOK_SECRET
    if (!secret) return json({ error: 'Webhook non configuré' }, 503)
    const stripe = getStripe(req)
    const sig = req.headers.get('stripe-signature') || ''
    const raw = await req.text()
    let event: Stripe.Event
    try {
      event = await stripe.webhooks.constructEventAsync(raw, sig, secret)
    } catch {
      return json({ error: 'Signature invalide' }, 400)
    }

    let customerId: string | null = null
    let uid: string | null = null
    const obj = event.data.object as { customer?: string | { id: string } | null; client_reference_id?: string | null; metadata?: Record<string, string> }
    if (
      event.type === 'checkout.session.completed' ||
      event.type.startsWith('customer.subscription.') ||
      event.type === 'invoice.paid' ||
      event.type === 'invoice.payment_failed'
    ) {
      customerId = typeof obj.customer === 'string' ? obj.customer : obj.customer?.id || null
      uid = obj.client_reference_id || obj.metadata?.supabase_uid || null
    }
    if (!customerId) return json({ received: true })
    if (!uid) uid = await uidForCustomer(stripe, customerId)
    if (uid) await syncCustomer(stripe, uid, customerId)
    return json({ received: true })
  } catch (err) {
    return handleError(err)
  }
}

export const config: Config = { path: '/api/stripe-webhook', method: 'POST' }
