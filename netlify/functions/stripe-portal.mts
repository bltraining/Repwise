import type { Config } from '@netlify/functions'
import { getProfil, getStripe, handleError, json, requireUser } from '../lib/billing.mts'

// Ouvre l'espace client Stripe : carte bancaire, factures, résiliation.
export default async (req: Request) => {
  try {
    const user = await requireUser(req)
    const profil = await getProfil(user.id)
    if (!profil?.stripe_customer_id) return json({ error: 'Aucun abonnement' }, 404)
    const stripe = getStripe(req)
    const session = await stripe.billingPortal.sessions.create({
      customer: profil.stripe_customer_id,
      locale: 'fr',
      return_url: `${new URL(req.url).origin}/?premium=portail`,
    })
    return json({ url: session.url })
  } catch (err) {
    return handleError(err)
  }
}

export const config: Config = { path: '/api/stripe-portal', method: 'POST' }
