import { cp, mkdir, rm, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const demoMode = process.argv.includes('--demo')
const cloudflareDemoMode = process.argv.includes('--cloudflare-demo')
const outputDir = resolve(projectRoot, cloudflareDemoMode ? 'dist-cloudflare' : 'dist')
const staticFiles = cloudflareDemoMode ? [
  'cloudflare/static/index.html',
  'cloudflare/static/_headers',
] : demoMode ? [
  'demo/index.html',
  'demo/_headers',
  'demo/_routes.json',
  'demo/cassandre-demo.js',
  'vendor/supabase-2.45.4.min.js',
] : [
  '_headers',
  'app.js',
  'cgv.html',
  'confidentialite.html',
  'index.html',
  'manifest.webmanifest',
  'mentions-legales.html',
  'runtime-config.js',
  'sw.js',
  'icons',
  'legal',
  'vendor',
]

const missing = []
for (const file of staticFiles) {
  try {
    await stat(join(projectRoot, file))
  } catch {
    missing.push(file)
  }
}
if (missing.length) throw new Error(`Static build inputs missing: ${missing.join(', ')}`)

await rm(outputDir, { recursive: true, force: true })
await mkdir(outputDir, { recursive: true })
for (const file of staticFiles) {
  const outputName = cloudflareDemoMode
    ? file.replace(/^cloudflare\/static\//, '')
    : demoMode ? file.replace(/^demo\//, '') : file
  await cp(join(projectRoot, file), join(outputDir, outputName), { recursive: true })
}

console.log(demoMode
  ? 'Demo build copied the isolated beta page and browser auth client; Cloudflare Pages Functions are sourced from /functions. No regular Repwise backend integrations are included.'
  : cloudflareDemoMode
    ? 'Cloudflare build copied only the script-free static demo and headers to dist-cloudflare; no Supabase, Netlify, Stripe, WhatsApp, or AI backend is included.'
  : `Copied ${staticFiles.length} static inputs to dist; source/config files are excluded.`)
