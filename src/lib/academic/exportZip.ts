// "Download my data" (PRIV-004): turns academic_export_my_data() into the
// files listed in Docs/my-scores/export-format.md and packs them into a ZIP
// in the browser. Nothing is stored on a server, so no download link has
// to expire. The ZIP is uncompressed ("stored"); the data is small.

export interface ExportData {
  format_version: number
  generated_at: string
  profile: Record<string, unknown>
  enrolments: Record<string, unknown>[]
  scores: Record<string, unknown>[]
  revisions: Record<string, unknown>[]
  consents: Record<string, unknown>[]
  /** Diagnostic quiz attempts (migration 132) and practice sets (137) with answers. */
  quizzes?: { attempts: Record<string, unknown>[]; practice: Record<string, unknown>[] }
  /** "Report a problem" reports the user sent (migration 133). */
  reports?: Record<string, unknown>[]
  /** Next actions shown and feedback on them (migration 138). */
  recommendations?: Record<string, unknown>
}

const SCORE_COLUMNS = [
  'academic_year', 'grade', 'period', 'period_type', 'period_start', 'subject_code', 'subject', 'status', 'raw_value',
  'ordinal_code', 'grading_scale', 'normalised_value', 'source', 'verification', 'entry_state', 'submitted_at', 'edited', 'score_line_id',
]
const REVISION_COLUMNS = ['score_line_id', 'old_value', 'new_value', 'old_status', 'new_status', 'changed_by', 'reason', 'changed_at']

function csvCell(value: unknown) {
  if (value === null || value === undefined) return ''
  let text = typeof value === 'object' ? JSON.stringify(value) : String(value)
  // Free text (reasons, names) must not run as a spreadsheet formula.
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** CSV with a UTF-8 byte-order mark so spreadsheet apps show Lao text correctly. */
export function toCsv(rows: Record<string, unknown>[], columns: string[]) {
  return '﻿' + [columns.join(','), ...rows.map(row => columns.map(column => csvCell(row[column])).join(','))].join('\r\n') + '\r\n'
}

export function exportFiles(data: ExportData) {
  const json = (value: unknown) => JSON.stringify(value, null, 2) + '\n'
  return [
    { name: 'profile.json', content: json({ format_version: data.format_version, generated_at: data.generated_at, ...data.profile }) },
    { name: 'enrolments.json', content: json(data.enrolments) },
    { name: 'scores.csv', content: toCsv(data.scores, SCORE_COLUMNS) },
    { name: 'revisions.csv', content: toCsv(data.revisions, REVISION_COLUMNS) },
    { name: 'consents.json', content: json(data.consents) },
    { name: 'quizzes.json', content: json(data.quizzes ?? { attempts: [], practice: [] }) },
    { name: 'reports.json', content: json(data.reports ?? []) },
    { name: 'recommendations.json', content: json(data.recommendations ?? { shown: [], feedback: [] }) },
  ]
}

// ─── Minimal ZIP writer (stored entries, UTF-8 names) ───────────────────────

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

export function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function dosDateTime(date: Date) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  return { time, day }
}

/** Packs text files into ZIP bytes. */
export function zip(files: { name: string; content: string }[], date = new Date()): Uint8Array {
  const encoder = new TextEncoder()
  const { time, day } = dosDateTime(date)
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0

  for (const file of files) {
    const name = encoder.encode(file.name)
    const data = encoder.encode(file.content)
    const crc = crc32(data)

    const local = new Uint8Array(30 + name.length + data.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true)
    lv.setUint16(6, 0x0800, true) // names are UTF-8
    lv.setUint16(8, 0, true) // stored
    lv.setUint16(10, time, true)
    lv.setUint16(12, day, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, data.length, true)
    lv.setUint32(22, data.length, true)
    lv.setUint16(26, name.length, true)
    lv.setUint16(28, 0, true)
    local.set(name, 30)
    local.set(data, 30 + name.length)
    locals.push(local)

    const central = new Uint8Array(46 + name.length)
    const cv = new DataView(central.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint16(8, 0x0800, true)
    cv.setUint16(10, 0, true)
    cv.setUint16(12, time, true)
    cv.setUint16(14, day, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, data.length, true)
    cv.setUint32(24, data.length, true)
    cv.setUint16(28, name.length, true)
    cv.setUint32(42, offset, true)
    central.set(name, 46)
    centrals.push(central)
    offset += local.length
  }

  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0)
  const end = new Uint8Array(22)
  const ev = new DataView(end.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, files.length, true)
  ev.setUint16(10, files.length, true)
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, offset, true)

  const out = new Uint8Array(offset + centralSize + end.length)
  let position = 0
  for (const part of [...locals, ...centrals, end]) {
    out.set(part, position)
    position += part.length
  }
  return out
}

/** Builds the export ZIP and starts the browser download. */
export function downloadExport(data: ExportData, fileName: string) {
  const bytes = zip(exportFiles(data))
  const url = URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: 'application/zip' }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
