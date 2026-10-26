// Grounding checks and fallbacks for the Coach's academic mode (P3-AI #53:
// AI-001, AI-003, AI-009). Pure, so scripts/test-coach.mjs runs it directly.
//
// Every number in an answer must come from the student's data (or the
// question): values, averages and changes as stored or rounded to one
// decimal place, counts of scores, months still needed, the scale and the
// school year. Small counts (0–5) are always allowed. An answer that fails is
// retried once; if it fails again the student gets a deterministic answer.

type Lang = 'en' | 'lo'

export interface CoachContext {
  snapshot_id?: string
  detail_locked?: boolean
  enrolment?: { academic_year?: string; grade?: string } | null
  scale?: { min?: number; max?: number; step?: number; family?: string } | null
  months?: { month_en: string; month_lo: string; average: number | null; change: number | null }[]
  subjects?: {
    subject_en: string; subject_lo: string
    scores: { month_en: string; month_lo: string; score: number | string | null; status: string }[]
    number_of_scores: number; average: number | null; latest: number | string | null; change: number | null
    label?: string | null; trend?: string | null
  }[]
  goals?: { subject_en: string; target: number; by_en: string; feasibility: string }[]
}

const LAO_DIGITS = /[໐-໙]/g
const toWestern = (text: string) => text.replace(LAO_DIGITS, (d) => String(d.charCodeAt(0) - 0x0ed0))

/** Numbers written in a text (Lao digits and decimal commas accepted). */
export function numbersIn(text: string): number[] {
  const found: number[] = []
  for (const match of toWestern(text).matchAll(/(?<![\d.,])-?\d+(?:[.,]\d+)?(?![\d])/g)) {
    const value = Number(match[0].replace(',', '.'))
    if (Number.isFinite(value)) found.push(Math.abs(value))
  }
  return found
}

function collect(value: unknown, into: Set<number>) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const v = Math.abs(value)
    into.add(v)
    into.add(Math.round(v * 10) / 10)
    into.add(Math.round(v * 100) / 100)
  } else if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value)) {
    collect(Number(value), into)
  } else if (typeof value === 'string') {
    for (const n of numbersIn(value)) into.add(n)
  } else if (Array.isArray(value)) {
    value.forEach((item) => collect(item, into))
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collect(item, into))
  }
}

export function allowedNumbers(context: CoachContext, question = ''): Set<number> {
  const allowed = new Set<number>([0, 1, 2, 3, 4, 5])
  collect({ ...context, snapshot_id: undefined }, allowed)
  for (const subject of context.subjects ?? []) allowed.add(Math.max(0, 3 - subject.number_of_scores))
  for (const n of numbersIn(question)) allowed.add(n)
  return allowed
}

/** AI-003: numbers the answer states that the data do not support. */
export function unsupportedNumbers(answer: string, context: CoachContext, question = ''): number[] {
  const allowed = allowedNumbers(context, question)
  return numbersIn(answer).filter((n) => ![...allowed].some((a) => Math.abs(a - n) < 0.001))
}

const fmt = (value: number | string | null | undefined) => (value === null || value === undefined ? '' : String(Math.round(Number(value) * 100) / 100))

/** The student's data as the model sees it, in their language, without ids. */
export function dataBlock(context: CoachContext, lang: Lang): string {
  const month = (m: { month_en: string; month_lo: string }) => (lang === 'lo' ? m.month_lo : m.month_en)
  return JSON.stringify({
    school_year: context.enrolment?.academic_year, grade: context.enrolment?.grade,
    scale: context.scale ? { min: context.scale.min, max: context.scale.max, step: context.scale.step } : null,
    monthly_average: (context.months ?? []).map((m) => ({ month: month(m), average: m.average, change_from_previous: m.change })),
    subjects: (context.subjects ?? []).map((s) => ({
      subject: lang === 'lo' ? s.subject_lo : s.subject_en,
      scores: s.scores.map((p) => ({ month: month(p), score: p.status === 'scored' ? p.score : p.status })),
      number_of_scores: s.number_of_scores, average: s.average, latest: s.latest, change: s.change,
      compared_with_own_average: s.label ?? null, trend: s.trend ?? null,
    })),
    goals: context.goals ?? [],
  })
}

/** AI-009 fallback: a plain summary of the latest month from the snapshot only. */
export function deterministicSummary(context: CoachContext, lang: Lang): string {
  const months = (context.months ?? []).filter((m) => m.average !== null)
  const latest = months.at(-1)
  if (!latest) {
    return lang === 'lo' ? 'ຍັງບໍ່ມີຄະແນນພໍທີ່ຈະສະຫຼຸບ. ປ້ອນຄະແນນເດືອນນີ້ກ່ອນ.' : 'There are not enough scores to summarise yet. Enter this month’s scores first.'
  }
  const name = lang === 'lo' ? latest.month_lo : latest.month_en
  const previous = months.at(-2)
  const scored = (context.subjects ?? []).map((s) => {
    const point = s.scores.filter((p) => p.status === 'scored' && p.score !== null).at(-1)
    return point && (lang === 'lo' ? point.month_lo : point.month_en) === name ? { subject: lang === 'lo' ? s.subject_lo : s.subject_en, score: Number(point.score) } : null
  }).filter((x): x is { subject: string; score: number } => !!x).sort((a, b) => b.score - a.score)
  const attention = (context.subjects ?? []).find((s) => s.label === 'relatively_lower')
  const change = latest.change === null || !previous ? '' : lang === 'lo'
    ? ` (${latest.change > 0 ? 'ຂຶ້ນ' : latest.change < 0 ? 'ລົງ' : 'ເທົ່າເກົ່າ'} ${fmt(Math.abs(latest.change))} ຈາກ ${previous.month_lo})`
    : ` (${latest.change > 0 ? 'up' : latest.change < 0 ? 'down' : 'no change'} ${fmt(Math.abs(latest.change))} from ${previous.month_en})`
  const parts = lang === 'lo'
    ? [`ໃນ ${name}, ຄ່າສະເລ່ຍຂອງເຈົ້າແມ່ນ ${fmt(latest.average)}${change}.`,
       scored.length > 1 ? `ສູງສຸດ: ${scored[0].subject} ${fmt(scored[0].score)}; ຕ່ຳສຸດ: ${scored.at(-1)!.subject} ${fmt(scored.at(-1)!.score)}.` : '',
       attention ? `ຂັ້ນຕໍ່ໄປ: ລອງແບບທົດສອບສັ້ນໆ ຂອງ ${attention.subject_lo} ເພື່ອຊອກຫາບົດທີ່ຄວນຝຶກ.` : 'ຂັ້ນຕໍ່ໄປ: ປ້ອນຄະແນນທຸກເດືອນ ເພື່ອເບິ່ງແນວໂນ້ມຂອງເຈົ້າ.']
    : [`In ${name}, your average was ${fmt(latest.average)}${change}.`,
       scored.length > 1 ? `Highest: ${scored[0].subject} ${fmt(scored[0].score)}; lowest: ${scored.at(-1)!.subject} ${fmt(scored.at(-1)!.score)}.` : '',
       attention ? `Next step: try the short quiz for ${attention.subject_en} to find which topics to practise.` : 'Next step: keep entering your scores each month to see your pattern.']
  return parts.filter(Boolean).join(' ')
}

/** Shown when an answer's numbers cannot be checked twice in a row. */
export function groundedFallback(context: CoachContext, lang: Lang): string {
  const intro = lang === 'lo'
    ? 'ຂ້ອຍບໍ່ແນ່ໃຈພໍກັບຕົວເລກໃນຄຳຕອບນັ້ນ, ສະນັ້ນນີ້ແມ່ນສິ່ງທີ່ຄະແນນຂອງເຈົ້າສະແດງແທ້ໆ:'
    : 'I wasn’t sure enough about the numbers in that answer, so here is what your scores actually show:'
  return `${intro} ${deterministicSummary(context, lang)}`
}

/** Words for the summary length check (Lao has no spaces: about 4 characters a word). */
export function wordCount(text: string): number {
  const lao = (text.match(/[຀-໿]/g) ?? []).length
  const other = text.replace(/[຀-໿]/g, ' ').split(/\s+/).filter(Boolean).length
  return other + Math.ceil(lao / 4)
}
