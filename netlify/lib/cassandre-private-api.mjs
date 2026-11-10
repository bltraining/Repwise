export function buildPrivateRpcCall(path, init = {}) {
  const prefix = 'cassandre_private/'
  if (!path.startsWith(prefix)) return null

  const resource = path.slice(prefix.length)
  const parsed = new URL(`https://cassandre.internal/${resource}`)
  const body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body || null
  return {
    endpoint: 'rpc/cassandre_private_api',
    body: {
      p_table: parsed.pathname.slice(1),
      p_method: (init.method || 'GET').toUpperCase(),
      p_params: Object.fromEntries(parsed.searchParams),
      p_body: body,
    },
  }
}

export function buildAuditWrite(actor, action, targetType, targetId, details = {}) {
  return {
    path: 'cassandre_private/audit_log',
    init: {
      method: 'POST',
      headers: { 'Content-Profile': 'cassandre_private', Prefer: 'return=minimal' },
      body: JSON.stringify({ actor, action, target_type: targetType, target_id: targetId, details }),
    },
  }
}
