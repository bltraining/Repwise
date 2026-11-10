import type { Config } from '@netlify/functions'
import { checkPassword, deleteAccount, getProfil, getStripe, handleError, HttpError, json, requireUser } from '../lib/billing.mts'

// Supprime le compte après confirmation du mot de passe,
// en arrêtant d'abord tout abonnement Stripe pour éviter un prélèvement sans compte.
export default async (req: Request) => {
  try {
    const user = await requireUser(req)
    const body = (await req.json().catch(() => ({}))) as { password?: unknown }
    const password = typeof body.password === 'string' ? body.password : ''
    if (!password) throw new HttpError(400, 'Entre ton mot de passe pour confirmer.')
    if (!user.email || !(await checkPassword(user.email, password))) {
      throw new HttpError(403, 'Mot de passe incorrect.')
    }

    const profil = await getProfil(user.id)
    if (profil?.role === 'coach') throw new HttpError(409, 'Ce compte est coach : réassigne d’abord ses clients.')
    if (profil?.stripe_customer_id) {
      const stripe = getStripe(req)
      const subs = await stripe.subscriptions.list({ customer: profil.stripe_customer_id, status: 'all', limit: 20 })
      for (const s of subs.data) {
        if (['active', 'trialing', 'past_due', 'unpaid', 'incomplete', 'paused'].includes(s.status)) {
          await stripe.subscriptions.cancel(s.id)
        }
      }
    }

    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
    await deleteAccount(user.id, token)
    return json({ deleted: true })
  } catch (err) {
    return handleError(err)
  }
}

export const config: Config = { path: '/api/delete-account', method: 'POST' }
