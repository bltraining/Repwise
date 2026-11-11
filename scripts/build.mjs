import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const demoMode = process.argv.includes('--demo')
const cloudflareDemoMode = process.argv.includes('--cloudflare-demo')
const outputDir = resolve(projectRoot, cloudflareDemoMode ? 'dist-cloudflare' : 'dist')
const staticFiles = cloudflareDemoMode ? [
  'index.html',
  'app.js',
  'cgv.html',
  'confidentialite.html',
  'mentions-legales.html',
  'manifest.webmanifest',
  'icons',
  'legal',
  'cloudflare/static/_headers',
  'cloudflare/static/runtime-config.js',
  'cloudflare/static/preview-mode.js',
  'cloudflare/static/sw.js',
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

if (cloudflareDemoMode) {
  const htmlFiles = ['index.html', 'cgv.html', 'confidentialite.html', 'mentions-legales.html']
  for (const file of htmlFiles) {
    const path = join(outputDir, file)
    let html = await readFile(path, 'utf8')
    html = html.replace('<script src="/vendor/supabase-2.45.4.min.js"></script>', '')
      .replace(/<div id="runtimeConfigFailure"[\s\S]*?<\/div>/, '')
      .replace(/cassandre/g, 'repwiseAssistant')
      .replace(/Cassandre/g, 'Assistant Repwise')
      .replaceAll('href="/cgv"', 'href="/cgv.html"')
      .replaceAll('href="/confidentialite"', 'href="/confidentialite.html"')
      .replaceAll('href="/mentions-legales"', 'href="/mentions-legales.html"')
    await writeFile(path, html)
  }

  const appPath = join(outputDir, 'app.js')
  let app = await readFile(appPath, 'utf8')
  app = app.replace('if(b.dataset.v==="x"&&window.loadCassandre)window.loadCassandre()', '')
    .replace('var CFG=window.REPW_SUPABASE_CONFIG;', 'var CFG=null;')
    .replace('SB=window.supabase?window.supabase.createClient(CFG.url,CFG.key):null,LIVE=!!SB', 'SB=null,LIVE=false')
    .replace('initCassandreAccess();', '')

  const privateFlagsStart = app.indexOf('var CASSANDRE_READ_ONLY=')
  const privateFlagsEnd = app.indexOf('\nfunction toast', privateFlagsStart)
  if (privateFlagsStart < 0 || privateFlagsEnd < 0) throw new Error('Cloudflare preview could not isolate assistant controls')
  app = app.slice(0, privateFlagsStart) + app.slice(privateFlagsEnd + 1)

  const privateUiStart = app.indexOf('function casEl(')
  const privateUiEnd = app.indexOf('function refreshPremium()', privateUiStart)
  if (privateUiStart < 0 || privateUiEnd < 0) throw new Error('Cloudflare preview could not isolate assistant UI logic')
  app = app.slice(0, privateUiStart) + app.slice(privateUiEnd)
  if (/cassandre/i.test(app)) throw new Error('Internal assistant identifier leaked into the public app bundle')
  await writeFile(appPath, app)
}

console.log(demoMode
  ? 'Demo build copied the isolated beta page and browser auth client; Cloudflare Pages Functions are sourced from /functions. No regular Repwise backend integrations are included.'
  : cloudflareDemoMode
    ? 'Cloudflare build copied the original Repwise interface and legal/static assets in preview mode; Supabase and all backend integrations are disabled.'
  : `Copied ${staticFiles.length} static inputs to dist; source/config files are excluded.`)
