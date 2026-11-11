const TEST_SUPABASE_URL = 'https://qlwlyectatosrelqynkz.supabase.co'
const ACCESS_COOKIE = 'repwise_access'
const REFRESH_COOKIE = 'repwise_refresh'
const MAX_BODY_BYTES = 4096
const NO_STORE = {
  'Cache-Control': 'no-store, private',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Vary': 'Cookie',
}

const AGENT_SEED = [
  { key: 'commercial', name: 'Commercial', mission: 'Ventes, conversions et résiliations.' },
  { key: 'clients', name: 'Clients', mission: 'Activité, fidélisation et satisfaction.' },
  { key: 'nutrition', name: 'Nutrition', mission: 'Cohérence des plans et journaux.' },
  { key: 'programmes', name: 'Programmes', mission: 'Qualité des programmes sportifs.' },
  { key: 'technique', name: 'Technique', mission: 'Incidents et intégrations.' },
  { key: 'finance', name: 'Financier', mission: 'Indicateurs vérifiés, sans action financière.' },
]

const json = (data, status = 200, extraHeaders = []) => {
  const headers = new Headers(NO_STORE)
  headers.set('Content-Type', 'application/json; charset=utf-8')
  for (const entry of extraHeaders) {
    if (Array.isArray(entry)) headers.append(entry[0], entry[1])
    else headers.append('Set-Cookie', entry)
  }
  return new Response(JSON.stringify(data), { status, headers })
}

const error = (code, status, headers = []) => json({ error: code }, status, headers)

function configured(env) {
  return env.CASSANDRE_READ_ONLY_MODE === 'true'
    && env.SUPABASE_URL === TEST_SUPABASE_URL
    && typeof env.SUPABASE_PUBLISHABLE_KEY === 'string'
    && env.SUPABASE_PUBLISHABLE_KEY.length > 0
    && typeof env.CASSANDRE_OWNER_USER_ID === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(env.CASSANDRE_OWNER_USER_ID)
}

function sameOrigin(request) {
  return request.headers.get('origin') === new URL(request.url).origin
}

async function readJson(request) {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') return null
  const raw = await request.text()
  if (raw.length > MAX_BODY_BYTES) return null
  try { return JSON.parse(raw) } catch { return null }
}

function getCookie(request, name) {
  const cookies = request.headers.get('cookie') || ''
  for (const part of cookies.split(';')) {
    const separator = part.indexOf('=')
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue
    try { return decodeURIComponent(part.slice(separator + 1).trim()) } catch { return null }
  }
  return null
}

function cookie(name, value, maxAge) {
  return `${name}=${encodeURIComponent(value)}; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`
}

function clearCookies() {
  return [cookie(ACCESS_COOKIE, '', 0), cookie(REFRESH_COOKIE, '', 0)]
}

function sessionCookies(tokens) {
  const expires = Number(tokens.expires_in)
  const accessAge = Number.isSafeInteger(expires) ? Math.max(60, Math.min(expires, 3600)) : 3600
  return [cookie(ACCESS_COOKIE, tokens.access_token, accessAge), cookie(REFRESH_COOKIE, tokens.refresh_token, 60 * 60 * 24 * 30)]
}

function authHeaders(env, token) {
  return { apikey: env.SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${token}` }
}

async function verifyAccessToken(env, token) {
  const response = await fetch(`${TEST_SUPABASE_URL}/auth/v1/user`, { headers: authHeaders(env, token) })
  if (response.status === 401 || response.status === 403) return { invalid: true }
  if (!response.ok) return { unavailable: true }
  const user = await response.json()
  return typeof user?.id === 'string' ? { user } : { invalid: true }
}

async function refreshTokens(env, refreshToken) {
  const response = await fetch(`${TEST_SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
  if (response.status === 400 || response.status === 401) return { invalid: true }
  if (!response.ok) return { unavailable: true }
  const tokens = await response.json()
  if (typeof tokens?.access_token !== 'string' || typeof tokens?.refresh_token !== 'string') return { invalid: true }
  return { tokens }
}

async function writeAudit(env, actor, action, targetType, targetId) {
  if (typeof env.SUPABASE_SERVICE_ROLE_KEY !== 'string' || !env.SUPABASE_SERVICE_ROLE_KEY) return false
  try {
    const response = await fetch(`${TEST_SUPABASE_URL}/rest/v1/rpc/cassandre_private_api`, {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_table: 'audit_log', p_method: 'POST', p_params: {},
        p_body: { actor, action, target_type: targetType, target_id: targetId, details: {} },
      }),
    })
    return response.ok
  } catch {
    return false
  }
}

async function ownerSession(request, env) {
  if (!sameOrigin(request)) return { response: error('request_refused', 403) }
  if (!configured(env)) return { response: error('service_unavailable', 503) }

  const body = await readJson(request)
  if (!body || typeof body.email !== 'string' || typeof body.password !== 'string'
    || body.email.length > 254 || body.password.length > 1024) {
    return { response: error('invalid_request', 400) }
  }

  const login = await fetch(`${TEST_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: body.email.trim(), password: body.password }),
  })
  if (login.status === 400 || login.status === 401) return { response: error('authentication_failed', 401) }
  if (!login.ok) return { response: error('service_unavailable', login.status === 429 ? 429 : 503) }

  const tokens = await login.json()
  if (typeof tokens?.access_token !== 'string' || typeof tokens?.refresh_token !== 'string') {
    return { response: error('authentication_failed', 401) }
  }
  const verified = await verifyAccessToken(env, tokens.access_token)
  if (verified.unavailable) return { response: error('service_unavailable', 503) }
  if (!verified.user) return { response: error('authentication_failed', 401) }
  if (verified.user.id !== env.CASSANDRE_OWNER_USER_ID) {
    await writeAudit(env, verified.user.id, 'founder_access_denied', 'session', 'owner-login')
    return { response: error('access_denied', 403) }
  }
  await writeAudit(env, verified.user.id, 'founder_session_started', 'session', 'owner-login')
  return { response: json({ ok: true }, 200, sessionCookies(tokens)) }
}

async function authenticatedOwner(request, env) {
  const accessToken = getCookie(request, ACCESS_COOKIE)
  if (!accessToken) return { response: error('authentication_required', 401) }
  if (!configured(env)) return { response: error('service_unavailable', 503) }

  let checked = await verifyAccessToken(env, accessToken)
  let cookies = []
  if (checked.unavailable) return { response: error('service_unavailable', 503) }

  if (checked.invalid) {
    const refreshToken = getCookie(request, REFRESH_COOKIE)
    if (!refreshToken) return { response: error('authentication_required', 401, clearCookies()) }
    const refreshed = await refreshTokens(env, refreshToken)
    if (refreshed.unavailable) return { response: error('service_unavailable', 503) }
    if (!refreshed.tokens) return { response: error('authentication_required', 401, clearCookies()) }
    checked = await verifyAccessToken(env, refreshed.tokens.access_token)
    if (checked.unavailable) return { response: error('service_unavailable', 503) }
    if (checked.invalid) return { response: error('authentication_required', 401, clearCookies()) }
    cookies = sessionCookies(refreshed.tokens)
  }

  if (!checked.user) return { response: error('authentication_required', 401, clearCookies()) }
  if (checked.user.id !== env.CASSANDRE_OWNER_USER_ID) {
    await writeAudit(env, checked.user.id, 'founder_access_denied', 'founder_panel', 'owner-check')
    return { response: error('access_denied', 403, clearCookies()) }
  }
  return { user: checked.user, cookies }
}

async function readPrivateTable(env, table, params = {}) {
  if (typeof env.SUPABASE_SERVICE_ROLE_KEY !== 'string' || !env.SUPABASE_SERVICE_ROLE_KEY) return null
  const response = await fetch(`${TEST_SUPABASE_URL}/rest/v1/rpc/cassandre_private_api`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_table: table, p_method: 'GET', p_params: params, p_body: null }),
  })
  if (!response.ok) return null
  const value = await response.json()
  return Array.isArray(value) ? value : null
}

async function founderPanel(request, env) {
  const auth = await authenticatedOwner(request, env)
  if (auth.response) return auth.response

  const owner = auth.user.id
  const queries = env.SUPABASE_SERVICE_ROLE_KEY
    ? await Promise.all([
      readPrivateTable(env, 'agents', { limit: '20' }),
      readPrivateTable(env, 'requests', { owner_user_id: `eq.${owner}`, limit: '20' }),
      readPrivateTable(env, 'tasks', { owner_user_id: `eq.${owner}`, limit: '100' }),
      readPrivateTable(env, 'daily_reports', { limit: '30' }),
      readPrivateTable(env, 'decisions', { limit: '50' }),
      readPrivateTable(env, 'whatsapp_pending_approvals', { status: 'eq.awaiting_approval', limit: '50' }),
    ])
    : []
  const hasStoredData = queries.length === 6 && queries.every(Array.isArray)
  const agents = hasStoredData && queries[0].length
    ? queries[0].map(agent => ({
      key: String(agent.agent_key || 'agent'),
      name: String(agent.display_role || agent.agent_key || 'Agent'),
      mission: String(agent.mission || 'Mission non renseignée'),
      status: 'Désactivé en bêta',
    }))
    : AGENT_SEED.map(agent => ({ ...agent, status: 'Désactivé en bêta' }))

  await writeAudit(env, owner, 'founder_panel_read', 'founder_panel', 'read-only')

  return json({
    display_name: 'Cassandre',
    read_only: true,
    data_available: hasStoredData,
    agents,
    requests: hasStoredData ? queries[1] : [],
    tasks: hasStoredData ? queries[2] : [],
    reports: hasStoredData ? queries[3] : [],
    decisions: hasStoredData ? queries[4] : [],
    approvals: hasStoredData ? queries[5] : [],
  }, 200, auth.cookies.map(value => ['Set-Cookie', value]))
}

export default {
  async fetch(request, env = {}) {
    const { pathname } = new URL(request.url)
    if (pathname === '/api/repwise-session') {
      if (request.method === 'POST') {
        try { return (await ownerSession(request, env)).response } catch { return error('service_unavailable', 503) }
      }
      if (request.method === 'DELETE') {
        if (!sameOrigin(request)) return error('request_refused', 403)
        return json({ ok: true }, 200, clearCookies())
      }
      return error('method_not_allowed', 405)
    }
    if (pathname === '/api/founder-panel') {
      if (request.method !== 'GET') return error('not_found', 404)
      try { return await founderPanel(request, env) } catch { return error('service_unavailable', 503) }
    }
    if (pathname.startsWith('/api/')) return error('not_found', 404)
    return new Response('Not Found', { status: 404, headers: NO_STORE })
  },
}
