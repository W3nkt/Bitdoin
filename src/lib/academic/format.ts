// Display rules for My Scores numbers (PRD §19.3). The analysis engine
// stores full precision; only the UI rounds.

/** Rounds half away from zero, so -0.25 -> -0.3 and 0.25 -> 0.3 at 1 decimal. */
export function roundHalfAwayFromZero(value: number, decimals: number) {
  const factor = 10 ** decimals
  // EPSILON absorbs binary error such as 1.005 * 100 = 100.49999...
  return (Math.sign(value) * Math.round(Math.abs(value) * factor + Number.EPSILON * factor)) / factor
}

/** Decimals for means: 1 on 0–10 scales, whole numbers on 0–100 (and wider) scales. */
export function meanDecimals(scale: { min: number | null; max: number | null }) {
  const range = (scale.max ?? 10) - (scale.min ?? 0)
  return range >= 100 ? 0 : 1
}

export function formatMean(value: number | string | null | undefined, scale: { min: number | null; max: number | null }) {
  if (value === null || value === undefined || value === '') return null
  const decimals = meanDecimals(scale)
  return roundHalfAwayFromZero(Number(value), decimals).toFixed(decimals)
}
