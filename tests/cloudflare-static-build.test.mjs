import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir, stat } from 'node:fs/promises'
import worker from '../cloudflare/worker.js'

test('Cloudflare preview includes the original Repwise app and its essential pages', async () => {
  const root = new URL('../dist-cloudflare/', import.meta.url)
  const files = await readdir(root)
  for (const file of ['index.html', 'app.js', 'runtime-config.js', 'preview-mode.js', 'sw.js', 'manifest.webmanifest', 'cgv.html', 'confidentialite.html', 'mentions-legales.html', '_headers']) {
    await stat(new URL(file, root))
  }
  assert.ok(files.includes('icons'))
  const html = await readFile(new URL('index.html', root), 'utf8')
  const app = await readFile(new URL('app.js', root), 'utf8')
  const runtime = await readFile(new URL('runtime-config.js', root), 'utf8')
  const preview = await readFile(new URL('preview-mode.js', root), 'utf8')
  const headers = await readFile(new URL('_headers', root), 'utf8')
  assert.match(html, /data-v="c"[^>]*>Entraînement/)
  assert.match(html, /data-v="h"[^>]*>Historique/)
  assert.match(html, /data-v="n"[^>]*>Nutrition/)
  assert.match(html, /data-v="k"[^>]*>Coach/)
  assert.match(html, /id="cassandreNav"/)
  assert.match(html, /id="whChart"/)
  assert.doesNotMatch(html, /vendor\/supabase|runtimeConfigFailure/)
  assert.match(app, /function loadProg\(\)/)
  assert.match(app, /function loadCassandre\(\)/)
  assert.doesNotMatch(runtime, /fetch\(|supabase\.co|\.netlify\/functions/)
  assert.match(preview, /command\.disabled = true/)
  assert.match(preview, /APERÇU · INACTIF/)
  assert.match(headers, /connect-src 'self'/)
  assert.match(headers, /Strict-Transport-Security: max-age=31536000/)
  assert.doesNotMatch(headers, /supabase\.co|\.netlify|stripe|whatsapp/i)
})

test('unmatched paths fail closed without a backend', async () => {
  const response = await worker.fetch(new Request('https://repwise-cassandre.workers.dev/api/cassandre-command'))
  assert.equal(response.status, 404)
  assert.equal(await response.text(), 'Not Found')
  assert.equal(response.headers.get('cache-control'), 'no-store')
})
