import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import worker from '../cloudflare/worker.js'

test('Cloudflare beta build contains only the script-free static demo', async () => {
  const files = (await readdir(new URL('../dist-cloudflare/', import.meta.url))).sort()
  assert.deepEqual(files, ['_headers', 'index.html'])
  const html = await readFile(new URL('../dist-cloudflare/index.html', import.meta.url), 'utf8')
  assert.match(html, /six agents|six agents/i)
  assert.match(html, /données fictives/i)
  assert.doesNotMatch(html, /<script\b|https?:\/\/[^\s"']*(?:supabase\.co|\.netlify\/|stripe\.com|whatsapp)/i)
  assert.doesNotMatch(html, /SUPABASE_(?:SERVICE_ROLE_KEY|URL)|STRIPE_(?:SECRET_KEY|WEBHOOK_SECRET)|OPENAI_API_KEY/)
})

test('unmatched paths fail closed without a backend', async () => {
  const response = await worker.fetch(new Request('https://repwise-cassandre.workers.dev/api/cassandre-command'))
  assert.equal(response.status, 404)
  assert.equal(await response.text(), 'Not Found')
  assert.equal(response.headers.get('cache-control'), 'no-store')
})
