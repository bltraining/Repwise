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
  const guard = source.indexOf("if (readOnly && !statusIntent)")
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


test('read-only guard runs before request deduplication and duplicates cannot restart tasks', () => {
  const start = source.indexOf('export async function processFounderMessage')
  const end = source.indexOf('export async function dispatchTask', start)
  const handler = source.slice(start, end)
  const guard = handler.indexOf('if (readOnly && !statusIntent)')
  const dedupe = handler.indexOf('if (sourceMessageId)')
  const safeDuplicate = handler.indexOf('if (readOnly) return { requestId: existing.id, taskIds: []')
  assert.ok(guard >= 0 && guard < dedupe, 'commands are authorized before deduplication')
  assert.ok(safeDuplicate > dedupe, 'read-only duplicate returns no worker task IDs')
  assert.match(source, /dispatchTask[\s\S]*?CASSANDRE_READ_ONLY_MODE/)
})

test('all background, scheduled, WhatsApp, workout AI, and Stripe paths fail closed in read-only mode', async () => {
  const files = [
    '../netlify/functions/cassandre-task-worker-background.mts',
    '../netlify/functions/cassandre-synthesize-background.mts',
    '../netlify/functions/cassandre-task-reconciler.mts',
    '../netlify/functions/cassandre-daily-report.mts',
    '../netlify/functions/cassandre-whatsapp-router-background.mts',
    '../netlify/functions/cassandre-notifications-background.mts',
    '../netlify/functions/whatsapp-webhook.mts',
    '../netlify/functions/generer-programme-background.mts',
    '../netlify/lib/billing.mts',
  ]
  const sources = await Promise.all(files.map(path => readFile(new URL(path, import.meta.url), 'utf8')))
  for (const endpoint of sources) assert.match(endpoint, /CASSANDRE_READ_ONLY_MODE/)
  const command = await readFile(new URL('../netlify/functions/cassandre-command.mts', import.meta.url), 'utf8')
  assert.ok(command.indexOf('await requireFounder(req)') < command.indexOf('processFounderMessage('), 'founder auth precedes command handling')
  const billing = sources.at(-1)
  assert.ok(billing.indexOf("getEnv('CASSANDRE_READ_ONLY_MODE')") < billing.indexOf('return new Stripe('), 'Stripe creation is blocked')
})

test('runtime configuration exposes only a boolean for the beta read-only mode', async () => {
  const runtime = await readFile(new URL('../netlify/functions/repwise-runtime-config.mts', import.meta.url), 'utf8')
  assert.match(runtime, /cassandreReadOnly: getEnv\('CASSANDRE_READ_ONLY_MODE'\) === 'true'/)
  assert.doesNotMatch(runtime, /CASSANDRE_OWNER_USER_ID|SUPABASE_SERVICE_ROLE_KEY/)
})
