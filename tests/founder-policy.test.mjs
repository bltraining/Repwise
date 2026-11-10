import test from 'node:test'
import assert from 'node:assert/strict'
import { isConfiguredFounder } from '../netlify/lib/founder-policy.mjs'

const founderId = '00000000-0000-4000-8000-000000000001'
const otherUserId = '00000000-0000-4000-8000-000000000002'

test('only the authenticated configured owner identity is accepted', () => {
  assert.equal(isConfiguredFounder(founderId, founderId), true)
  assert.equal(isConfiguredFounder(otherUserId, founderId), false)
  assert.equal(isConfiguredFounder('', founderId), false)
  assert.equal(isConfiguredFounder(founderId, ''), false)
  assert.equal(isConfiguredFounder(founderId, undefined), false)
})
