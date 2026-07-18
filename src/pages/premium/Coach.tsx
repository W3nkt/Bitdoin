import { FormEvent, useEffect, useRef, useState } from 'react'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Brain, Crown, History, MessageSquare, Plus, Send, Sparkles, X } from 'lucide-react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface Message { id: string; role: 'user' | 'assistant'; content: string; created_at: string }
interface Conversation { id: string; title: string; created_at: string; updated_at: string }

const STARTERS = ['Help me plan my study session', 'I feel unmotivated today', 'Practice English with me']
const ROLEPLAY_PROMPTS: Record<string, string> = {
  'job-interview': 'Start a realistic entry-level job interview role-play with me. Ask one question at a time, wait for my answer, and give brief supportive feedback before the next question.',
}
const markdownSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'u'],
}

const directYouTubeUrl = /https?:\/\/(?:www\.)?(?:youtu\.be\/[A-Za-z0-9_-]+|youtube\.com\/watch\?[^\s`)\]]+)/gi

function youtubeSearchUrl(query: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
}

function makeYouTubeRecommendationsSearchable(markdown: string) {
  return markdown.split('\n').map(line => {
    if (!directYouTubeUrl.test(line)) {
      directYouTubeUrl.lastIndex = 0
      return line
    }
    directYouTubeUrl.lastIndex = 0

    const emphasizedTitle = line.match(/\*\*["“]?([^*"”]{3,140})["”]?\*\*/)?.[1]
    const quotedTitle = line.match(/["“]([^"”]{3,140})["”]/)?.[1]
    const query = (emphasizedTitle ?? quotedTitle ?? 'recommended video').trim()
    const searchUrl = youtubeSearchUrl(query)

    return line
      .replace(
        /\[([^\]]+)\]\(https?:\/\/(?:www\.)?(?:youtu\.be\/[A-Za-z0-9_-]+|youtube\.com\/watch\?[^\s`)]+)\)/gi,
        (_match, label: string) => `[${label}](${youtubeSearchUrl(label)})`,
      )
      .replace(
        /`https?:\/\/(?:www\.)?(?:youtu\.be\/[A-Za-z0-9_-]+|youtube\.com\/watch\?[^\s`]+)`/gi,
        `[Search on YouTube](${searchUrl})`,
      )
      .replace(directYouTubeUrl, `[Search on YouTube](${searchUrl})`)
  }).join('\n')
}

function MentorMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw, [rehypeSanitize, markdownSchema]]}
      components={{
        h1: props => <h1 className="mb-2 mt-3 text-xl font-black leading-7 first:mt-0" {...props} />,
        h2: props => <h2 className="mb-1.5 mt-3 text-lg font-black leading-7 first:mt-0" {...props} />,
        h3: props => <h3 className="mb-1.5 mt-2.5 text-base font-extrabold leading-6 first:mt-0" {...props} />,
        p: props => <p className="my-1.5 leading-6 first:mt-0 last:mb-0" {...props} />,
        strong: props => <strong className="font-black text-gray-950" {...props} />,
        em: props => <em className="italic text-gray-700" {...props} />,
        u: props => <u className="decoration-primary-400 decoration-2 underline-offset-2" {...props} />,
        ul: props => <ul className="my-2 list-disc space-y-0.5 pl-6 marker:text-primary-500" {...props} />,
        ol: props => <ol className="my-2 list-decimal space-y-0.5 pl-6 marker:font-bold marker:text-primary-700" {...props} />,
        li: props => <li className="pl-1 leading-6 [&>p]:my-0" {...props} />,
        blockquote: props => <blockquote className="my-2 border-l-4 border-amber-400 bg-amber-50 px-4 py-2 italic text-gray-700" {...props} />,
        hr: props => <hr className="my-3 border-black/10" {...props} />,
        a: props => <a className="font-bold text-primary-600 underline decoration-primary-300 underline-offset-2 hover:text-primary-800" target="_blank" rel="noreferrer" {...props} />,
        code: ({ children, className }) => {
          const value = String(children).replace(/\n$/, '')
          const isUrl = !className && /^https?:\/\/[^\s]+$/i.test(value)
          return isUrl ? (
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all rounded bg-primary-50 px-1.5 py-0.5 font-mono text-[0.9em] font-bold text-primary-700 underline decoration-primary-300 underline-offset-2 transition hover:bg-primary-100 hover:text-primary-900"
            >
              {value}
            </a>
          ) : (
            <code className={cn('rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[0.9em] text-primary-800', className)}>
              {children}
            </code>
          )
        },
        pre: props => <pre className="my-4 overflow-x-auto rounded-2xl bg-primary-950 p-4 text-xs leading-6 text-primary-50 [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit" {...props} />,
        table: props => <div className="my-4 overflow-x-auto"><table className="w-full border-collapse text-left text-xs" {...props} /></div>,
        th: props => <th className="border-b-2 border-gray-300 px-3 py-2 font-black" {...props} />,
        td: props => <td className="border-b border-gray-200 px-3 py-2 align-top" {...props} />,
      }}
    >
      {makeYouTubeRecommendationsSearchable(children)}
    </ReactMarkdown>
  )
}

async function getFunctionErrorMessage(error: unknown) {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json() as { error?: string; message?: string }
      return body.error ?? body.message ?? error.message
    } catch {
      return error.message
    }
  }
  return error instanceof Error ? error.message : 'The mentor is unavailable. Please try again.'
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value))
}

export function PremiumCoach() {
  const { profile, loading: authLoading } = useAuth()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const roleplayMission = searchParams.get('mission')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [localMessages, setLocalMessages] = useState<Message[]>([])
  const [error, setError] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const historyInitialized = useRef(false)
  const roleplayInitialized = useRef(false)
  const roleplayCompleted = useRef(false)

  const access = useQuery({
    queryKey: ['premium-coach-access', profile?.id], enabled: Boolean(profile?.id),
    queryFn: async () => {
      const { data } = await supabase.from('premium_subscriptions').select('id').eq('user_id', profile!.id).eq('status', 'ACTIVE').or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`).limit(1).maybeSingle()
      return Boolean(data)
    },
  })
  const conversations = useQuery({
    queryKey: ['premium-coach-conversations', profile?.id], enabled: access.data === true,
    queryFn: async () => {
      const { data, error } = await supabase.from('premium_coach_conversations').select('id, title, created_at, updated_at').eq('user_id', profile!.id).order('updated_at', { ascending: false })
      if (error) throw error
      return data as Conversation[]
    },
  })
  const messages = useQuery({
    queryKey: ['premium-coach-messages', conversationId], enabled: Boolean(conversationId),
    queryFn: async () => {
      const { data, error } = await supabase.from('premium_coach_messages').select('id, role, content, created_at').eq('conversation_id', conversationId!).order('created_at')
      if (error) throw error
      return data as Message[]
    },
  })

  useEffect(() => {
    if (!historyInitialized.current && conversations.data) {
      historyInitialized.current = true
      setConversationId(conversations.data[0]?.id ?? null)
    }
  }, [conversations.data])
  useEffect(() => { if (messages.data) setLocalMessages(messages.data) }, [messages.data])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [localMessages, sending])
  useEffect(() => {
    if (roleplayInitialized.current || !roleplayMission) return
    const prompt = ROLEPLAY_PROMPTS[roleplayMission]
    if (!prompt) return
    roleplayInitialized.current = true
    setConversationId(null)
    setLocalMessages([])
    setDraft(prompt)
  }, [roleplayMission])

  async function send(event?: FormEvent, starter?: string) {
    event?.preventDefault()
    const content = (starter ?? draft).trim()
    if (!content || sending) return
    setDraft(''); setError(''); setSending(true)
    const optimistic: Message = { id: `local-${Date.now()}`, role: 'user', content, created_at: new Date().toISOString() }
    setLocalMessages(previous => [...previous, optimistic])
    const { data, error: invokeError } = await supabase.functions.invoke('premium-coach', { body: { conversationId, message: content } })
    if (invokeError || data?.error) {
      setLocalMessages(previous => previous.filter(item => item.id !== optimistic.id))
      setError(data?.error ?? await getFunctionErrorMessage(invokeError))
    } else {
      setConversationId(data.conversationId)
      setLocalMessages(previous => [...previous, { id: `reply-${Date.now()}`, role: 'assistant', content: data.answer, created_at: new Date().toISOString() }])
      await queryClient.invalidateQueries({ queryKey: ['premium-coach-conversations', profile?.id] })
      if (roleplayMission && ROLEPLAY_PROMPTS[roleplayMission] && !roleplayCompleted.current) {
        const { error: activityError } = await supabase.rpc('complete_premium_learning_activity', {
          p_activity_type: 'ai_roleplay',
          p_score: 1,
          p_total: 1,
          p_metadata: { mission: roleplayMission },
        })
        if (!activityError) {
          roleplayCompleted.current = true
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['premium', 'learning-activity-attempts', profile?.id] }),
            queryClient.invalidateQueries({ queryKey: ['premium', 'member-progress', profile?.id] }),
          ])
        } else {
          console.error('Could not save role-play activity', activityError)
        }
      }
    }
    setSending(false)
  }

  function startNewChat() {
    setConversationId(null)
    setLocalMessages([])
    setDraft('')
    setError('')
    setHistoryOpen(false)
  }

  function openConversation(id: string) {
    if (id === conversationId) { setHistoryOpen(false); return }
    setConversationId(id)
    setLocalMessages([])
    setError('')
    setHistoryOpen(false)
  }

  if (authLoading || access.isLoading || conversations.isLoading) return <LoadingSpinner className="min-h-screen" />
  if (!profile) return <Navigate to="/auth" replace />
  if (!access.data) return <Navigate to="/subscription" replace />

  return (
    <main className="flex min-h-screen flex-col bg-[#f5f6f1] pt-16 text-gray-950">
      <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-black/5 bg-white/90 px-4 backdrop-blur md:px-8">
        <div className="relative flex h-full items-center justify-between">
          <Link
            to="/subscription"
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-100 hover:text-gray-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label="Back to Premium"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-900 text-white"><Brain className="h-5 w-5" /></span><div><p className="whitespace-nowrap text-sm font-black">Bitdoin Mentor</p><p className="text-[11px] font-semibold text-emerald-600">Ready to coach</p></div></div>
          <Crown className="h-5 w-5 text-amber-500" />
        </div>
      </header>

      {!historyOpen && (
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          className="fixed left-3 top-20 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-gray-600 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:text-primary-700 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 lg:hidden"
          aria-label="Open chat history"
        >
          <History className="h-5 w-5" />
        </button>
      )}

      {historyOpen && <button type="button" className="fixed inset-0 top-16 z-30 bg-black/30 lg:hidden" onClick={() => setHistoryOpen(false)} aria-label="Close chat history" />}
      <aside className={`fixed bottom-0 left-0 top-16 z-40 flex w-72 flex-col border-r border-black/5 bg-white transition-transform duration-200 ${historyOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="flex items-center justify-between px-4 pb-3 pt-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Your mentor</p>
            <h2 className="mt-1 text-lg font-black">Chat history</h2>
          </div>
          <button type="button" onClick={() => setHistoryOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 lg:hidden" aria-label="Close chat history"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-3 pb-3">
          <button type="button" onClick={startNewChat} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-primary-800"><Plus className="h-4 w-4" /> New chat</button>
        </div>
        <nav className="scrollbar-hide flex-1 space-y-1 overflow-y-auto px-2 pb-5" aria-label="Previous mentor chats">
          {conversations.data?.length === 0 && <p className="px-4 py-8 text-center text-xs leading-5 text-gray-400">Your previous conversations will appear here.</p>}
          {conversations.data?.map(conversation => (
            <button key={conversation.id} type="button" onClick={() => openConversation(conversation.id)} className={`group flex w-full gap-3 rounded-2xl px-3 py-3 text-left transition ${conversation.id === conversationId ? 'bg-primary-50 text-primary-950' : 'text-gray-700 hover:bg-gray-50'}`}>
              <MessageSquare className={`mt-0.5 h-4 w-4 flex-shrink-0 ${conversation.id === conversationId ? 'text-primary-600' : 'text-gray-300 group-hover:text-gray-500'}`} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">{conversation.title}</span>
                <time dateTime={conversation.updated_at} className="mt-1 block text-[11px] font-medium text-gray-400">{formatTimestamp(conversation.updated_at)}</time>
              </span>
            </button>
          ))}
        </nav>
      </aside>

      <section className="flex w-full flex-1 flex-col px-4 py-6 lg:ml-72 lg:w-[calc(100%-18rem)] md:py-10">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
        <div className="flex-1 space-y-5" aria-live="polite">
          {localMessages.length === 0 && (
            <div className="animate-slide-up py-10 text-center md:py-20">
              <Sparkles className="mx-auto h-7 w-7 text-amber-500" />
              <h1 className="mt-5 text-3xl font-black tracking-tight">{roleplayMission ? 'Ready for your role-play mission?' : 'What should we work on today?'}</h1>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500">
                {roleplayMission ? 'Send the prepared prompt below to begin. Complete your first exchange to earn 20 XP.' : 'I’ll use your goals and coaching preferences to give you practical, personal guidance.'}
              </p>
              <div className="mx-auto mt-8 grid max-w-lg gap-2 sm:grid-cols-3">{STARTERS.map(starter => <button key={starter} onClick={() => void send(undefined, starter)} className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-left text-sm font-bold transition hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-sm">{starter}</button>)}</div>
            </div>
          )}
          {localMessages.map(message => <div key={message.id} className={`flex animate-slide-up ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`flex max-w-[88%] flex-col md:max-w-[75%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}><div className={`rounded-3xl px-5 py-3 text-sm ${message.role === 'user' ? 'whitespace-pre-wrap rounded-br-md bg-primary-900 leading-6 text-white' : 'rounded-bl-md bg-white text-gray-800 shadow-sm'}`}>{message.role === 'assistant' ? <MentorMarkdown>{message.content}</MentorMarkdown> : message.content}</div><time dateTime={message.created_at} className="mt-1.5 px-2 text-[10px] font-medium text-gray-400">{formatTimestamp(message.created_at)}</time></div></div>)}
          {sending && <div className="flex justify-start"><div className="rounded-3xl rounded-bl-md bg-white px-5 py-4 shadow-sm"><span className="inline-flex gap-1"><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-500" /><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-500 [animation-delay:150ms]" /><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-500 [animation-delay:300ms]" /></span></div></div>}
          <div ref={endRef} />
        </div>
        <div className="sticky bottom-0 bg-[#f5f6f1] pb-4 pt-5">
          {error && <p className="mb-2 text-center text-xs font-semibold text-red-600">{error}</p>}
          <form onSubmit={send} className="flex items-end gap-2 rounded-3xl border border-black/10 bg-white p-2 shadow-lg shadow-black/5">
            <textarea value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send() } }} rows={1} maxLength={4000} placeholder="Ask your mentor…" className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-3 py-3 text-sm outline-none" aria-label="Message your mentor" />
            <button type="submit" disabled={!draft.trim() || sending} className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary-900 text-white transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Send message"><Send className="h-4 w-4" /></button>
          </form>
          <p className="mt-2 text-center text-[10px] text-gray-400">AI can make mistakes. Use your judgment and ask a trusted adult for important decisions.</p>
        </div>
        </div>
      </section>
    </main>
  )
}
