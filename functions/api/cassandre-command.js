const TEST_SUPABASE_URL = 'https://ahcdiqmxlblitbbbqxzo.supabase.co'
const NO_STORE = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }

const json = (body, status = 200) => Response.json(body, { status, headers: NO_STORE })
const normalized = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').replace(/[^a-z0-9]+/g, ' ').trim()
const isFounderCommand = value => normalized(value) === 'ou en sont mes missions'

function configured(env) {
  return env.CASSANDRE_READ_ONLY_MODE === 'true'
    && env.SUPABASE_URL === TEST_SUPABASE_URL
    && Boolean(env.SUPABASE_PUBLISHABLE_KEY && env.SUPABASE_SERVICE_ROLE_KEY && env.CASSANDRE_OWNER_USER_ID)
}

function supabaseHeaders(env, token = env.SUPABASE_SERVICE_ROLE_KEY) {
  return { apikey: token, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

async function audit(env, actor, action, details = {}) {
  const response = await fetch(`${TEST_SUPABASE_URL}/rest/v1/rpc/cassandre_private_api`, {
    method: 'POST',
    headers: supabaseHeaders(env),
    body: JSON.stringify({
      p_table: 'audit_log',
      p_method: 'POST',
      p_params: {},
      p_body: { actor, action, target_type: 'cassandre_command', target_id: 'read_only', details },
    }),
  })
  if (!response.ok) throw new Error('audit_write_failed')
}

export async function onRequestPost({ request, env }) {
  if (!configured(env)) return json({ error: 'consultation_unavailable' }, 503)
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
    return json({ error: 'invalid_request' }, 415)
  }
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'forbidden' }, 403)

  const bearer = request.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1]
  if (!bearer) return json({ error: 'authentication_required' }, 401)
  if (bearer.length > 8192) return json({ error: 'invalid_request' }, 400)

  let body
  try {
    const raw = await request.text()
    if (raw.length > 2048) return json({ error: 'invalid_request' }, 413)
    body = JSON.parse(raw)
  } catch {
    return json({ error: 'invalid_request' }, 400)
  }
  if (!body || typeof body.message !== 'string' || !isFounderCommand(body.message)) {
    return json({ error: 'read_only_command_only' }, 403)
  }

  try {
    const authResponse = await fetch(`${TEST_SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${bearer}` },
    })
    if (!authResponse.ok) return json({ error: 'authentication_required' }, 401)
    const user = await authResponse.json()
    if (typeof user.id !== 'string') return json({ error: 'authentication_required' }, 401)

    if (user.id !== env.CASSANDRE_OWNER_USER_ID) {
      await audit(env, user.id, 'founder_access_denied', { reason: 'authenticated_identity_mismatch' }).catch(() => {})
      return json({ error: 'founder_only' }, 403)
    }

    const profileResponse = await fetch(
      `${TEST_SUPABASE_URL}/rest/v1/profils?select=id,role&id=eq.${encodeURIComponent(user.id)}&limit=1`,
      { headers: supabaseHeaders(env) },
    )
    if (!profileResponse.ok) return json({ error: 'consultation_unavailable' }, 503)
    const profiles = await profileResponse.json()
    if (!Array.isArray(profiles) || profiles.length !== 1 || profiles[0].role !== 'coach') {
      await audit(env, user.id, 'founder_access_denied', { reason: 'founder_profile_not_active_coach' }).catch(() => {})
      return json({ error: 'founder_only' }, 403)
    }

    const taskResponse = await fetch(`${TEST_SUPABASE_URL}/rest/v1/rpc/cassandre_private_api`, {
      method: 'POST',
      headers: supabaseHeaders(env),
      body: JSON.stringify({
        p_table: 'tasks',
        p_method: 'GET',
        p_params: { owner_user_id: `eq.${user.id}`, limit: '20' },
        p_body: null,
      }),
    })
    if (!taskResponse.ok) return json({ error: 'consultation_unavailable' }, 503)
    const tasks = await taskResponse.json()
    if (!Array.isArray(tasks)) return json({ error: 'consultation_unavailable' }, 503)

    await audit(env, user.id, 'status_requested', { channel: 'cloudflare_pages', task_count: tasks.length })
    const recent = tasks.slice(0, 8).map(task => ({
      id: task.id,
      title: typeof task.title === 'string' ? task.title.slice(0, 180) : 'Mission',
      agent: typeof task.agent_key === 'string' ? task.agent_key : 'inconnu',
      status: typeof task.status === 'string' ? task.status : 'inconnu',
      summary: typeof task.result?.summary === 'string' ? task.result.summary.slice(0, 220) : null,
      created_at: task.created_at,
    }))
    return json({ tasks: recent })
  } catch {
    return json({ error: 'consultation_unavailable' }, 503)
  }
}
