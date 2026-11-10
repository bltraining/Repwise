import type { Config } from '@netlify/functions'
import { db, internalTokenMatches, newId } from '../lib/cassandre.mts'
import { getEnv, handleError, json } from '../lib/billing.mts'
import { synthesizeCassandreRequest } from '../lib/cassandre-synthesis.mts'

export default async (req: Request) => {
  if (!internalTokenMatches(req)) return json({ error: 'Non autorisé' }, 401)
  try {
    const { request_id: requestId } = await req.json() as { request_id?: string }
    const owner = getEnv('CASSANDRE_OWNER_USER_ID')
    if (!owner || !requestId || !/^[0-9a-f-]{36}$/i.test(requestId)) return json({ error: 'Demande invalide' }, 400)
    const [request] = await db<Array<{ id: string; status: string }>>(`cassandre_private/requests?select=id,status&id=eq.${encodeURIComponent(requestId)}&owner_user_id=eq.${encodeURIComponent(owner)}&limit=1`)
    if (!request) return json({ error: 'Demande introuvable' }, 404)
    await synthesizeCassandreRequest(requestId, owner, newId(), req.url)
    return new Response(null, { status: 202 })
  } catch (err) { return handleError(err) }
}
export const config: Config = { path: '/.netlify/functions/cassandre-synthesize-background', method: 'POST', background: true }
