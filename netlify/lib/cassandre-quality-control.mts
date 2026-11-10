const forbiddenClaims = [/\b(?:j'ai payé|paiement effectué|remboursement effectué|prix modifié)(?=$|[\s.,!?;:])/i]

export function qualityControlResult(value: unknown) {
  if (!value || typeof value !== 'object') return { valid: false, reason: 'invalid_result_shape' }
  const result = value as Record<string, unknown>
  if (typeof result.summary !== 'string' || result.summary.trim().length < 8 || result.summary.length > 4000 || !Array.isArray(result.findings)) {
    return { valid: false, reason: 'summary_or_findings_invalid' }
  }
  if (forbiddenClaims.some(pattern => pattern.test(result.summary as string))) return { valid: false, reason: 'unsafe_claim' }
  if (result.findings.length > 20) return { valid: false, reason: 'too_many_findings' }
  const findings = result.findings.flatMap((item: any) => {
    if (!item || typeof item.text !== 'string' || !item.text.trim()) return []
    const kind = ['verified','estimate','unavailable','recommendation'].includes(item.kind) ? item.kind : 'unavailable'
    const evidence = typeof item.evidence === 'string' && item.evidence.trim() ? item.evidence.trim().slice(0, 500) : null
    return [{ kind: kind === 'verified' && !evidence ? 'unavailable' : kind, text: item.text.trim().slice(0, 1200), evidence }]
  })
  if (findings.length !== result.findings.length) return { valid: false, reason: 'malformed_finding' }
  return { valid: true, result: { summary: result.summary.trim(), findings, limitations: Array.isArray(result.limitations) ? result.limitations.slice(0,10).map(x=>String(x).slice(0,500)) : [] } }
}
