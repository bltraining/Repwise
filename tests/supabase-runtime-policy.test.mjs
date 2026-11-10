import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { hasExplicitPublicSupabaseConfig, resolveSupabaseRuntimeConfig, TEST_SUPABASE_URL } from '../netlify/lib/supabase-runtime-policy.mjs'

const anon = 'sb_publishable_test_public_key_123456789'
const serviceRoleJwt = `eyJhbGciOiJub25lIn0.${Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url')}.signature`
const primary = 'repwise-coaching.netlify.app'

test('missing, malformed, and secret-key configurations fail closed', () => {
  assert.equal(hasExplicitPublicSupabaseConfig('', anon), false)
  assert.equal(hasExplicitPublicSupabaseConfig(TEST_SUPABASE_URL, ''), false)
  assert.equal(hasExplicitPublicSupabaseConfig(TEST_SUPABASE_URL, serviceRoleJwt), false)
  assert.equal(hasExplicitPublicSupabaseConfig('https://example.com', anon), false)
})

test('Deploy Previews are pinned to the isolated Supabase test project', () => {
  const base = { requestHost: 'deploy-preview-27--repwise-coaching.netlify.app', context: 'deploy-preview' }
  assert.deepEqual(resolveSupabaseRuntimeConfig({ ...base, url: TEST_SUPABASE_URL, publishableKey: anon }), { url: TEST_SUPABASE_URL, key: anon })
  assert.equal(resolveSupabaseRuntimeConfig({ ...base, url: 'https://prod-ref.supabase.co', publishableKey: anon }), null)
  assert.equal(resolveSupabaseRuntimeConfig({ ...base, url: undefined, publishableKey: anon }), null)
})

test('the primary Netlify host accepts only explicit public configuration', () => {
  const config = resolveSupabaseRuntimeConfig({ requestHost: primary, context: 'production', url: 'https://explicit-prod.supabase.co', publishableKey: anon })
  assert.equal(config?.url, 'https://explicit-prod.supabase.co')
  assert.equal(resolveSupabaseRuntimeConfig({ requestHost: primary, context: 'production', publishableKey: anon }), null)
  // A preview's deployment URL is its own host; that must not grant production access.
  assert.equal(resolveSupabaseRuntimeConfig({ requestHost: primary, context: 'deploy-preview', url: 'https://explicit-prod.supabase.co', publishableKey: anon }), null)
  assert.equal(resolveSupabaseRuntimeConfig({ requestHost: primary, context: undefined, url: 'https://explicit-prod.supabase.co', publishableKey: anon }), null)
})

test('the isolated Cassandre beta host cannot receive a production Supabase config', () => {
  const config = resolveSupabaseRuntimeConfig({
    requestHost: 'repwise-cassandre-beta.netlify.app',
    context: 'production',
    url: 'https://explicit-prod.supabase.co',
    publishableKey: anon,
  })
  assert.equal(config, null)
})

test('the browser receives only the public Supabase config and has no service-role key', async () => {
  const [app, html, runtime] = await Promise.all([
    readFile(new URL('../app.js', import.meta.url), 'utf8'),
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../runtime-config.js', import.meta.url), 'utf8'),
  ])
  assert.match(app, /window\.REPW_SUPABASE_CONFIG/)
  assert.match(html, /src="\/runtime-config\.js"/)
  assert.doesNotMatch(app + html + runtime, /SUPABASE_SERVICE_ROLE_KEY|sb_secret_|service_role.{0,32}(?:key|jwt)/i)
})
