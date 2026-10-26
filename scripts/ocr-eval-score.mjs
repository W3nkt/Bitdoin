// Scoring for the score-book OCR evaluation (AI-010, QG-3; used by
// scripts/ocr-eval.mjs and checked by scripts/test-ocr-extract.mjs).
//
// Each labelled field (one subject on one photo) is compared with what the
// extraction read for it, using the same confidence bands as the review screen:
//   flagged = no value, or confidence below the "clear" threshold (0.85)
//   correct = the value read equals the label (blank labels expect no value)
//   silent  = not flagged and not correct: a wrong value the student would
//             see as clear. QG-3 caps these at 2% of all fields.
// Numeric accuracy counts correct values on photos labelled clear, among
// fields with a value; flag recall is the share of wrong fields flagged.

export const GATES = { accuracy: 0.9, silent: 0.02, recall: 0.98 }

const norm = (s) => String(s ?? '').normalize('NFC').toLowerCase().replace(/[\s\p{P}]/gu, '')

function levenshtein(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const next = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = row[j]
      row[j] = next
    }
  }
  return row[b.length]
}

/** Similarity 0..1 of two subject names after normalising (1 = same). */
export function nameSimilarity(a, b) {
  const x = norm(a)
  const y = norm(b)
  if (!x || !y) return 0
  if (x === y) return 1
  return 1 - levenshtein(x, y) / Math.max(x.length, y.length)
}

/** The extraction column for the labelled month (or the one that matches most subjects). */
export function pickColumn(extraction, label) {
  const periods = extraction?.periods ?? []
  if (periods.length <= 1) return periods[0] ?? null
  const byMonth = periods.find((p) => label.month && p.period_guess?.month === label.month)
  if (byMonth) return byMonth
  const subjects = Object.keys(label.truth)
  const matches = (p) => subjects.filter((s) => p.rows.some((r) => nameSimilarity(r.subject_raw, s) >= 0.85)).length
  return [...periods].sort((a, b) => matches(b) - matches(a))[0]
}

/** Field outcomes for one labelled photo. */
export function scoreImage(extraction, label, thresholds = { clear: 0.85 }) {
  const column = pickColumn(extraction, label)
  const rows = [...(column?.rows ?? [])]
  return Object.entries(label.truth).map(([subject, truth]) => {
    let best = -1
    let bestScore = 0
    rows.forEach((row, i) => {
      const score = nameSimilarity(row.subject_raw, subject)
      if (score > bestScore) { bestScore = score; best = i }
    })
    const row = best >= 0 && bestScore >= 0.85 ? rows.splice(best, 1)[0] : null
    const value = row?.score_value ?? null
    const confidence = row ? row.score_confidence : 0
    const expected = truth === null || truth === undefined ? null : Number(truth)
    const correct = expected === null ? value === null : value !== null && Math.abs(value - expected) < 1e-9
    const flagged = value === null || confidence < thresholds.clear
    return { file: label.file, subject, expected, value, confidence, clear_photo: label.clear !== false, found: !!row, correct, flagged, silent: !flagged && !correct }
  })
}

const ratio = (n, d) => (d ? n / d : null)

/** QG-3 summary over all fields. */
export function summarise(fields) {
  const numeric = fields.filter((f) => f.clear_photo && f.expected !== null)
  const wrong = fields.filter((f) => !f.correct)
  const silent = fields.filter((f) => f.silent)
  const accuracy = ratio(numeric.filter((f) => f.correct).length, numeric.length)
  const silentRate = ratio(silent.length, fields.length)
  const recall = wrong.length ? ratio(wrong.filter((f) => f.flagged).length, wrong.length) : 1
  return {
    fields: fields.length,
    clear_numeric_fields: numeric.length,
    wrong: wrong.length,
    silent: silent.length,
    accuracy,
    silent_rate: silentRate,
    flag_recall: recall,
    flag_rate: ratio(fields.filter((f) => f.flagged).length, fields.length),
    gates: {
      accuracy: accuracy !== null && accuracy >= GATES.accuracy,
      silent: silentRate !== null && silentRate <= GATES.silent,
      recall: recall !== null && recall >= GATES.recall,
    },
    silent_examples: silent.slice(0, 20).map(({ file, subject, expected, value, confidence }) => ({ file, subject, expected, value, confidence })),
  }
}

/** Width and height from a JPEG's start-of-frame marker, or null. */
export function jpegSize(bytes) {
  let i = 2
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) return null
    const marker = bytes[i + 1]
    const length = (bytes[i + 2] << 8) | bytes[i + 3]
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: (bytes[i + 5] << 8) | bytes[i + 6], width: (bytes[i + 7] << 8) | bytes[i + 8] }
    }
    i += 2 + length
  }
  return null
}

/**
 * Which unit the model's boxes use. The review screen draws crops assuming
 * photo pixels; Qwen3-VL may answer on a 0–1000 grid instead.
 */
export function bboxUnits(samples) {
  // On photos larger than 1000 px, pixel boxes reach past 1000 somewhere on the
  // page; grid boxes never do. Boxes outside the photo cannot be pixels.
  const boxes = samples.filter((s) => s.bbox && Math.max(s.width, s.height) > 1000)
  const beyondGrid = boxes.filter((s) => Math.max(...s.bbox) > 1000)
  const outsidePhoto = boxes.filter((s) => s.bbox[2] > s.width || s.bbox[3] > s.height)
  let verdict = 'unclear'
  if (!boxes.length) verdict = 'none'
  else if (outsidePhoto.length / boxes.length > 0.1) verdict = beyondGrid.length ? 'unclear' : 'grid_1000'
  else if (beyondGrid.length / boxes.length >= 0.1) verdict = 'pixels'
  else verdict = 'grid_1000'
  return { boxes: boxes.length, beyond_1000: beyondGrid.length, outside_photo: outsidePhoto.length, verdict }
}
