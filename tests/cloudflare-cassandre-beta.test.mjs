import test from 'node:test'
import assert from 'node:assert/strict'
import { onRequestPost } from '../functions/api/cassandre-command.js'
import { onRequestGet } from '../functions/api/runtime-config.js'

const testUrl = 'https://ahcdiqmxlblitbbbqxzo.supabase.co'
const founderId = '10000000-0000-4000-8000-000000000001'
const coachId = '20000000-0000-4000-8000-000000000002'
const env = {
  CASSANDRE_READ_ONLY_MODE: 'true',
  SUPABASE_URL: testUrl,
  SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  CASSANDRE_OWNER_USER_ID: founderId,
}

function request(message = 'Où en sont mes missions ?', token = 'test-jwt', extra = {}, claimedFounderId) {
  return new Request('https://repwise-cassandre-beta.pages.dev/api/cassandre-command', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...extra },
    body: JSON.stringify({ message, ...(claimedFounderId ? { founder_user_id: claimedFounderId } : {}) }),
  })
}

test('runtime config exposes only the public key and only for the isolated test project', async () => {
  const unavailable = await onRequestGet({ env: { ...env, SUPABASE_URL: 'https://production.supabase.co' } })
  assert.equal(unavailable.status, 503)
  assert.equal((await onRequestGet({ env: { ...env, CASSANDRE_READ_ONLY_MODE: 'false' } })).status, 503)
  const response = await onRequestGet({ env })
  assert.equal(response.status, 200)
  const publicConfig = await response.json()
  assert.deepEqual(publicConfig, { url: testUrl, publishableKey: env.SUPABASE_PUBLISHABLE_KEY })
  assert.doesNotMatch(JSON.stringify(publicConfig), /service.role|test-service-role-key/i)
})

test('missing configuration and missing JWT fail closed without contacting Supabase', async t => {
  const originalFetch = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => { calls++; throw new Error('unexpected network') }
  t.after(() => { globalThis.fetch = originalFetch })

  const missing = await onRequestPost({ request: request(), env: { ...env, SUPABASE_SERVICE_ROLE_KEY: '' } })
  assert.equal(missing.status, 503)
  const anonymous = await onRequestPost({ request: request('Où en sont mes missions ?', ''), env })
  assert.equal(anonymous.status, 401)
  assert.equal(calls, 0)
})

test('non-founder cannot gain access by claiming the owner identity in the body', async t => {
  const originalFetch = globalThis.fetch
  const calls = []
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input)
    calls.push({ url, headers: new Headers(init.headers), body: init.body })
    if (url.endsWith('/auth/v1/user')) return Response.json({ id: coachId })
    if (url.endsWith('/rpc/cassandre_private_api')) return Response.json([])
    throw new Error('unexpected URL')
  }
  t.after(() => { globalThis.fetch = originalFetch })

  const response = await onRequestPost({ request: request('Où en sont mes missions ?', 'valid-coach-jwt', {}, founderId), env })
  assert.equal(response.status, 403)
  assert.equal((await response.json()).error, 'founder_only')
  assert.equal(calls.filter(x => x.url.endsWith('/auth/v1/user')).length, 1)
  assert.equal(calls.some(x => x.url.endsWith('/rpc/cassandre_private_api') && JSON.parse(x.body).p_table === 'audit_log'), true)
  assert.equal(calls.some(x => x.url.endsWith('/rest/v1/profils')), false)
})

test('only the status phrase is accepted; no Supabase request is made for other commands', async t => {
  const originalFetch = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => { calls++; throw new Error('unexpected network') }
  t.after(() => { globalThis.fetch = originalFetch })
  const response = await onRequestPost({ request: request('Lance une mission pour les agents'), env })
  assert.equal(response.status, 403)
  assert.equal(calls, 0)
})

test('founder status query verifies auth and coach role, reads owned tasks, and audits without dispatch', async t => {
  const originalFetch = globalThis.fetch
  const calls = []
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input)
    const headers = new Headers(init.headers)
    calls.push({ url, headers, body: init.body })
    if (url.endsWith('/auth/v1/user')) {
      assert.equal(headers.get('authorization'), 'Bearer valid-founder-jwt')
      assert.equal(headers.get('apikey'), env.SUPABASE_PUBLISHABLE_KEY)
      return Response.json({ id: founderId })
    }
    if (url.includes('/rest/v1/profils?')) return Response.json([{ id: founderId, role: 'coach' }])
    if (url.endsWith('/rpc/cassandre_private_api')) {
      const rpc = JSON.parse(init.body)
      assert.equal(headers.get('apikey'), env.SUPABASE_SERVICE_ROLE_KEY)
      if (rpc.p_table === 'tasks') {
        assert.deepEqual(rpc.p_params, { owner_user_id: `eq.${founderId}`, limit: '20' })
        return Response.json([{ id: 'task-1', title: 'Analyse fictive', agent_key: 'commercial', status: 'completed', result: { summary: 'Synthèse test' } }])
      }
      assert.equal(rpc.p_table, 'audit_log')
      return Response.json(null)
    }
    throw new Error('unexpected URL')
  }
  t.after(() => { globalThis.fetch = originalFetch })

  const response = await onRequestPost({ request: request('OU EN SONT MES MISSIONS ?', 'valid-founder-jwt'), env })
  assert.equal(response.status, 200)
  assert.equal((await response.json()).tasks[0].title, 'Analyse fictive')
  assert.equal(calls.filter(x => x.url.endsWith('/rpc/cassandre_private_api')).length, 2)
  assert.equal(calls.some(x => /openai|googleapis|stripe|whatsapp/i.test(x.url)), false)
})
