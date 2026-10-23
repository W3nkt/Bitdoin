// Score input rules shared by the entry form (SCORE-001/003). The database
// applies the same checks (migration 114); this gives instant feedback.

export interface ScaleRule {
  family: 'numeric_linear' | 'ordinal' | 'pass_fail'
  min: number | null
  max: number | null
  step: number | null
  decimals: number
  levels?: { code: string; label_lo?: string; label_en?: string }[] | null
}

export type LineStatus = 'scored' | 'missing' | 'not_applicable' | 'exempt'

/** Lao digits ໐–໙ -> 0–9; trims spaces; a decimal comma becomes a point. */
export function normaliseScoreText(text: string) {
  return text
    .replace(/[໐-໙]/g, digit => String(digit.charCodeAt(0) - 0x0ed0))
    .replace(',', '.')
    .trim()
}

export type ScoreCheck =
  | { ok: true; value: number | string }
  | { ok: false; reason: 'empty' | 'not_number' | 'range' | 'level' }

export function checkScore(text: string, scale: ScaleRule): ScoreCheck {
  const value = normaliseScoreText(text)
  if (!value) return { ok: false, reason: 'empty' }

  if (scale.family !== 'numeric_linear') {
    const level = scale.levels?.find(item => item.code.toLowerCase() === value.toLowerCase())
    return level ? { ok: true, value: level.code } : { ok: false, reason: 'level' }
  }

  if (!/^\d+(\.\d+)?$/.test(value)) return { ok: false, reason: 'not_number' }
  const number = Number(value)
  const min = scale.min ?? 0
  const max = scale.max ?? 10
  const decimals = value.includes('.') ? value.split('.')[1].length : 0
  // Compare in integer units to avoid binary floating-point error.
  const factor = 10 ** Math.max(decimals, scale.decimals, 2)
  const offsetUnits = Math.round((number - min) * factor)
  const stepUnits = scale.step ? Math.round(scale.step * factor) : 0
  if (number < min || number > max || decimals > scale.decimals || (stepUnits > 0 && offsetUnits % stepUnits !== 0)) {
    return { ok: false, reason: 'range' }
  }
  return { ok: true, value: number }
}

/** "0", "10", "0.5" — trims trailing zeros the database sends (e.g. "7.50"). */
export function plainNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return ''
  return String(Number(value))
}
