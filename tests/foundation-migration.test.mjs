import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'

const dir = new URL('../supabase/migrations/', import.meta.url)
const files = (await readdir(dir)).filter((name) => name.endsWith('.sql')).sort()
const foundationName = '20261103000000_repwise_cassandre_foundation.sql'
const firstName = '20261104202211_ai_generation_quota_and_webhook_idempotency_and_coach_premium_cleanup.sql'
const secondName = '20261109091437_cassandre_orchestration_whatsapp.sql'
const foundation = await readFile(new URL(foundationName, dir), 'utf8')
const first = await readFile(new URL(firstName, dir), 'utf8')
const second = await readFile(new URL(secondName, dir), 'utf8')

test('foundation precedes both migrations and prepares their referenced schema', () => {
  assert.ok(files.indexOf(foundationName) < files.indexOf(firstName))
  assert.ok(files.indexOf(foundationName) < files.indexOf(secondName))
  for (const pattern of [
    /create table public\.profils/i,
    /create table public\.programmes/i,
    /create table public\.exercices_programme/i,
    /create table public\.exercices\s*\(/i,
    /create table public\.questionnaires_programme/i,
    /create table public\.stripe_webhook_events/i,
    /unique\(client_id,date_jour\)/i,
    /create table cassandre_private\.agents/i,
    /create table cassandre_private\.tasks/i,
    /create table cassandre_private\.decisions/i,
    /create table cassandre_private\.daily_reports/i,
    /create table cassandre_private\.audit_log/i,
    /cassandre_save_report\(jsonb\)/i,
  ]) assert.match(foundation, pattern)
  assert.match(first, /public\.exercices_programme/i)
  assert.match(first, /questionnaire_id/i)
  assert.match(second, /cassandre_private\.tasks/i)
})

test('foundation grants backend-only access and contains no copied user records', () => {
  assert.match(foundation, /enable row level security/i)
  assert.match(foundation, /revoke all on public\.profils[\s\S]*from public, anon, authenticated/i)
  assert.match(foundation, /grant execute on function public\.cassandre_save_report\(jsonb\) to service_role/i)
  assert.doesNotMatch(foundation, /insert into public\.(profils|programmes|bilans|journal_repas)/i)
})
