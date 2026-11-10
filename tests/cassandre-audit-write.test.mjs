import test from 'node:test'
import assert from 'node:assert/strict'
import { buildAuditWrite, buildPrivateRpcCall } from '../netlify/lib/cassandre-private-api.mjs'

test('audit write routes to cassandre_private_api with the audit_log table', () => {
  const write = buildAuditWrite('00000000-0000-4000-8000-000000000001', 'founder_access_denied', 'cassandre_access', 'founder', { reason: 'test' })
  assert.equal(write.path, 'cassandre_private/audit_log')
  const call = buildPrivateRpcCall(write.path, write.init)

  assert.deepEqual(call, {
    endpoint: 'rpc/cassandre_private_api',
    body: {
      p_table: 'audit_log',
      p_method: 'POST',
      p_params: {},
      p_body: {
    actor: '00000000-0000-4000-8000-000000000001',
        action: 'founder_access_denied',
        target_type: 'cassandre_access',
        target_id: 'founder',
        details: { reason: 'test' },
      },
    },
  })
})

test('other private-table reads use the same RPC adapter', () => {
  const call = buildPrivateRpcCall('cassandre_private/tasks?select=status&limit=500')
  assert.equal(call.endpoint, 'rpc/cassandre_private_api')
  assert.deepEqual(call.body, {
    p_table: 'tasks',
    p_method: 'GET',
    p_params: { select: 'status', limit: '500' },
    p_body: null,
  })
  assert.equal(buildPrivateRpcCall('cassandre_private.tasks?select=status'), null)
})
