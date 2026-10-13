// Member codes, e.g. BA-PRM-58JR23 (see migration 105). The 6 characters are
// stored on the user and never change; the plan part follows the current
// membership: PRY yearly, PRM monthly (any other paid plan), FRE otherwise.

export function memberCodePrefix(plan: { price_lak: number; interval: string } | null | undefined, paidActive: boolean) {
  if (!paidActive || !plan || plan.price_lak <= 0) return 'FRE'
  return plan.interval === 'year' ? 'PRY' : 'PRM'
}

export function formatMemberCode(code: string | null | undefined, prefix: string) {
  return code ? `BA-${prefix}-${code}` : null
}
