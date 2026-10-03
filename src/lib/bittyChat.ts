import { supabase } from '@/lib/supabase'

const STORAGE_KEY = 'bitty_chat_v1'
const REQUEST_TIMEOUT_MS = 60_000
// Must match the server-side limits in supabase/functions/bitty-chat/bitty.ts.
const MAX_HISTORY = 30
const MAX_ASSISTANT_CHARS = 4000

export interface BittyBook {
  id: string
  title: string
  author: string | null
  language: string
  coverImageUrl: string | null
  price: number | null
  available: boolean
  reason: string
}

export type BittyErrorCode = 'timeout' | 'busy' | 'unavailable' | 'rate_limited' | 'network' | 'unknown'

export interface BittyMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  quickReplies?: string[]
  books?: BittyBook[]
  offTopic?: boolean
  error?: BittyErrorCode
  /** The opening greeting is rendered client-side and never sent to the model. */
  greeting?: boolean
  /** True while the reply is still streaming. */
  pending?: boolean
}

type BittyEvent =
  | { type: 'text'; text: string }
  | { type: 'replace_text'; text: string }
  | { type: 'quick_replies'; options: string[] }
  | { type: 'recommendations'; books: BittyBook[] }
  | { type: 'off_topic' }
  | { type: 'error'; code: BittyErrorCode }
  | { type: 'done' }

export function newMessageId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function loadBittyMessages(): BittyMessage[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    const parsed: BittyMessage[] = raw ? JSON.parse(raw) : null
    if (!Array.isArray(parsed)) return []
    // A reply interrupted by a page reload can't resume; keep whatever text arrived.
    return parsed
      .filter(m => !m.pending || m.text || m.books?.length)
      .map(m => cleanAssistantMessage(m.pending ? { ...m, pending: false } : m))
  } catch {
    return []
  }
}

export function saveBittyMessages(messages: BittyMessage[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
  } catch {
    // Storage can be full or blocked; the chat still works for this page view.
  }
}

// Older chats sent these notes as text, and the model sometimes copied them into its replies.
const MARKER_PATTERN = /\[(Options shown|Recommended|Declined an off-topic question)[^\]]*\]/g
const OPTIONS_PATTERN = /\[Options shown:([^\]]*)\]/

// Tool names the model may write as text instead of calling the tool.
const TOOL_NAME_PATTERN = /`?\b(show_quick_replies|recommend_books|decline_off_topic)\b`?(\s*\([^)]*\))?/g
const HAS_TOOL_NAME = /\b(show_quick_replies|recommend_books|decline_off_topic)\b/

/** Strips bracketed notes the model may echo, turning an "[Options shown: …]" note into real buttons. */
export function cleanAssistantMessage(message: BittyMessage): BittyMessage {
  if (message.role !== 'assistant') return message
  if (/\bdecline_off_topic\b/.test(message.text)) {
    return { ...message, text: '', offTopic: true, books: undefined, quickReplies: undefined }
  }
  if (!message.text.includes('[') && !HAS_TOOL_NAME.test(message.text)) return message
  const optionsNote = message.text.match(OPTIONS_PATTERN)
  const text = message.text.replace(MARKER_PATTERN, '').replace(TOOL_NAME_PATTERN, '').replace(/\n{3,}/g, '\n\n').trim()
  const options = optionsNote?.[1]
    .split('|')
    .map(option => option.trim().slice(0, 60))
    .filter(Boolean)
    .slice(0, 6)
  return {
    ...message,
    text,
    quickReplies: message.quickReplies?.length ? message.quickReplies : options?.length ? options : message.quickReplies,
  }
}

/** Visible text of an assistant message while it streams, without bracketed notes. */
export function displayText(text: string) {
  return text.replace(MARKER_PATTERN, '').replace(TOOL_NAME_PATTERN, '').trim()
}

/** Sends text turns plus what was shown under each reply; the server replays those as tool calls. */
export function toApiMessages(messages: BittyMessage[]) {
  return messages
    .filter(m => !m.greeting && !m.error && !m.pending)
    .map(m => {
      if (m.role === 'user') return { role: m.role, content: m.text }
      const clean = cleanAssistantMessage(m)
      return {
        role: m.role,
        content: m.offTopic ? '' : clean.text.slice(0, MAX_ASSISTANT_CHARS),
        ...(clean.quickReplies?.length ? { options: clean.quickReplies } : {}),
        ...(clean.books?.length ? { bookIds: clean.books.map(b => b.id) } : {}),
        ...(clean.offTopic ? { offTopic: true } : {}),
      }
    })
    .filter(m => m.role === 'user' || m.content || 'options' in m || 'bookIds' in m || 'offTopic' in m)
    .slice(-MAX_HISTORY)
}

interface StreamHandlers {
  onText: (text: string) => void
  onReplaceText: (text: string) => void
  onQuickReplies: (options: string[]) => void
  onBooks: (books: BittyBook[]) => void
  onOffTopic: () => void
}

/** Sends the conversation to the bitty-chat Edge Function and streams its reply. Throws a BittyErrorCode on failure. */
export async function streamBittyReply(
  messages: BittyMessage[],
  uiLanguage: 'lo' | 'en',
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
  const { data: { session } } = await supabase.auth.getSession()

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const abort = () => controller.abort()
  signal?.addEventListener('abort', abort, { once: true })

  try {
    let response: Response
    try {
      response = await fetch(`${supabaseUrl}/functions/v1/bitty-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
          Authorization: `Bearer ${session?.access_token ?? anonKey}`,
        },
        body: JSON.stringify({ messages: toApiMessages(messages), uiLanguage }),
        signal: controller.signal,
      })
    } catch {
      throw (controller.signal.aborted && !signal?.aborted ? 'timeout' : 'network') satisfies BittyErrorCode
    }

    if (response.status === 429) throw 'rate_limited' satisfies BittyErrorCode
    if (!response.ok || !response.body) {
      throw (response.status >= 500 ? 'unavailable' : 'unknown') satisfies BittyErrorCode
    }

    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
    let buffer = ''
    let finished = false
    while (!finished) {
      let chunk: ReadableStreamReadResult<string>
      try {
        chunk = await reader.read()
      } catch {
        throw (controller.signal.aborted ? 'timeout' : 'network') satisfies BittyErrorCode
      }
      if (chunk.done) break
      buffer += chunk.value
      const frames = buffer.split('\n\n')
      buffer = frames.pop() ?? ''
      for (const frame of frames) {
        if (!frame.startsWith('data: ')) continue
        const event = JSON.parse(frame.slice(6)) as BittyEvent
        if (event.type === 'text') handlers.onText(event.text)
        else if (event.type === 'replace_text') handlers.onReplaceText(event.text)
        else if (event.type === 'quick_replies') handlers.onQuickReplies(event.options)
        else if (event.type === 'recommendations') handlers.onBooks(event.books)
        else if (event.type === 'off_topic') handlers.onOffTopic()
        else if (event.type === 'error') throw event.code
        else if (event.type === 'done') finished = true
      }
    }
    if (!finished) throw 'network' satisfies BittyErrorCode
  } finally {
    window.clearTimeout(timeoutId)
    signal?.removeEventListener('abort', abort)
  }
}
