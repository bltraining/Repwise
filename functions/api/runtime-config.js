const TEST_SUPABASE_URL = 'https://ahcdiqmxlblitbbbqxzo.supabase.co'

const json = (body, status = 200) => Response.json(body, {
  status,
  headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
})

export async function onRequestGet({ env }) {
  if (env.CASSANDRE_READ_ONLY_MODE !== 'true'
    || env.SUPABASE_URL !== TEST_SUPABASE_URL
    || !env.SUPABASE_PUBLISHABLE_KEY) {
    return json({ error: 'consultation_unavailable' }, 503)
  }
  return json({ url: TEST_SUPABASE_URL, publishableKey: env.SUPABASE_PUBLISHABLE_KEY })
}
