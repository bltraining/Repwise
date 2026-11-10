import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../netlify/lib/cassandre.mts', import.meta.url), 'utf8')

test('the requested plural status question is recognized without invoking workers', () => {
  const match = source.match(/const statusIntent = (\/.*?\/)i\.test\(text\)/)
  assert.ok(match, 'status intent expression remains present')
  const pattern = new RegExp(match[1].slice(1, -1), 'i')
  assert.equal(pattern.test('Où en sont mes missions ?'), true)
  assert.equal(pattern.test('Où en est ma dernière mission ?'), true)
})

test('read-only beta rejects every non-status command before task dispatch', () => {
  const guard = source.indexOf("getEnv('CASSANDRE_READ_ONLY_MODE') === 'true' && !statusIntent")
  const dispatch = source.indexOf('createCassandreRequest(ownerId, text, channel, sourceMessageId)')
  assert.notEqual(guard, -1, 'server-side read-only guard exists')
  assert.notEqual(dispatch, -1, 'task dispatch remains present')
  assert.ok(guard < dispatch, 'read-only guard runs before task dispatch')
  assert.match(source.slice(guard, dispatch), /new HttpError\(403/)
})

test('read-only beta also rejects administration and WhatsApp connection endpoints', async () => {
  const files = [
    '../netlify/functions/cassandre-settings.mts',
    '../netlify/functions/whatsapp-connection-request.mts',
    '../netlify/functions/whatsapp-connection-verify.mts',
  ]
  const sources = await Promise.all(files.map(path => readFile(new URL(path, import.meta.url), 'utf8')))
  for (const endpoint of sources) {
    assert.match(endpoint, /requireFounder\(req\)/)
    assert.match(endpoint, /CASSANDRE_READ_ONLY_MODE/)
    assert.match(endpoint, /json\(\{ error: .*\}, 403\)/)
  }
})

test('runtime configuration exposes only a boolean for the beta read-only mode', async () => {
  const runtime = await readFile(new URL('../netlify/functions/repwise-runtime-config.mts', import.meta.url), 'utf8')
  assert.match(runtime, /cassandreReadOnly: getEnv\('CASSANDRE_READ_ONLY_MODE'\) === 'true'/)
  assert.doesNotMatch(runtime, /CASSANDRE_OWNER_USER_ID|SUPABASE_SERVICE_ROLE_KEY/)
})
