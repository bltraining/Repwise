import type { Config } from '@netlify/functions'
import { getEnv, json } from '../lib/billing.mts'
import { resolveSupabaseRuntimeConfig } from '../lib/supabase-runtime-policy.mjs'

export default async (req: Request) => {
  if (req.method !== 'GET') return json({ error: 'Méthode non autorisée.' }, 405)
  const runtime = resolveSupabaseRuntimeConfig({
    url: getEnv('SUPABASE_URL'),
    publishableKey: getEnv('SUPABASE_PUBLISHABLE_KEY'),
    requestHost: new URL(req.url).hostname,
    context: getEnv('CONTEXT'),
  })
  if (!runtime) return json({ error: 'Configuration Supabase absente ou interdite pour cet environnement.' }, 503)
  return json(runtime)
}

export const config: Config = { path: '/.netlify/functions/repwise-runtime-config', method: 'GET' }
