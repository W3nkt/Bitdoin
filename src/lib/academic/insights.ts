// Subject labels, trends and their explanations on the dashboard (P2-ANL,
// #49): DASH-005 cards and ANALYSIS-004 templates. Pure functions over the
// analysis snapshot, so scripts/test-insights.mjs can run every template
// through the cause filter without a browser.
import type { Confidence, DashboardSubject, DashboardView } from './api'
import { formatMean } from './format'
import type { insightsCopy } from './insightsCopy'

// The two summary reasons shown without Premium live in entitlementCopy.ts.
export type InsightKey = keyof typeof insightsCopy | 'insights.reason.aboveSummary' | 'insights.reason.belowSummary'
export type InsightT = (key: InsightKey, vars?: Record<string, string | number>) => string
type Scale = DashboardView['scale']

/**
 * Words that would name a cause monthly scores cannot show: intelligence,
 * motivation, personality, health or learning difficulties (ANALYSIS-004).
 * Lower case, matched anywhere in a sentence.
 */
export const BANNED_CAUSE_TERMS = [
  'intelligen', 'clever', 'smart', 'stupid', 'lazy', 'laziness', 'motivat', 'effort', 'personality', 'talent', 'gifted',
  'abilit', ' iq', 'adhd', 'dyslexi', 'disorder', 'disabilit', 'illness', 'sick', 'health', 'depress', 'anxi',
  'attention deficit', 'concentrat', 'careless',
  'ສະຫຼາດ', 'ໂງ່', 'ຂີ້ຄ້ານ', 'ແຮງຈູງໃຈ', 'ບຸກຄະລິກ', 'ນິໄສ', 'ພອນສະຫວັນ', 'ສະຕິປັນຍາ', 'ຄວາມສາມາດ', 'ຄວາມພະຍາຍາມ',
  'ສຸຂະພາບ', 'ເຈັບປ່ວຍ', 'ພະຍາດ', 'ຜິດປົກກະຕິ', 'ຊຶມເສົ້າ', 'ກັງວົນ', 'ສະມາທິ',
]

/** The output filter: true when a sentence names a banned cause. */
export function namesCause(text: string) {
  const lower = ` ${text.toLowerCase()}`
  return BANNED_CAUSE_TERMS.some(term => lower.includes(term))
}

export type InsightState = 'hidden' | 'insufficient' | 'none' | 'ready'

/**
 * Subjects for the "Stronger" and "Needing attention" lists, largest
 * deviation first. 'hidden' when the snapshot has no labels (insights
 * switched off, engine v1 or an ordinal scale).
 */
export function selectInsights(view: DashboardView) {
  const labelled = view.subjects.filter(subject => subject.active && subject.label)
  const byDeviation = (a: DashboardSubject, b: DashboardSubject) =>
    Math.abs(Number(b.label!.mean_deviation)) - Math.abs(Number(a.label!.mean_deviation))
  const stronger = labelled.filter(subject => subject.label!.value === 'relatively_stronger').sort(byDeviation)
  const attention = labelled.filter(subject => subject.label!.value === 'relatively_lower').sort(byDeviation)
  const state: InsightState = !view.numeric || labelled.length === 0 ? 'hidden'
    : labelled.every(subject => subject.label!.value === 'insufficient_evidence') ? 'insufficient'
      : stronger.length + attention.length === 0 ? 'none' : 'ready'
  return { state, stronger, attention }
}

/** DASH-005: the rule that selected a subject, e.g. "Above your average in 4 of the last 5 months, by about 0.8". */
export function labelReason(subject: DashboardSubject, scale: Scale, t: InsightT) {
  const label = subject.label
  if (!label || (label.value !== 'relatively_stronger' && label.value !== 'relatively_lower')) return null
  const above = label.value === 'relatively_stronger'
  // Without Premium the snapshot carries the verdict only (P3-BIL, migration 142).
  if (label.n === undefined) return t(above ? 'insights.reason.aboveSummary' : 'insights.reason.belowSummary')
  return t(above ? 'insights.reason.above' : 'insights.reason.below', {
    count: above ? label.periods_above : label.periods_below,
    total: label.n,
    value: formatMean(Math.abs(Number(label.mean_deviation)), scale) ?? '',
  })
}

export interface ExplanationLine {
  text: string
  confidence: Confidence | null
}

/**
 * ANALYSIS-004: "What your scores show" (facts from the snapshot only) and
 * "Things that sometimes help" (suggestions, only for a lower, declining or
 * volatile subject). Both pass the cause filter.
 */
export function explainSubject(subject: DashboardSubject, scale: Scale, name: string, t: InsightT) {
  const facts: ExplanationLine[] = []
  const { label, trend } = subject
  if (label) {
    const amount = formatMean(Math.abs(Number(label.mean_deviation ?? 0)), scale) ?? ''
    if (label.value === 'relatively_stronger') {
      facts.push({ text: t('explain.label.stronger', { subject: name, total: label.n, count: label.periods_above, value: amount }), confidence: label.confidence })
    } else if (label.value === 'relatively_lower') {
      facts.push({ text: t('explain.label.lower', { subject: name, total: label.n, count: label.periods_below, value: amount }), confidence: label.confidence })
    } else if (label.value === 'neutral') {
      facts.push({ text: t('explain.label.neutral', { subject: name }), confidence: null })
    } else {
      facts.push({ text: t('explain.label.insufficient', { subject: name, count: label.n }), confidence: null })
    }
  }
  if (trend) {
    const perMonth = formatMean(Math.abs(Number(trend.slope ?? 0)), scale) ?? ''
    if (trend.value === 'improving' || trend.value === 'declining') {
      facts.push({ text: t(`explain.trend.${trend.value}`, { count: trend.n, value: perMonth }), confidence: trend.confidence })
    } else if (trend.value === 'volatile') {
      const values = subject.series.filter(point => point.status === 'scored' && point.value !== null).map(point => Number(point.value))
      facts.push({ text: t('explain.trend.volatile', { min: String(Math.min(...values)), max: String(Math.max(...values)) }), confidence: trend.confidence })
    } else if (trend.value === 'no_clear_trend') {
      facts.push({ text: t('explain.trend.flat', { count: trend.n }), confidence: null })
    } else {
      facts.push({ text: t('explain.trend.insufficient', { count: trend.n }), confidence: null })
    }
  }

  const help: InsightKey[] = label?.value === 'relatively_lower' || trend?.value === 'declining'
    ? ['explain.help.review', 'explain.help.routine', 'explain.help.ask']
    : trend?.value === 'volatile' ? ['explain.help.dates', 'explain.help.review'] : []
  return {
    facts: facts.filter(line => !namesCause(line.text)),
    suggestions: help.map(key => t(key)).filter(text => !namesCause(text)),
  }
}
