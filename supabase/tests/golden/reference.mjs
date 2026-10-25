// Independent reference for the Phase 1 analysis formulas F1–F5 (QA-001, #37).
//
// Written from PRD §20.2/§20.7 and decisions CALC-1..3, not from the SQL
// engine (migration 115), and in exact fractions (BigInt), so the golden
// values cannot inherit the engine's rounding or its bugs.
//
//   F1 period mean       mean of scored values; shown when recorded / active >= 1/2,
//                        active = scored + missing (not_applicable and exempt leave it)
//   F2 subject mean      scored values in the last 6 submitted periods; needs 2 (CALC-2)
//   F3 period change     vs the last earlier period with a shown mean (CALC-3)
//   F4 subject change    latest period vs the last earlier period with a value
//   F5 rolling mean      periods t, t-1, t-2 (by sequence) all shown
//   direction            |change| < 0.25 x (max - min) / 10 is "same" (CALC-1)

export class Q {
  constructor(n, d = 1n) {
    if (d === 0n) throw new Error('division by zero')
    if (d < 0n) { n = -n; d = -d }
    const g = gcd(n < 0n ? -n : n, d)
    this.n = n / g
    this.d = d / g
  }
  static of(value) {
    if (value instanceof Q) return value
    const text = String(value)
    const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(text)
    if (!match) throw new Error(`not a decimal: ${text}`)
    const decimals = match[3] ?? ''
    const n = BigInt(match[2] + decimals) * (match[1] ? -1n : 1n)
    return new Q(n, 10n ** BigInt(decimals.length))
  }
  add(o) { o = Q.of(o); return new Q(this.n * o.d + o.n * this.d, this.d * o.d) }
  sub(o) { o = Q.of(o); return new Q(this.n * o.d - o.n * this.d, this.d * o.d) }
  mul(o) { o = Q.of(o); return new Q(this.n * o.n, this.d * o.d) }
  div(o) { o = Q.of(o); return new Q(this.n * o.d, this.d * o.n) }
  cmp(o) { o = Q.of(o); const l = this.n * o.d, r = o.n * this.d; return l < r ? -1 : l > r ? 1 : 0 }
  abs() { return new Q(this.n < 0n ? -this.n : this.n, this.d) }
  toString() { return this.d === 1n ? `${this.n}` : `${this.n}/${this.d}` }
  toNumber() { return Number(this.n) / Number(this.d) }
}
function gcd(a, b) { while (b) [a, b] = [b, a % b]; return a || 1n }

const sum = (values) => values.reduce((total, value) => total.add(value), new Q(0n))
const mean = (values) => sum(values).div(new Q(BigInt(values.length)))

/**
 * months: [{ seq, lines: { subject: number | 'missing' | 'not_applicable' | 'exempt' } }]
 * scale:  { min, max }
 * Returns { periods: [...], subjects: { name: {...} } } with exact fractions as strings.
 */
export function analyse(months, scale, { window = 6, coverageMin = new Q(1n, 2n), band = new Q(1n, 4n) } = {}) {
  const ordered = [...months].sort((a, b) => a.seq - b.seq)
  const k = Q.of(scale.max).sub(scale.min).div(10)
  const sameBand = band.mul(k)
  const direction = (change) => (change.abs().cmp(sameBand) < 0 ? 'same' : change.cmp(0) > 0 ? 'up' : 'down')

  const shown = new Map()
  const periods = []
  let previous = null
  for (const month of ordered) {
    const statuses = Object.values(month.lines)
    const values = statuses.filter((v) => typeof v === 'number').map((v) => Q.of(v))
    const missing = statuses.filter((v) => v === 'missing').length
    const active = values.length + missing
    const coverage = active ? new Q(BigInt(values.length), BigInt(active)) : null
    const valid = coverage !== null && values.length > 0 && coverage.cmp(coverageMin) >= 0
    const m = valid ? mean(values) : null
    let change = null
    let rolling = null
    if (m) {
      if (previous) {
        const delta = m.sub(previous.mean)
        change = { value: delta.toString(), direction: direction(delta), compared_seq: previous.seq, skipped: month.seq - previous.seq - 1 }
      }
      if (shown.has(month.seq - 1) && shown.has(month.seq - 2)) rolling = mean([m, shown.get(month.seq - 1), shown.get(month.seq - 2)]).toString()
      shown.set(month.seq, m)
      previous = { seq: month.seq, mean: m }
    }
    periods.push({
      seq: month.seq, recorded: values.length, active, missing,
      coverage: coverage?.toString() ?? null, mean: m?.toString() ?? null, change, rolling,
    })
  }

  const windowSeqs = ordered.slice(-window).map((month) => month.seq)
  const latest = ordered.at(-1)
  const subjects = {}
  for (const name of Object.keys(latest?.lines ?? {})) {
    const valueAt = (month) => (typeof month.lines[name] === 'number' ? Q.of(month.lines[name]) : null)
    const inWindow = ordered.filter((month) => windowSeqs.includes(month.seq)).map(valueAt).filter(Boolean)
    let change = null
    const now = valueAt(latest)
    if (now) {
      const before = ordered.filter((month) => month.seq < latest.seq && valueAt(month)).at(-1)
      if (before) {
        const delta = now.sub(valueAt(before))
        change = { value: delta.toString(), direction: direction(delta), compared_seq: before.seq }
      }
    }
    subjects[name] = { n: inWindow.length, mean: inWindow.length >= 2 ? mean(inWindow).toString() : null, change }
  }
  return { periods, subjects }
}

/** "43/6" or "7" -> number, for comparing with the engine's numeric output. */
export const toNumber = (fraction) => {
  if (fraction === null || fraction === undefined) return null
  const [n, d = '1'] = String(fraction).split('/')
  return Number(BigInt(n)) / Number(BigInt(d))
}
