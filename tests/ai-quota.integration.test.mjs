import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'

const url = process.env.REPWISE_TEST_SUPABASE_URL || ''
const serviceKey = process.env.REPWISE_TEST_SUPABASE_SERVICE_ROLE_KEY || ''
const coachId = process.env.REPWISE_TEST_COACH_ID || ''
const clientId = process.env.REPWISE_TEST_CLIENT_ID || ''
let safeLocalTestDb = false
try {
  const host = new URL(url).hostname
  safeLocalTestDb = ['localhost', '127.0.0.1'].includes(host)
    && new URL(url).port === '54321'
    && serviceKey.length > 0
    && coachId.length > 0
    && clientId.length > 0
} catch {}

async function rpc(name, body) {
  const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`Local quota RPC failed (${response.status})`)
  return response.json()
}

test('quota local: dix réservations passent, la onzième est refusée', { skip: !safeLocalTestDb }, async () => {
  const reservations = []
  try {
    for (let i = 0; i < 10; i++) {
      const result = await rpc('reserve_coach_ai_generation', {
        p_coach_id: coachId,
        p_requester_id: coachId,
        p_client_id: clientId,
        p_request_key: randomUUID(),
      })
      assert.equal(result[0]?.accepted, true, `reservation ${i + 1}`)
      reservations.push(result[0].reservation_id)
    }
    const eleventh = await rpc('reserve_coach_ai_generation', {
      p_coach_id: coachId,
      p_requester_id: coachId,
      p_client_id: clientId,
      p_request_key: randomUUID(),
    })
    assert.equal(eleventh[0]?.accepted, false)
    assert.equal(eleventh[0]?.reason, 'daily_limit_reached')
  } finally {
    await Promise.all(reservations.map((id) => rpc('release_coach_ai_generation', {
      p_reservation_id: id,
      p_requester_id: coachId,
      p_error_code: 'test_cleanup',
    })))
  }
})

test('quota local: les appels simultanés ne réservent jamais plus de dix places', { skip: !safeLocalTestDb }, async () => {
  const keys = Array.from({ length: 11 }, () => randomUUID())
  const results = await Promise.all(keys.map((p_request_key) => rpc('reserve_coach_ai_generation', {
    p_coach_id: coachId,
    p_requester_id: coachId,
    p_client_id: clientId,
    p_request_key,
  })))
  const accepted = results.map((rows) => rows[0]).filter((row) => row?.accepted)
  try {
    assert.equal(accepted.length, 10)
    assert.equal(results.filter((rows) => rows[0]?.reason === 'daily_limit_reached').length, 1)
  } finally {
    await Promise.all(accepted.map((row) => rpc('release_coach_ai_generation', {
      p_reservation_id: row.reservation_id,
      p_requester_id: coachId,
      p_error_code: 'test_cleanup',
    })))
  }
})
