import { cp, mkdir, rm, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputDir = resolve(projectRoot, 'dist')
const demoMode = process.argv.includes('--demo')
const staticFiles = demoMode ? [
  'demo/index.html',
  'demo/_headers',
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
  const outputName = demoMode ? file.replace(/^demo\//, '') : file
  await cp(join(projectRoot, file), join(outputDir, outputName), { recursive: true })
}

console.log(demoMode
  ? 'Demo build copied only its static page and restrictive headers; no app code, functions, or integrations are included.'
  : `Copied ${staticFiles.length} static inputs to dist; source/config files are excluded.`)
