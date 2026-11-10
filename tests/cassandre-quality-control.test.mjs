import test from 'node:test'
import assert from 'node:assert/strict'
import { qualityControlResult } from '../netlify/lib/cassandre-quality-control.mts'

test('quality control keeps a structured report with evidence', () => {
  const checked = qualityControlResult({
    summary: 'Six clients recorded recent sessions.',
    findings: [{ kind: 'verified', text: 'Six sessions in the selected period.', evidence: 'Server aggregate: sessions_30j=6' }],
    limitations: [],
  })
  assert.equal(checked.valid, true)
  assert.equal(checked.result.findings[0].kind, 'verified')
})

test('quality control downgrades a fact that has no evidence', () => {
  const checked = qualityControlResult({
    summary: 'The activity was reviewed.',
    findings: [{ kind: 'verified', text: 'There were six recent sessions.' }],
  })
  assert.equal(checked.valid, true)
  assert.equal(checked.result.findings[0].kind, 'unavailable')
})

test('quality control rejects malformed findings and claims of executed financial actions', () => {
  assert.equal(qualityControlResult({ summary: 'A sufficiently long summary.', findings: [null] }).valid, false)
  assert.equal(qualityControlResult({ summary: "J'ai payé le fournisseur.", findings: [] }).valid, false)
})
