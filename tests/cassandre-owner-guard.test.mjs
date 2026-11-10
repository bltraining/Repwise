import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../supabase/functions/cassandre-brain/index.ts', import.meta.url), 'utf8')

test('cassandre-brain requires a verified JWT and server-side owner UID', () => {
  assert.match(source, /db\.auth\.getUser\(jwt\)/)
  assert.match(source, /Deno\.env\.get\("CASSANDRE_OWNER_USER_ID"\)/)
  assert.match(source, /auth\.user\.id !== ownerUserId/)
  assert.match(source, /profile\?\.role !== "coach"/)
  assert.match(source, /founder_access_denied/)
})

test('request body cannot supply the founder identity', () => {
  assert.doesNotMatch(source, /req\.json\(\).*owner|body\.(owner|founder)|owner_user_id.*req\.json/s)
})
