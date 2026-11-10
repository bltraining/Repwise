import type { Config } from '@netlify/functions'
import { getProfil, getStripe, handleError, json, requireUser, syncCustomer } from '../lib/billing.mts'

// Résilie l'abonnement à la fin de la période déjà payée (sans frais).
export default async (req: Request) => {
  try {
    const user = await requireUser(req)
    const profil = await getProfil(user.id)
    if (!profil?.stripe_customer_id) return json({ error: 'Aucun abonnement' }, 404)
    const stripe = getStripe(req)
    const before = await syncCustomer(stripe, user.id, profil.stripe_customer_id)
    if (!before.active || !before.subscriptionId) return json({ error: 'Aucun abonnement en cours' }, 404)
    await stripe.subscriptions.update(before.subscriptionId, { cancel_at_period_end: true })
    const after = await syncCustomer(stripe, user.id, profil.stripe_customer_id)
    return json({ ends: after.ends })
  } catch (err) {
    return handleError(err)
  }
}

export const config: Config = { path: '/api/stripe-cancel', method: 'POST' }
