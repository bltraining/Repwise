import type { Config } from '@netlify/functions'
import { getProfil, getStripe, handleError, json, requireUser, syncCustomer } from '../lib/billing.mts'

// Annule une résiliation programmée : l'abonnement continue normalement.
export default async (req: Request) => {
  try {
    const user = await requireUser(req)
    const profil = await getProfil(user.id)
    if (!profil?.stripe_customer_id) return json({ error: 'Aucun abonnement' }, 404)
    const stripe = getStripe(req)
    const before = await syncCustomer(stripe, user.id, profil.stripe_customer_id)
    if (!before.active || !before.subscriptionId) {
      return json({ error: 'Abonnement terminé : abonne-toi de nouveau depuis l’onglet Premium.' }, 409)
    }
    await stripe.subscriptions.update(before.subscriptionId, { cancel_at_period_end: false, cancel_at: null })
    const after = await syncCustomer(stripe, user.id, profil.stripe_customer_id)
    return json({ ends: after.ends, resilie: after.resilie })
  } catch (err) {
    return handleError(err)
  }
}

export const config: Config = { path: '/api/stripe-resume', method: 'POST' }
