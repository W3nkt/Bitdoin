// Messages and the grounded-answer loop for the Coach's academic mode (P3-AI
// #53: AI-001, AI-003, AI-005, AI-009). Pure: the provider call is passed in,
// so the evaluation pipeline (scripts/coach-eval.mjs, AI-010) runs exactly
// what the Edge Function runs.
import { dataBlock, unsupportedNumbers, type CoachContext } from './academic-numbers.ts'

type Lang = 'en' | 'lo'
export type Message = { role: 'system' | 'user' | 'assistant'; content: string }

export const LANGUAGE: Record<Lang, string> = {
  lo: 'Reply in natural, simple Lao as a native speaker in Laos would. Use Lao script only, never Thai script, Thai spelling or Thai-only words: for example write ສະເລ່ຍ (average), ປຽບທຽບ (compare), ທົບທວນ (revise), ສະເໝີ (always). Write month and subject names as they appear in STUDENT DATA.',
  en: 'Reply in simple English.',
}

/** Thai letters inside a Lao answer (Thai and Lao have separate Unicode blocks). */
export function thaiLetters(text: string): string[] {
  return [...new Set(text.match(/[ก-๛]+/g) ?? [])]
}

export const SUMMARY_REQUEST: Record<Lang, string> = { lo: 'ສະຫຼຸບເດືອນຫຼ້າສຸດຂອງຂ້ອຍ.', en: 'Summarise my latest month.' }

/** The prompt template, the reply language and the student's own data. */
export function systemMessage(promptBody: string, lang: Lang, context: CoachContext): Message {
  return { role: 'system', content: `${promptBody}\n\n${LANGUAGE[lang]}\n\nSTUDENT DATA:\n${dataBlock(context, lang)}` }
}

/** History is cut to 1,200 characters a message, oldest first. */
export function chatMessages(promptBody: string, lang: Lang, context: CoachContext, history: { role: 'user' | 'assistant'; content: string }[], question: string): Message[] {
  return [
    systemMessage(promptBody, lang, context),
    ...history.map((item) => ({ role: item.role, content: item.content.slice(0, 1200) })),
    { role: 'user', content: question },
  ]
}

export function summaryMessages(promptBody: string, lang: Lang, context: CoachContext): Message[] {
  return [systemMessage(promptBody, lang, context), { role: 'user', content: SUMMARY_REQUEST[lang] }]
}

export interface Grounded {
  answer: string | null
  checked: boolean
  /** The first reply and what was wrong with it, for the evaluation report. */
  first: string
  firstUnsupported: number[]
  retried: boolean
}

/**
 * AI-003: an answer whose numbers are not all in the data, or (in Lao) that
 * contains Thai letters, is retried once, then given up (the caller falls back).
 */
export async function groundedAnswer(call: (messages: Message[]) => Promise<string>, messages: Message[], context: CoachContext, question: string, extraCheck?: (text: string) => boolean, lang: Lang = 'en'): Promise<Grounded> {
  const ok = (text: string) => !unsupportedNumbers(text, context, question).length && (lang !== 'lo' || !thaiLetters(text).length) && (!extraCheck || extraCheck(text))
  const first = await call(messages)
  const firstUnsupported = unsupportedNumbers(first, context, question)
  if (ok(first)) return { answer: first, checked: true, first, firstUnsupported, retried: false }
  const thai = lang === 'lo' ? thaiLetters(first) : []
  const second = await call([...messages, { role: 'assistant', content: first }, {
    role: 'user',
    content: [
      'Rewrite your answer.',
      firstUnsupported.length ? `These numbers are not in STUDENT DATA: ${firstUnsupported.join(', ')}. Use only numbers that appear in STUDENT DATA.` : '',
      thai.length ? `These are Thai letters, not Lao: ${thai.join(', ')}. Write every word in Lao script with Lao spelling.` : '',
      'Keep it under 150 words.',
    ].filter(Boolean).join(' '),
  }])
  const passed = ok(second)
  return { answer: passed ? second : null, checked: passed, first, firstUnsupported, retried: true }
}
