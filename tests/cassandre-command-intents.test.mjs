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
