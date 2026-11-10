import type { Config } from '@netlify/functions'
import { getProfil, getStripe, handleError, json, requireUser, syncCustomer } from '../lib/billing.mts'

// Recopie l'état de l'abonnement Stripe dans le profil (au retour du paiement et à la connexion).
export default async (req: Request) => {
  try {
    const user = await requireUser(req)
    const profil = await getProfil(user.id)
    if (!profil?.stripe_customer_id) return json({ active: false, none: true })
    const stripe = getStripe(req)
    const state = await syncCustomer(stripe, user.id, profil.stripe_customer_id)
    return json({ active: state.active, ends: state.ends, resilie: state.resilie, status: state.status })
  } catch (err) {
    return handleError(err)
  }
}

export const config: Config = { path: '/api/stripe-sync', method: 'POST' }
