import test from 'node:test'
import assert from 'node:assert/strict'
import worker from '../cloudflare/worker.js'

const url = 'https://qlwlyectatosrelqynkz.supabase.co'
const owner = '10000000-0000-4000-8000-000000000001'
const coach = '20000000-0000-4000-8000-000000000002'
const client = '30000000-0000-4000-8000-000000000003'
const env = {
  CASSANDRE_READ_ONLY_MODE: 'true',
  SUPABASE_URL: url,
  SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-server-only',
  CASSANDRE_OWNER_USER_ID: owner,
}

function getPanel(token, config = env) {
  return worker.fetch(new Request('https://repwise-founder-test.workers.dev/api/founder-panel', {
    headers: token ? { Cookie: `repwise_access=${token}` } : {},
  }), config)
}

function login(email, config = env, origin = 'https://repwise-founder-test.workers.dev') {
  return worker.fetch(new Request(`${origin}/api/repwise-session`, {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'fictional-password', founder_user_id: owner }),
  }), config)
}

test('anonymous visitor receives 401 and no private dashboard data', async t => {
  const original = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => { calls++; throw new Error('unexpected upstream request') }
  t.after(() => { globalThis.fetch = original })

  const response = await getPanel(null)
  const body = await response.text()
  assert.equal(response.status, 401)
  assert.doesNotMatch(body, /Cassandre|Commercial|Financier/i)
  assert.equal(calls, 0)
})

test('cross-site dashboard requests are rejected before Supabase is called', async t => {
  const original = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => { calls++; throw new Error('unexpected upstream request') }
  t.after(() => { globalThis.fetch = original })

  const response = await worker.fetch(new Request('https://repwise-founder-test.workers.dev/api/founder-panel', {
    headers: { Origin: 'https://attacker.invalid', Cookie: 'repwise_access=stolen-token' },
  }), env)
  assert.equal(response.status, 403)
  assert.equal(calls, 0)
})

test('logout revokes only the current Supabase session and clears secure cookies', async t => {
  const original = globalThis.fetch
  const calls = []
  globalThis.fetch = async (input, init = {}) => {
    calls.push({ url: String(input), method: init.method, authorization: init.headers?.Authorization })
    if (String(input).endsWith('/auth/v1/user')) return Response.json({ id: owner })
    if (String(input).endsWith('/auth/v1/logout?scope=local')) return new Response(null, { status: 204 })
    return Response.json([])
  }
  t.after(() => { globalThis.fetch = original })

  const origin = 'https://repwise-founder-test.workers.dev'
  const response = await worker.fetch(new Request(`${origin}/api/repwise-session`, {
    method: 'DELETE', headers: { Origin: origin, Cookie: 'repwise_access=founder-token' },
  }), { ...env, SUPABASE_SERVICE_ROLE_KEY: 'test-server-only' })
  assert.equal(response.status, 200)
  const signOutCall = calls.find(call => call.url.endsWith('/auth/v1/logout?scope=local'))
  assert.ok(signOutCall && signOutCall.method === 'POST')
  assert.equal(signOutCall.authorization, 'Bearer founder-token')
  assert.ok(response.headers.getSetCookie().every(value => /Max-Age=0/.test(value) && /HttpOnly; Secure; SameSite=Strict/.test(value)))
})

test('authenticated coach and client identities both receive 403 regardless of body claims', async t => {
  const original = globalThis.fetch
  globalThis.fetch = async () => Response.json({ id: coach })
  t.after(() => { globalThis.fetch = original })

  for (const userId of [coach, client]) {
    globalThis.fetch = async () => Response.json({ id: userId })
    const response = await getPanel('valid-test-token')
    const body = await response.text()
    assert.equal(response.status, 403)
    assert.doesNotMatch(body, /Cassandre|Commercial|Financier/i)
    assert.doesNotMatch(body, new RegExp(owner))
  }
})

test('only the exact server-configured UID receives the private read-only dashboard', async t => {
  const original = globalThis.fetch
  const calls = []
  globalThis.fetch = async (input, init = {}) => {
    const target = String(input)
    calls.push(target)
    if (target.endsWith('/auth/v1/user')) return Response.json({ id: owner })
    if (target.includes('/rest/v1/profils?')) return Response.json([{ id: owner, role: 'coach' }])
    if (target.endsWith('/rest/v1/rpc/cassandre_private_api')) return Response.json([])
    throw new Error('unexpected upstream request')
  }
  t.after(() => { globalThis.fetch = original })

  const response = await getPanel('valid-founder-test-token')
  const body = await response.json()
  assert.equal(response.status, 200)
  assert.equal(body.display_name, 'Cassandre')
  assert.equal(body.read_only, true)
  assert.equal(body.data_available, true)
  assert.deepEqual(body.agents.map(agent => agent.name), ['Commercial', 'Clients', 'Nutrition', 'Programmes', 'Technique', 'Financier'])
  assert.ok(calls.includes(`${url}/auth/v1/user`))
  assert.ok(calls.some(call => call.startsWith(`${url}/rest/v1/profils?`)))
  assert.equal(JSON.stringify(body).includes(env.SUPABASE_PUBLISHABLE_KEY), false)
})

test('founder reads and authenticated non-founder refusals are written to the private audit log', async t => {
  const original = globalThis.fetch
  const actions = []
  globalThis.fetch = async (input, init = {}) => {
    const target = String(input)
    if (target.endsWith('/auth/v1/user')) {
      return Response.json({ id: targetUser })
    }
    if (target.includes('/rest/v1/profils?')) return Response.json([{ id: targetUser, role: 'coach' }])
    if (target.endsWith('/rest/v1/rpc/cassandre_private_api')) {
      const call = JSON.parse(init.body)
      if (call.p_table === 'audit_log') actions.push(call.p_body.action)
      return Response.json([])
    }
    throw new Error('unexpected upstream request')
  }
  t.after(() => { globalThis.fetch = original })

  let targetUser = coach
  const denied = await getPanel('valid-coach-token', { ...env, SUPABASE_SERVICE_ROLE_KEY: 'test-server-only' })
  assert.equal(denied.status, 403)
  assert.ok(actions.includes('founder_access_denied'))

  targetUser = owner
  const allowed = await getPanel('valid-founder-token', { ...env, SUPABASE_SERVICE_ROLE_KEY: 'test-server-only' })
  assert.equal(allowed.status, 200)
  assert.ok(actions.includes('founder_panel_read'))
})

test('login verifies the server-returned UID and keeps tokens in HttpOnly cookies', async t => {
  const original = globalThis.fetch
  globalThis.fetch = async input => {
    if (String(input).includes('/auth/v1/token?grant_type=password')) {
      return Response.json({ access_token: 'test-access-token', refresh_token: 'test-refresh-token', expires_in: 3600 })
    }
    if (String(input).endsWith('/auth/v1/user')) return Response.json({ id: owner })
    if (String(input).includes('/rest/v1/profils?')) return Response.json([{ id: owner, role: 'coach' }])
    if (String(input).endsWith('/rest/v1/rpc/cassandre_private_api')) return Response.json([])
    throw new Error('unexpected upstream request')
  }
  t.after(() => { globalThis.fetch = original })

  const response = await login('founder@example.invalid')
  const body = await response.text()
  assert.equal(response.status, 200)
  assert.deepEqual(await response.headers.getSetCookie().map(value => value.split(';')[0]), [
    'repwise_access=test-access-token', 'repwise_refresh=test-refresh-token',
  ])
  assert.match(response.headers.getSetCookie().join(';'), /HttpOnly; Secure; SameSite=Strict/)
  assert.doesNotMatch(body, /test-access-token|test-refresh-token|Cassandre/)
})

test('even the configured UID is refused when its server-side profile is not coach', async t => {
  const original = globalThis.fetch
  globalThis.fetch = async input => {
    if (String(input).includes('/auth/v1/token?grant_type=password')) {
      return Response.json({ access_token: 'test-access-token', refresh_token: 'test-refresh-token', expires_in: 3600 })
    }
    if (String(input).endsWith('/auth/v1/user')) return Response.json({ id: owner })
    if (String(input).includes('/rest/v1/profils?')) return Response.json([{ id: owner, role: 'client' }])
    return Response.json([])
  }
  t.after(() => { globalThis.fetch = original })

  const response = await login('founder@example.invalid')
  assert.equal(response.status, 403)
  assert.equal(response.headers.getSetCookie().length, 0)
})

test('login rejects a non-founder and ignores a claimed founder UID in the request', async t => {
  const original = globalThis.fetch
  globalThis.fetch = async input => String(input).includes('/auth/v1/token?grant_type=password')
    ? Response.json({ access_token: 'non-founder-token', refresh_token: 'non-founder-refresh', expires_in: 3600 })
    : Response.json({ id: coach })
  t.after(() => { globalThis.fetch = original })

  const response = await login('coach@example.invalid')
  assert.equal(response.status, 403)
  assert.equal(response.headers.getSetCookie().length, 0)
  assert.doesNotMatch(await response.text(), /Cassandre|Commercial|Financier/i)
})

test('test-only configuration is mandatory and production Supabase is rejected', async t => {
  const original = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => { calls++; throw new Error('unexpected upstream request') }
  t.after(() => { globalThis.fetch = original })

  assert.equal((await login('x@example.invalid', { ...env, SUPABASE_URL: 'https://dpbfkzmoizjdevrwuukb.supabase.co' })).status, 503)
  assert.equal((await login('x@example.invalid', { ...env, CASSANDRE_READ_ONLY_MODE: 'false' })).status, 503)
  assert.equal((await login('x@example.invalid', { ...env, CASSANDRE_OWNER_USER_ID: '' })).status, 503)
  assert.equal(calls, 0)
})

test('no task execution, generation, or administrative mutation endpoints exist', async () => {
  for (const path of ['/api/cassandre-command', '/api/task-worker', '/api/agent-runner', '/api/stripe-checkout', '/api/whatsapp-webhook']) {
    const response = await worker.fetch(new Request(`https://repwise-founder-test.workers.dev${path}`, { method: 'POST' }), env)
    assert.equal(response.status, 404, path)
  }
})
