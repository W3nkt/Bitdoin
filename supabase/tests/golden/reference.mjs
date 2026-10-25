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
  /** "43/6" or "7", as written by toString(). */
  static parse(text) {
    const [n, d = '1'] = String(text).split('/')
    return new Q(BigInt(n), BigInt(d))
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

// ─── Phase 2: F6–F10 (P2-ANL, #49) ───────────────────────────────────────────
//
// Written from PRD §20.2–§20.6 and decisions CALC-4/CALC-5, not from the SQL
// engine (migration 129). Thresholds are on a 0–10 scale and scale with
// (max − min)/10 like the "about the same" band.
//
//   F6 relative deviation  d = x − M_t in window periods whose mean is shown; D = mean d
//   F7 consistency         share of those periods with d > 0 (stronger) or d < 0 (lower);
//                          d = 0 counts for neither side (CALC-5)
//   F8 variability         sample variance of the subject's scores in the enrolment (CALC-4)
//   F9 trend slope         Theil–Sen over (sequence, score) in the enrolment
//   F10 significance       Mann–Kendall S with tie correction; two-sided p from the
//                          continuity-corrected normal approximation
//   label                  §20.4 with n = periods that have a d; confidence §20.6
//   trend                  §20.5; confidence §20.6 (volatile is graded by n alone)

export const THRESHOLDS_V2 = {
  window_size: 6, label_min_n: 3, deviation: '0.75', consistency: '0.6',
  label_high_n: 6, label_high_factor: '1.5', label_high_consistency: '0.8', label_medium_n: 4,
  trend_min_n: 4, slope: '0.15', significance: 0.2, volatility_sd: '1',
  trend_high_n: 8, trend_high_p: 0.05, trend_medium_n: 6,
}

/** erfc by its Maclaurin series below 3 and its continued fraction above. */
export function erfc(x) {
  if (x < 3) {
    let term = x
    let total = x
    for (let n = 1; n < 3 || Math.abs(term) > 1e-17 * Math.abs(total); n++) {
      term *= (-x * x) / n
      total += term / (2 * n + 1)
    }
    return 1 - (2 / Math.sqrt(Math.PI)) * total
  }
  let f = x
  for (let k = 80; k >= 1; k--) f = x + k / 2 / f
  return Math.exp(-x * x) / Math.sqrt(Math.PI) / f
}

/** Two-sided Mann–Kendall p for values in time order. */
export function mannKendallP(values) {
  let s = 0
  for (let a = 0; a < values.length; a++) for (let b = a + 1; b < values.length; b++) s += values[b].cmp(values[a])
  const n = values.length
  const groups = new Map()
  for (const v of values) groups.set(v.toString(), (groups.get(v.toString()) ?? 0) + 1)
  let ties = 0
  for (const t of groups.values()) ties += t * (t - 1) * (2 * t + 5)
  const variance = (n * (n - 1) * (2 * n + 5) - ties) / 18
  if (s === 0 || variance <= 0) return 1
  return Math.min(1, erfc((Math.abs(s) - 1) / Math.sqrt(variance) / Math.SQRT2))
}

/** Median of the pairwise slopes, exact. points: [{ seq, x: Q }] */
export function theilSen(points) {
  const slopes = []
  for (let a = 0; a < points.length; a++) {
    for (let b = a + 1; b < points.length; b++) slopes.push(points[b].x.sub(points[a].x).div(points[b].seq - points[a].seq))
  }
  slopes.sort((l, r) => l.cmp(r))
  const mid = slopes.length >> 1
  return slopes.length % 2 ? slopes[mid] : slopes[mid - 1].add(slopes[mid]).div(2)
}

const grade = (n, high, t) => (high ? 'high' : n >= t ? 'medium' : 'low')

/**
 * Labels (F6/F7) and trends (F8–F10) per subject, for the same inputs as analyse().
 * Fractions as strings; p as a number.
 */
export function analyseSubjects(months, scale, t = THRESHOLDS_V2) {
  const ordered = [...months].sort((a, b) => a.seq - b.seq)
  const base = analyse(ordered, scale, { window: t.window_size })
  const means = new Map(base.periods.filter((p) => p.mean !== null).map((p) => [p.seq, Q.parse(p.mean)]))
  const windowSeqs = ordered.slice(-t.window_size).map((m) => m.seq)
  const k = Q.of(scale.max).sub(scale.min).div(10)
  const deviation = Q.of(t.deviation).mul(k)
  const highDeviation = deviation.mul(Q.of(t.label_high_factor))
  const slopeMin = Q.of(t.slope).mul(k)
  const sdMin = Q.of(t.volatility_sd).mul(k)

  const subjects = {}
  for (const name of Object.keys(ordered.at(-1)?.lines ?? {})) {
    const scored = ordered.filter((m) => typeof m.lines[name] === 'number').map((m) => ({ seq: m.seq, x: Q.of(m.lines[name]) }))

    const d = scored.filter((p) => windowSeqs.includes(p.seq) && means.has(p.seq)).map((p) => p.x.sub(means.get(p.seq)))
    const n = d.length
    const above = d.filter((v) => v.cmp(0) > 0).length
    const below = d.filter((v) => v.cmp(0) < 0).length
    const D = n ? mean(d) : null
    let label = 'insufficient_evidence'
    let side = null
    if (n >= t.label_min_n) {
      const share = Q.of(t.consistency).mul(n)
      if (D.cmp(deviation) >= 0 && share.cmp(above) <= 0) [label, side] = ['relatively_stronger', above]
      else if (D.cmp(deviation.mul(-1)) <= 0 && share.cmp(below) <= 0) [label, side] = ['relatively_lower', below]
      else label = 'neutral'
    }
    const labelConfidence = side === null ? null
      : grade(n, n >= t.label_high_n && D.abs().cmp(highDeviation) >= 0 && Q.of(t.label_high_consistency).mul(n).cmp(side) <= 0, t.label_medium_n)

    const m = scored.length
    let trend = { value: 'insufficient_evidence', confidence: null, n: m, slope: null, variance: null, p: null, direction: null }
    if (m >= t.trend_min_n) {
      const xs = scored.map((p) => p.x)
      const avg = mean(xs)
      const variance = sum(xs.map((x) => x.sub(avg).mul(x.sub(avg)))).div(m - 1)
      const slope = theilSen(scored)
      const p = mannKendallP(xs)
      const direction = slope.cmp(slopeMin) >= 0 ? 'up' : slope.cmp(slopeMin.mul(-1)) <= 0 ? 'down' : 'flat'
      let value = 'no_clear_trend'
      let confidence = null
      if (variance.cmp(sdMin.mul(sdMin)) >= 0) {
        value = 'volatile'
        confidence = grade(m, m >= t.trend_high_n, t.trend_medium_n)
      } else if (direction !== 'flat' && p < t.significance) {
        value = direction === 'up' ? 'improving' : 'declining'
        confidence = grade(m, m >= t.trend_high_n && p < t.trend_high_p, t.trend_medium_n)
      }
      trend = { value, confidence, n: m, slope: slope.toString(), variance: variance.toString(), p, direction }
    }

    subjects[name] = {
      label: { value: label, confidence: labelConfidence, n, mean_deviation: D?.toString() ?? null, above, below },
      trend,
    }
  }
  return subjects
}

/** "43/6" or "7" -> number, for comparing with the engine's numeric output. */
export const toNumber = (fraction) => {
  if (fraction === null || fraction === undefined) return null
  const [n, d = '1'] = String(fraction).split('/')
  return Number(BigInt(n)) / Number(BigInt(d))
}
