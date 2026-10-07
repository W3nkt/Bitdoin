import { type CSSProperties, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RotateCcw, SendHorizontal, X } from 'lucide-react'
import {
  type BittyErrorCode,
  type BittyMessage,
  cleanAssistantMessage,
  displayText,
  loadBittyMessages,
  newMessageId,
  saveBittyMessages,
  streamBittyReply,
} from '@/lib/bittyChat'
import { useLanguage } from '@/context/LanguageContext'
import { cn } from '@/lib/utils'
import { BittyAvatar } from './BittyAvatar'
import { BittyBookItem } from './BittyBookItem'

function greetingMessage(): BittyMessage {
  return { id: newMessageId(), role: 'assistant', text: '', greeting: true }
}

function initialMessages(): BittyMessage[] {
  const saved = loadBittyMessages()
  return saved.length > 0 ? saved : [greetingMessage()]
}

// Bitty is asked for plain text, but strip stray markdown emphasis just in case.
function plainText(text: string) {
  return displayText(text).replace(/\*\*(.+?)\*\*/g, '$1').replace(/^#+\s*/gm, '')
}

interface BittyChatPanelProps {
  /** Play the entrance effect (only when the customer just clicked the launcher). */
  animateIn: boolean
  /** Play the exit effect, then call onExited. */
  closing: boolean
  onClose: () => void
  onExited: () => void
}

// Only the last few messages are visible on open, so only they get a staggered entrance.
const CASCADE_ROWS = 6

export default function BittyChatPanel({ animateIn, closing, onClose, onExited }: BittyChatPanelProps) {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const [messages, setMessages] = useState<BittyMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [entering, setEntering] = useState(animateIn)
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => saveBittyMessages(messages), [messages])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      abortRef.current?.abort()
    }
  }, [])

  async function send(text: string, base: BittyMessage[] = messages) {
    const content = text.trim()
    if (!content || busy) return

    const history = [...base.filter(m => !m.error), { id: newMessageId(), role: 'user' as const, text: content }]
    const replyId = newMessageId()
    setMessages([...history, { id: replyId, role: 'assistant', text: '', pending: true }])
    setInput('')
    setBusy(true)

    const controller = new AbortController()
    abortRef.current = controller
    const update = (change: (m: BittyMessage) => BittyMessage) =>
      setMessages(prev => prev.map(m => (m.id === replyId ? change(m) : m)))

    try {
      await streamBittyReply(history, language === 'en' ? 'en' : 'lo', {
        onText: chunk => update(m => ({ ...m, text: m.text + chunk })),
        onReplaceText: text => update(m => ({ ...m, text })),
        onQuickReplies: options => update(m => ({ ...m, quickReplies: options })),
        onBooks: books => update(m => ({ ...m, books })),
        onOffTopic: () => update(m => ({ ...m, offTopic: true, text: '', books: undefined, quickReplies: undefined })),
      }, controller.signal)
      update(m => cleanAssistantMessage({ ...m, pending: false }))
    } catch (error) {
      if (controller.signal.aborted) return
      const code: BittyErrorCode = typeof error === 'string' ? error as BittyErrorCode : 'unknown'
      setMessages(prev => [
        ...prev.filter(m => m.id !== replyId),
        { id: newMessageId(), role: 'assistant', text: '', error: code },
      ])
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
        setBusy(false)
      }
    }
  }

  function retry() {
    const lastUserIndex = messages.map(m => m.role).lastIndexOf('user')
    if (lastUserIndex < 0) return
    send(messages[lastUserIndex].text, messages.slice(0, lastUserIndex))
  }

  function startOver() {
    abortRef.current?.abort()
    abortRef.current = null
    setBusy(false)
    setInput('')
    setMessages([greetingMessage()])
    inputRef.current?.focus()
  }

  function handleOpenDetails() {
    // On phones the panel covers most of the page, so get out of the way.
    if (window.matchMedia('(max-width: 639px)').matches) onClose()
  }

  const last = messages[messages.length - 1]
  const greetingReplies = [t('bitty.topicBook'), t('bitty.topicOrder'), t('bitty.topicTrack'), t('bitty.topicAccount'), t('bitty.topicAcademy')]
  // Only 3 books fit in one reply, so book cards always come with a way to see more.
  const afterBooksReplies = (modelReplies: string[]) => {
    const fallback = [t('bitty.otherCategory'), t('bitty.otherLanguage')]
    const rest = (modelReplies.length > 0 ? modelReplies : fallback).filter(option => option !== t('bitty.moreBooks'))
    return [t('bitty.moreBooks'), ...rest].slice(0, 5)
  }
  const quickReplies = !busy && last?.role === 'assistant' && !last.error
    // After a greeting or an off-topic reply, offer the main help topics to get back on track.
    ? (last.greeting || last.offTopic
        ? greetingReplies
        : last.books?.length ? afterBooksReplies(last.quickReplies ?? []) : last.quickReplies ?? [])
    : []

  const cascade = (index: number) => ({ '--bitty-i': Math.max(0, index - (messages.length - CASCADE_ROWS)) }) as CSSProperties

  return (
    <div
      role="dialog"
      aria-label={t('bitty.name')}
      onAnimationEnd={e => {
        if (e.target !== e.currentTarget) return
        if (closing) onExited()
        else setEntering(false)
      }}
      className={cn(
        closing ? 'bitty-panel-exit' : entering && 'bitty-panel-enter',
        'fixed inset-x-3 bottom-[4.5rem] z-50 flex h-[min(520px,72dvh)] flex-col overflow-hidden rounded-2xl border border-primary-200 dark:border-primary-800 bg-white dark:bg-gray-900 shadow-[0_24px_60px_-12px_rgba(15,31,53,0.45)] ring-4 ring-primary-700/10 dark:ring-primary-400/10 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[min(640px,calc(100vh-3rem))] sm:w-[400px]',
      )}
    >
      <header className="bitty-header relative flex items-center gap-2 overflow-hidden bg-primary-700 px-3 py-2 text-white sm:gap-3 sm:px-4 sm:py-3">
        <BittyAvatar className="h-8 w-8 ring-2 ring-white/40 sm:h-10 sm:w-10" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-tight sm:text-base">{t('bitty.name')}</p>
          <p className="truncate text-[11px] text-white/75 sm:text-xs">{t('bitty.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={startOver}
          className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-[11px] font-semibold text-white/90 transition-colors hover:bg-white/10 sm:px-2 sm:py-1.5 sm:text-xs"
        >
          <RotateCcw className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          {t('bitty.startOver')}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('bitty.close')}
          className="rounded-lg p-1 text-white/90 transition-colors hover:bg-white/10 sm:p-1.5"
        >
          <X className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-primary-100 dark:from-primary-900/60 via-[#eceeff] dark:via-gray-900 to-accent-100/80 dark:to-accent-500/10 px-2.5 py-3 sm:px-3 sm:py-4" aria-live="polite">
        {messages.map((message, index) => {
          if (message.role === 'user') {
            return (
              <div key={message.id} className="bitty-msg flex justify-end" style={cascade(index)}>
                <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary-700 px-3 py-1.5 text-[13px] text-white sm:px-3.5 sm:py-2 sm:text-sm">
                  {message.text}
                </p>
              </div>
            )
          }

          const text = message.greeting
            ? t('bitty.greeting')
            : message.offTopic
              ? t('bitty.offTopic')
              : message.error
                ? t(`bitty.errors.${message.error}`)
                : plainText(message.text)
          // Keep showing progress until the reply is complete, even after text or books arrive.
          const typing = message.pending

          return (
            <div key={message.id} className="bitty-msg flex items-start gap-2" style={cascade(index)}>
              <BittyAvatar className="mt-0.5 h-6 w-6 ring-1 ring-gray-200 dark:ring-gray-700 sm:h-7 sm:w-7" />
              <div className="min-w-0 max-w-[85%] space-y-2">
                {text && (
                  <p className={cn(
                    'whitespace-pre-wrap rounded-2xl rounded-bl-md px-3 py-1.5 text-[13px] shadow-sm sm:px-3.5 sm:py-2 sm:text-sm',
                    message.error ? 'border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300' : 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 ring-1 ring-primary-100 dark:ring-primary-800',
                  )}>
                    {text}
                  </p>
                )}
                {message.error && !busy && message.id === last?.id && (
                  <button type="button" onClick={retry} className="text-xs font-semibold text-primary-700 dark:text-primary-300 hover:underline">
                    {t('bitty.retry')}
                  </button>
                )}
                {!!message.books?.length && (
                  <ul className="divide-y divide-primary-50 rounded-2xl rounded-bl-md bg-white dark:bg-gray-900 px-3 py-2.5 shadow-sm ring-1 ring-primary-100 dark:ring-primary-800 sm:px-3.5 sm:py-3">
                    {message.books.map(book => (
                      <BittyBookItem key={book.id} book={book} onOpenDetails={handleOpenDetails} />
                    ))}
                  </ul>
                )}
                {typing && (
                  <div role="status" className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md bg-white dark:bg-gray-900 px-3.5 py-2.5 shadow-sm ring-1 ring-primary-100 dark:ring-primary-800">
                    <span className="flex gap-1" aria-hidden="true">
                      {[0, 150, 300].map(delay => (
                        <span key={delay} className="h-2 w-2 animate-bounce rounded-full bg-primary-400" style={{ animationDelay: `${delay}ms` }} />
                      ))}
                    </span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 sm:text-xs">{t('bitty.typing')}…</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {quickReplies.length > 0 && (
          <div className="bitty-msg flex flex-wrap gap-1.5 pl-8 sm:gap-2 sm:pl-9" style={cascade(messages.length)}>
            {quickReplies.map(option => (
              <button
                key={option}
                type="button"
                onClick={() => send(option)}
                className="rounded-full border border-primary-300 dark:border-primary-700 bg-white dark:bg-gray-900 px-2.5 py-1 text-[11px] font-semibold sm:px-3 sm:py-1.5 sm:text-xs text-primary-700 dark:text-primary-300 shadow-sm transition-colors hover:border-primary-700 dark:hover:border-primary-400 hover:bg-primary-700 hover:text-white"
              >
                {option}
              </button>
            ))}
            {!last?.books?.length && !last?.offTopic && !last?.greeting && (
              <button
                type="button"
                onClick={() => send(t('bitty.skip'))}
                className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400 sm:px-3 sm:py-1.5 sm:text-xs transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {t('bitty.skip')}
              </button>
            )}
          </div>
        )}
      </div>

      <form
        onSubmit={e => { e.preventDefault(); send(input) }}
        className="border-t border-primary-100 dark:border-primary-800 bg-white dark:bg-gray-900 px-2.5 pb-2 pt-2 sm:px-3 sm:pb-3 sm:pt-3"
      >
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={t('bitty.placeholder')}
            maxLength={1000}
            className="min-w-0 flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 text-base sm:px-3.5 sm:py-2.5 outline-none transition-colors focus:border-primary-500 focus:bg-white dark:focus:bg-gray-900 sm:text-sm"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label={t('bitty.send')}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary-700 sm:h-10 sm:w-10 text-white transition-colors hover:bg-primary-800 disabled:opacity-40"
          >
            <SendHorizontal className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>
        <p className="mt-1 text-center text-[9px] text-gray-400 sm:mt-1.5 sm:text-[10px]">{t('bitty.disclaimer')}</p>
      </form>
    </div>
  )
}
