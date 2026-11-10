import Stripe from 'stripe'
import { isRepwiseMonthlyPrice } from './billing-policy.mjs'
import { hasExplicitPublicSupabaseConfig, resolveSupabaseRuntimeConfig } from './supabase-runtime-policy.mjs'

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export function getEnv(name: string): string | undefined {
  try {
    const provider = (globalThis as typeof globalThis & { Netlify?: { env?: { get: (key: string) => string | undefined } } }).Netlify
    const value = provider?.env?.get(name)
    if (value) return value
  } catch {}
  return process.env[name]
}

function supabaseConfig() {
  const url = getEnv('SUPABASE_URL')
  const publishableKey = getEnv('SUPABASE_PUBLISHABLE_KEY')
  if (!hasExplicitPublicSupabaseConfig(url, publishableKey)) {
    throw new HttpError(503, 'Supabase est désactivé : URL ou clé publique manquante/invalide pour cet environnement.')
  }
  return { url: new URL(url!.trim()).origin, publishableKey: publishableKey!.trim() }
}

export function assertSupabaseTargetForRequest(req: Request) {
  const config = resolveSupabaseRuntimeConfig({
    url: getEnv('SUPABASE_URL'),
    publishableKey: getEnv('SUPABASE_PUBLISHABLE_KEY'),
    requestHost: new URL(req.url).hostname,
    context: getEnv('CONTEXT'),
  })
  if (!config) throw new HttpError(503, 'Supabase est désactivé : cible absente ou interdite pour cet environnement.')
  return config
}

export function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

export function handleError(err: unknown) {
  if (err instanceof HttpError) return json({ error: err.message }, err.status)
  const error = err as { name?: unknown; code?: unknown; statusCode?: unknown; status?: unknown } | null
  console.error('Repwise function failed', {
    type: typeof error?.name === 'string' ? error.name : 'UnknownError',
    code: typeof error?.code === 'string' ? error.code.slice(0, 60) : undefined,
    status: Number.isInteger(error?.statusCode) ? error?.statusCode : Number.isInteger(error?.status) ? error?.status : undefined,
  })
  return json({ error: 'Erreur inattendue' }, 500)
}

export function isPrimarySiteRequest(req: Request) {
  return getEnv('CONTEXT') === 'production'
}

export function getStripe(req: Request) {
  if (getEnv('CASSANDRE_READ_ONLY_MODE') === 'true') throw new HttpError(503, 'Stripe est désactivé en mode consultation.')
  assertSupabaseTargetForRequest(req)
  const key = getEnv('STRIPE_SECRET_KEY')
  if (!key) throw new HttpError(503, 'Paiement non configuré')
  if (!/^(sk|rk)_(live|test)_/.test(key.trim())) {
    console.error('STRIPE_SECRET_KEY invalide : elle doit commencer par sk_live_, sk_test_ ou rk_')
    throw new HttpError(503, 'Paiement mal configuré (clé Stripe invalide)')
  }
  if (!isPrimarySiteRequest(req) && !/^(sk|rk)_test_/.test(key.trim())) {
    throw new HttpError(503, 'Les Deploy Previews exigent une clé Stripe de test.')
  }
  return new Stripe(key.trim())
}

function serviceKey() {
  const key = getEnv('SUPABASE_SERVICE_ROLE_KEY')
  if (!key) throw new HttpError(503, 'Paiement non configuré')
  const k = key.trim()
  if (!k.startsWith('eyJ') && !k.startsWith('sb_secret_')) {
    console.error('SUPABASE_SERVICE_ROLE_KEY invalide : elle doit commencer par sb_secret_ ou eyJ')
    throw new HttpError(503, 'Serveur mal configuré (clé Supabase invalide)')
  }
  return k
}

export function adminHeaders(): Record<string, string> {
  supabaseConfig()
  const key = serviceKey()
  const h: Record<string, string> = { apikey: key, 'Content-Type': 'application/json' }
  // Les anciennes clés « service_role » sont des JWT ; les nouvelles « sb_secret_ » passent uniquement par apikey.
  if (key.startsWith('eyJ')) h.Authorization = `Bearer ${key}`
  return h
}

async function adminRpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${supabaseConfig().url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new HttpError(503, 'Service de données temporairement indisponible.')
  const text = await res.text()
  return (text ? JSON.parse(text) : null) as T
}

type GenerationReservation = {
  accepted: boolean
  reservation_id: string | null
  used_today: number
  reserved_today: number
  quota_day: string
  reason: string | null
}

export async function reserveCoachGeneration(input: {
  coachId: string
  requesterId: string
  clientId: string
  requestKey: string
}): Promise<GenerationReservation> {
  const rows = await adminRpc<GenerationReservation[]>('reserve_coach_ai_generation', {
    p_coach_id: input.coachId,
    p_requester_id: input.requesterId,
    p_client_id: input.clientId,
    p_request_key: input.requestKey,
  })
  if (!Array.isArray(rows) || !rows[0]) throw new HttpError(503, 'Quota IA temporairement indisponible.')
  return rows[0]
}

export async function claimCoachGeneration(input: {
  reservationId: string
  requesterId: string
  coachId: string
  clientId: string
}): Promise<boolean> {
  return adminRpc<boolean>('claim_coach_ai_generation', {
    p_reservation_id: input.reservationId,
    p_requester_id: input.requesterId,
    p_coach_id: input.coachId,
    p_client_id: input.clientId,
  })
}

export async function releaseCoachGeneration(reservationId: string, requesterId: string, code: string): Promise<void> {
  await adminRpc<boolean>('release_coach_ai_generation', {
    p_reservation_id: reservationId,
    p_requester_id: requesterId,
    p_error_code: code,
  })
}

export async function commitCoachGeneration(input: {
  reservationId: string
  requesterId: string
  coachId: string
  clientId: string
  programme: Record<string, unknown>
  exercises: Array<Record<string, unknown>>
}): Promise<string> {
  return adminRpc<string>('commit_coach_ai_generation', {
    p_reservation_id: input.reservationId,
    p_requester_id: input.requesterId,
    p_coach_id: input.coachId,
    p_client_id: input.clientId,
    p_programme: input.programme,
    p_exercises: input.exercises,
  })
}

export async function claimStripeWebhook(eventId: string, eventType: string): Promise<boolean> {
  return adminRpc<boolean>('claim_stripe_webhook', { p_event_id: eventId, p_event_type: eventType })
}

export async function finishStripeWebhook(eventId: string, status: 'processed' | 'failed', errorCode?: string): Promise<void> {
  await adminRpc<boolean>('finish_stripe_webhook', {
    p_event_id: eventId,
    p_status: status,
    p_error_code: errorCode || null,
  })
}

export async function requireRepwisePrice(stripe: Stripe, priceId: string): Promise<string> {
  let price: Stripe.Price
  try {
    price = await stripe.prices.retrieve(priceId)
  } catch {
    throw new HttpError(503, 'Le prix Stripe configuré est introuvable.')
  }
  if (!isRepwiseMonthlyPrice(price)) {
    throw new HttpError(503, 'Le prix Stripe doit être actif à 5 € par mois.')
  }
  return price.id
}

export type AuthUser = { id: string; email?: string }

/** Vérifie le jeton de session Supabase envoyé par l'appli. */
export async function requireUser(req: Request): Promise<AuthUser> {
  const config = assertSupabaseTargetForRequest(req)
  const auth = req.headers.get('authorization') || ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!token) throw new HttpError(401, 'Non connecté')
  const res = await fetch(`${config.url}/auth/v1/user`, {
    headers: { apikey: config.key, Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new HttpError(401, 'Session invalide')
  const user = (await res.json()) as AuthUser
  if (!user?.id) throw new HttpError(401, 'Session invalide')
  return user
}

export type Profil = {
  id: string
  nom_complet: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  premium_jusqu_au: string | null
  resilie: boolean | null
  acces_offert: boolean | null
  role?: string | null
}

export async function getProfil(uid: string): Promise<Profil | null> {
  const url = `${supabaseConfig().url}/rest/v1/profils?id=eq.${encodeURIComponent(uid)}&select=id,nom_complet,stripe_customer_id,stripe_subscription_id,premium_jusqu_au,resilie,acces_offert,role`
  const res = await fetch(url, { headers: adminHeaders() })
  if (!res.ok) throw new Error(`Lecture du profil impossible (${res.status}) ${await res.text()}`)
  const rows = (await res.json()) as Profil[]
  return rows[0] || null
}

export async function updateProfil(uid: string, patch: Partial<Profil>) {
  const res = await fetch(`${supabaseConfig().url}/rest/v1/profils?id=eq.${encodeURIComponent(uid)}`, {
    method: 'PATCH',
    headers: { ...adminHeaders(), Prefer: 'return=minimal' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(`Mise à jour du profil impossible (${res.status}) ${await res.text()}`)
}

/** Retrouve (ou crée) le client Stripe lié au compte. */
export async function ensureCustomer(stripe: Stripe, user: AuthUser, profil: Profil | null) {
  if (profil?.stripe_customer_id) {
    try {
      const c = await stripe.customers.retrieve(profil.stripe_customer_id)
      if (!('deleted' in c && c.deleted)) return c.id
    } catch (err) {
      // Client introuvable (par exemple créé avec d'autres clés) : on en recrée un.
      if (!(err instanceof Stripe.errors.StripeInvalidRequestError)) throw err
    }
  }
  const customer = await stripe.customers.create({
    email: user.email || undefined,
    name: profil?.nom_complet || undefined,
    metadata: { supabase_uid: user.id },
  })
  await updateProfil(user.id, { stripe_customer_id: customer.id })
  return customer.id
}

function periodEnd(sub: Stripe.Subscription): number | null {
  const fromItems = sub.items?.data?.map((i) => i.current_period_end).filter(Boolean) as number[]
  if (fromItems?.length) return Math.max(...fromItems)
  const legacy = (sub as unknown as { current_period_end?: number }).current_period_end
  return legacy || null
}

const LIVE_STATUSES = new Set(['active', 'trialing', 'past_due'])

/**
 * Lit l'état réel de l'abonnement dans Stripe et le recopie dans le profil Supabase
 * (premium_jusqu_au, resilie, stripe_subscription_id), utilisé par a_acces_premium.
 */
export async function syncCustomer(stripe: Stripe, uid: string, customerId: string) {
  const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 20 })
  const live = subs.data
    .filter((s) => LIVE_STATUSES.has(s.status))
    .sort((a, b) => (periodEnd(b) || 0) - (periodEnd(a) || 0))[0]

  if (live) {
    const end = periodEnd(live)
    const patch: Partial<Profil> = {
      stripe_customer_id: customerId,
      stripe_subscription_id: live.id,
      resilie: !!(live.cancel_at_period_end || live.cancel_at),
    }
    if (end) patch.premium_jusqu_au = new Date(end * 1000).toISOString()
    await updateProfil(uid, patch)
    return { active: true, ends: patch.premium_jusqu_au || null, resilie: patch.resilie, subscriptionId: live.id, status: live.status }
  }

  // Plus d'abonnement en cours : l'accès s'arrête à la fin de la dernière période payée.
  const last = subs.data.sort((a, b) => (periodEnd(b) || 0) - (periodEnd(a) || 0))[0]
  if (last && last.status !== 'incomplete' && last.status !== 'incomplete_expired') {
    const stop = last.ended_at || periodEnd(last)
    await updateProfil(uid, {
      stripe_customer_id: customerId,
      stripe_subscription_id: last.id,
      resilie: true,
      ...(stop ? { premium_jusqu_au: new Date(stop * 1000).toISOString() } : {}),
    })
  }
  return { active: false, ends: null, resilie: true, subscriptionId: null, status: last?.status || null }
}

export async function uidForCustomer(stripe: Stripe, customerId: string): Promise<string | null> {
  const c = await stripe.customers.retrieve(customerId)
  if ('deleted' in c && c.deleted) return null
  return (c as Stripe.Customer).metadata?.supabase_uid || null
}

export const SUPABASE = {
  get url() { return supabaseConfig().url },
  get publishableKey() { return supabaseConfig().publishableKey },
}

/** Vérifie le mot de passe du compte (confirmation avant une action sensible). */
export async function checkPassword(email: string, password: string) {
  const config = supabaseConfig()
  const res = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: config.publishableKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return res.ok
}

/**
 * Supprime le compte via la fonction SQL de l'appli (supprimer_mon_compte, appelée avec la session
 * de l'utilisateur), ou à défaut directement dans l'authentification Supabase.
 */
export async function deleteAccount(uid: string, token: string) {
  const config = supabaseConfig()
  const rpc = await fetch(`${config.url}/rest/v1/rpc/supprimer_mon_compte`, {
    method: 'POST',
    headers: { apikey: config.publishableKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: '{}',
  })
  if (rpc.ok) return
  const txt = await rpc.text()
  if (rpc.status !== 404) {
    if (/coach/i.test(txt)) throw new HttpError(409, 'Ce compte est coach : réassigne d’abord ses clients.')
    throw new Error(`supprimer_mon_compte a échoué (${rpc.status}) ${txt}`)
  }
  await deleteAuthUser(uid)
}

async function deleteAuthUser(uid: string) {
  const res = await fetch(`${supabaseConfig().url}/auth/v1/admin/users/${encodeURIComponent(uid)}`, {
    method: 'DELETE',
    headers: adminHeaders(),
  })
  if (!res.ok) throw new Error(`Suppression du compte impossible (${res.status}) ${await res.text()}`)
}
