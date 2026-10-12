import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BellRing, Megaphone, Send, Smartphone } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { pushConfigured } from '@/lib/webPush'
import { cn } from '@/lib/utils'

type Audience = 'BOOKSTORE' | 'ACADEMY' | 'ALL'

interface AudienceStats {
  bookstore_members: number
  bookstore_devices: number
  academy_members: number
  academy_devices: number
  all_members: number
  all_devices: number
}

interface AnnouncementRow {
  id: string
  platform: Audience
  kind: 'ANNOUNCEMENT' | 'NEW_BOOKS'
  title_lo: string | null
  title_en: string | null
  status: 'PENDING' | 'SENDING' | 'SENT' | 'FAILED'
  sent_count: number
  failed_count: number
  created_at: string
}

// Phones cut longer text; the database allows a little more (80 / 240).
const TITLE_LIMIT = 50
const BODY_LIMIT = 120

const AUDIENCES: Array<{ value: Audience; label: string }> = [
  { value: 'BOOKSTORE', label: 'Bookstore' },
  { value: 'ACADEMY', label: 'Academy' },
  { value: 'ALL', label: 'Both' },
]

const LINKS: Array<{ value: string; label: string; audience: Audience[] }> = [
  { value: '/bookstore', label: 'Bookstore home', audience: ['BOOKSTORE', 'ALL'] },
  { value: '/bookstore/books?sort=newest', label: 'Newest books', audience: ['BOOKSTORE', 'ALL'] },
  { value: '/bookstore/knowledge', label: 'Knowledge', audience: ['BOOKSTORE', 'ALL'] },
  { value: '/academy/home', label: 'Academy home', audience: ['ACADEMY', 'ALL'] },
  { value: '/academy/learn', label: 'Learning hub', audience: ['ACADEMY', 'ALL'] },
  { value: '/academy/coach', label: 'AI Coach', audience: ['ACADEMY', 'ALL'] },
  { value: '/academy/challenges', label: 'Weekly challenges', audience: ['ACADEMY', 'ALL'] },
  { value: '/', label: 'Platform selector', audience: ['ALL'] },
]

function audienceCount(stats: AudienceStats | undefined, audience: Audience) {
  if (!stats) return null
  if (audience === 'BOOKSTORE') return { members: stats.bookstore_members, devices: stats.bookstore_devices }
  if (audience === 'ACADEMY') return { members: stats.academy_members, devices: stats.academy_devices }
  return { members: stats.all_members, devices: stats.all_devices }
}

function Counter({ value, limit }: { value: string; limit: number }) {
  return <span className={cn('text-[11px] tabular-nums', value.length > limit ? 'font-bold text-amber-600 dark:text-amber-400' : 'text-gray-400')}>{value.length}/{limit}</span>
}

/**
 * Staff tool: write a short notification about a new feature, new books or
 * lessons, and push it to members' browsers / home-screen apps. Used on
 * /admin/settings (Bookstore) and /academy-admin (Academy).
 */
export function PushAnnouncementComposer({ defaultAudience }: { defaultAudience: Audience }) {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const toast = useToast()
  const [audience, setAudience] = useState<Audience>(defaultAudience)
  const [titleLo, setTitleLo] = useState('')
  const [bodyLo, setBodyLo] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [bodyEn, setBodyEn] = useState('')
  const [url, setUrl] = useState(defaultAudience === 'ACADEMY' ? '/academy/home' : '/bookstore')
  const [preview, setPreview] = useState<'lo' | 'en'>('lo')
  const [sending, setSending] = useState(false)
  const [testing, setTesting] = useState(false)

  const { data: stats } = useQuery({
    queryKey: ['push', 'audience-stats'],
    enabled: pushConfigured,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_push_audience_stats')
      if (error) throw error
      return data as AudienceStats
    },
  })

  const { data: history } = useQuery({
    queryKey: ['push', 'announcements'],
    enabled: pushConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('push_announcements')
        .select('id,platform,kind,title_lo,title_en,status,sent_count,failed_count,created_at')
        .order('created_at', { ascending: false })
        .limit(8)
      if (error) throw error
      return (data ?? []) as AnnouncementRow[]
    },
  })

  if (!pushConfigured) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Push notifications are not configured. Set <code>VITE_VAPID_PUBLIC_KEY</code> for the app and the VAPID secrets for the send-push function.
      </p>
    )
  }

  const reach = audienceCount(stats, audience)
  const cleanUrl = url.trim()
  const urlValid = cleanUrl.startsWith('/') && !cleanUrl.startsWith('//')
  const hasLo = Boolean(titleLo.trim() && bodyLo.trim())
  const hasEn = Boolean(titleEn.trim() && bodyEn.trim())
  const ready = (hasLo || hasEn) && urlValid
  const previewTitle = (preview === 'lo' ? titleLo || titleEn : titleEn || titleLo) || 'Notification title'
  const previewBody = (preview === 'lo' ? bodyLo || bodyEn : bodyEn || bodyLo) || 'A short message that makes people want to tap.'

  function draft() {
    return {
      title_lo: titleLo.trim() || null,
      body_lo: bodyLo.trim() || null,
      title_en: titleEn.trim() || null,
      body_en: bodyEn.trim() || null,
      url: cleanUrl,
    }
  }

  async function sendTest() {
    setTesting(true)
    try {
      const { data, error } = await supabase.functions.invoke('send-push', { body: { action: 'test', platform: audience === 'ACADEMY' ? 'ACADEMY' : 'BOOKSTORE', draft: draft() } })
      if (error) throw error
      if ((data as { sent: number }).sent > 0) toast.success('Test sent to your devices')
      else toast.error('No devices found. Turn on notifications in your profile on this device first.')
    } catch (err) {
      console.error(err)
      toast.error('Could not send the test')
    } finally {
      setTesting(false)
    }
  }

  async function send() {
    if (!profile || !ready) return
    const who = reach ? `${reach.members} member${reach.members === 1 ? '' : 's'} (${reach.devices} device${reach.devices === 1 ? '' : 's'})` : 'all subscribers'
    if (!window.confirm(`Send this notification to ${who}? This cannot be undone.`)) return
    setSending(true)
    try {
      const { data: row, error } = await supabase
        .from('push_announcements')
        .insert({ ...draft(), platform: audience, created_by: profile.id })
        .select('id')
        .single()
      if (error) throw error
      const { data, error: sendError } = await supabase.functions.invoke('send-push', { body: { action: 'announcement', id: row.id } })
      if (sendError) throw sendError
      const result = data as { sent: number; failed: number }
      toast.success(`Sent to ${result.sent} device${result.sent === 1 ? '' : 's'}${result.failed ? ` (${result.failed} failed)` : ''}`)
      setTitleLo(''); setBodyLo(''); setTitleEn(''); setBodyEn('')
    } catch (err) {
      console.error(err)
      toast.error('Could not send the notification')
    } finally {
      setSending(false)
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['push', 'announcements'] }),
        qc.invalidateQueries({ queryKey: ['push', 'audience-stats'] }),
      ])
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2">
        {AUDIENCES.map(option => {
          const count = audienceCount(stats, option.value)
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setAudience(option.value)
                if (!LINKS.some(link => link.value === url && link.audience.includes(option.value))) {
                  setUrl(option.value === 'ACADEMY' ? '/academy/home' : option.value === 'BOOKSTORE' ? '/bookstore' : '/')
                }
              }}
              className={cn(
                'rounded-xl border px-3 py-2.5 text-left transition-colors',
                audience === option.value
                  ? 'border-primary-700 bg-primary-50 dark:border-primary-400 dark:bg-primary-500/10'
                  : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50',
              )}
            >
              <span className="block text-sm font-bold text-gray-900 dark:text-gray-100">{option.label}</span>
              <span className="block text-[11px] text-gray-500 dark:text-gray-400">{count ? `${count.members} members` : '…'}</span>
            </button>
          )
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-4">
          <fieldset className="space-y-3 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
            <legend className="px-1 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Lao</legend>
            <div>
              <div className="flex justify-end"><Counter value={titleLo} limit={TITLE_LIMIT} /></div>
              <Input label="Title" value={titleLo} maxLength={80} onChange={e => setTitleLo(e.target.value)} placeholder="🆕 ຟັງຊັນໃໝ່: …" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="push-body-lo" className="text-sm font-medium text-gray-700 dark:text-gray-200">Message</label>
                <Counter value={bodyLo} limit={BODY_LIMIT} />
              </div>
              <textarea id="push-body-lo" value={bodyLo} maxLength={240} rows={2} onChange={e => setBodyLo(e.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-500/30" />
            </div>
          </fieldset>

          <fieldset className="space-y-3 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
            <legend className="px-1 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">English <span className="font-normal normal-case">(members using English; falls back to Lao)</span></legend>
            <div>
              <div className="flex justify-end"><Counter value={titleEn} limit={TITLE_LIMIT} /></div>
              <Input label="Title" value={titleEn} maxLength={80} onChange={e => setTitleEn(e.target.value)} placeholder="🆕 New: …" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="push-body-en" className="text-sm font-medium text-gray-700 dark:text-gray-200">Message</label>
                <Counter value={bodyEn} limit={BODY_LIMIT} />
              </div>
              <textarea id="push-body-en" value={bodyEn} maxLength={240} rows={2} onChange={e => setBodyEn(e.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-500/30" />
            </div>
          </fieldset>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Opens when tapped</p>
            <div className="flex flex-wrap gap-1.5">
              {LINKS.filter(link => link.audience.includes(audience)).map(link => (
                <button
                  key={link.value}
                  type="button"
                  onClick={() => setUrl(link.value)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                    url === link.value ? 'bg-primary-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
                  )}
                >
                  {link.label}
                </button>
              ))}
            </div>
            <Input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="/bookstore/books/…"
              error={urlValid ? undefined : 'Use a path on this site, starting with /'}
              hint="Paste any page path, e.g. a book or lesson link."
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Preview</p>
            <div className="flex overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
              {(['lo', 'en'] as const).map(lang => (
                <button key={lang} type="button" onClick={() => setPreview(lang)} className={cn('px-2.5 py-1 text-[11px] font-bold', preview === lang ? 'bg-primary-700 text-white' : 'text-gray-500 dark:text-gray-400')}>
                  {lang === 'lo' ? 'ລາວ' : 'EN'}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-gray-100 dark:bg-gray-800 p-3">
            <div className="flex gap-3 rounded-xl bg-white dark:bg-gray-900 p-3 shadow-sm">
              <img src="/icons/icon-96x96.png" alt="" className="h-9 w-9 shrink-0 rounded-lg" />
              <div className="min-w-0">
                <p className="flex items-center gap-1 text-[11px] text-gray-400"><Smartphone className="h-3 w-3" /> Bitdoin · now</p>
                <p className="line-clamp-1 text-sm font-bold text-gray-900 dark:text-gray-100">{previewTitle}</p>
                <p className="line-clamp-2 text-xs text-gray-600 dark:text-gray-300">{previewBody}</p>
              </div>
            </div>
          </div>
          <ul className="space-y-1 text-[11px] leading-4 text-gray-500 dark:text-gray-400">
            <li>• Lead with the benefit, keep it under ~{TITLE_LIMIT} characters.</li>
            <li>• One emoji at the start helps it stand out.</li>
            <li>• Link straight to the new book, lesson or feature.</li>
          </ul>
          <div className="flex flex-col gap-2">
            <Button type="button" variant="outline" size="sm" loading={testing} disabled={!ready} icon={<BellRing className="h-4 w-4" />} onClick={() => void sendTest()}>
              Send test to my devices
            </Button>
            <Button type="button" size="sm" loading={sending} disabled={!ready || reach?.devices === 0} icon={<Send className="h-4 w-4" />} onClick={() => void send()}>
              {reach ? `Send to ${reach.members} member${reach.members === 1 ? '' : 's'}` : 'Send'}
            </Button>
          </div>
        </div>
      </div>

      {!!history?.length && (
        <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Recently sent</p>
          <ul className="divide-y divide-gray-50 dark:divide-gray-800">
            {history.map(item => (
              <li key={item.id} className="flex items-center gap-3 py-2 text-sm">
                <Megaphone className={cn('h-4 w-4 shrink-0', item.kind === 'NEW_BOOKS' ? 'text-emerald-500' : 'text-primary-600 dark:text-primary-300')} />
                <span className="min-w-0 flex-1 truncate text-gray-800 dark:text-gray-100">{item.title_lo || item.title_en}</span>
                <span className="hidden shrink-0 rounded-md bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-[10px] font-bold text-gray-500 dark:text-gray-400 sm:inline">
                  {item.kind === 'NEW_BOOKS' ? 'Auto · new books' : item.platform === 'ALL' ? 'Both' : item.platform === 'ACADEMY' ? 'Academy' : 'Bookstore'}
                </span>
                <span className={cn('shrink-0 text-xs tabular-nums', item.status === 'FAILED' ? 'text-red-500' : 'text-gray-400')}>
                  {item.status === 'SENT' ? `${item.sent_count} sent` : item.status.toLowerCase()}
                </span>
                <span className="hidden shrink-0 text-xs text-gray-400 md:inline">{new Date(item.created_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
