import type { Config } from '@netlify/functions'
import { ensureCustomer, getProfil, getStripe, handleError, json, requireUser, syncCustomer } from '../lib/billing.mts'

// Ouvre une page de paiement Stripe pour l'abonnement Premium mensuel.
export default async (req: Request) => {
  try {
    const user = await requireUser(req)
    const body = (await req.json().catch(() => ({}))) as { cgv?: unknown }
    if (body.cgv !== true) return json({ error: 'Accepte d’abord les CGV.' }, 400)
    const stripe = getStripe(req)
    const profil = await getProfil(user.id)
    if (!profil) return json({ error: 'Profil introuvable' }, 404)

    const customer = await ensureCustomer(stripe, user, profil)

    // Évite un second abonnement si le premier est déjà actif.
    const state = await syncCustomer(stripe, user.id, customer)
    if (state.active) return json({ already: true })

    const origin = new URL(req.url).origin
    const back = `${origin}/`
    const priceId = process.env.STRIPE_PRICE_ID
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer,
      client_reference_id: user.id,
      locale: 'fr',
      allow_promotion_codes: true,
      line_items: [
        priceId
          ? { price: priceId, quantity: 1 }
          : {
              quantity: 1,
              price_data: {
                currency: 'eur',
                unit_amount: 500,
                recurring: { interval: 'month' },
                product_data: { name: 'Repwise Premium', description: 'Coaching IA personnalisé, sans engagement' },
              },
            },
      ],
      subscription_data: { metadata: { supabase_uid: user.id } },
      metadata: { supabase_uid: user.id, cgv_acceptees_le: new Date().toISOString() },
      success_url: `${back}?premium=ok&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${back}?premium=annule`,
    })
    return json({ url: session.url })
  } catch (err) {
    return handleError(err)
  }
}

export const config: Config = { path: '/api/stripe-checkout', method: 'POST' }
