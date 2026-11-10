export const TEST_SUPABASE_URL = 'https://ahcdiqmxlblitbbbqxzo.supabase.co'

function isPublicKey(value) {
  const key = typeof value === 'string' ? value.trim() : ''
  if (key.startsWith('sb_publishable_')) return key.length > 24
  const parts = key.split('.')
  if (parts.length !== 3) return false
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
    return payload.role === 'anon'
  } catch { return false }
}

function parseOrigin(value) {
  try {
    const parsed = new URL(value)
    if (parsed.username || parsed.password || parsed.search || parsed.hash) return null
    if (parsed.protocol === 'https:' && parsed.hostname.endsWith('.supabase.co')) return parsed.origin
    if (parsed.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)) return parsed.origin
  } catch {}
  return null
}

export function hasExplicitPublicSupabaseConfig(url, key) {
  return !!parseOrigin(typeof url === 'string' ? url.trim() : '') && isPublicKey(key)
}

export function resolveSupabaseRuntimeConfig({ url, publishableKey, requestHost, context }) {
  const origin = parseOrigin(typeof url === 'string' ? url.trim() : '')
  if (!origin || !isPublicKey(publishableKey)) return null
  const host = typeof requestHost === 'string' ? requestHost.toLowerCase().split(':')[0] : ''
  const isLoopbackRequest = ['localhost', '127.0.0.1', '[::1]'].includes(host)
  const isPrimaryProductionHost = host === 'repwise-coaching.netlify.app'
  const targetHost = new URL(origin).hostname
  const isTestDatabase = origin === TEST_SUPABASE_URL || ['localhost', '127.0.0.1', '[::1]'].includes(targetHost)
  // Netlify URL points at the current deploy (including previews), so it cannot
  // identify production. Require both the production context and the known
  // primary Repwise host before allowing a production database URL.
  if (!isTestDatabase && (context !== 'production' || !isPrimaryProductionHost)) return null
  if (isLoopbackRequest && !isTestDatabase) return null
  return { url: origin, key: publishableKey.trim() }
}
