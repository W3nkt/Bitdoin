import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, BellOff, BellRing, PenLine, Smartphone, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { InstallAppButton } from '@/components/notifications/InstallAppButton'
import { useWebPush } from '@/hooks/useWebPush'
import { useAcademicCopy, type AcademicCopyKey } from '@/lib/academic/copy'
import {
  unreadCount, useDismissNotification, useGrantConsent, useMarkNotificationsRead, useNotificationPreferences,
  useNotifications, useSetNotificationPreference, type AcademicNotification,
} from '@/lib/academic/api'
import { formatDate } from '@/lib/academic/format'
import { useTrackUsage } from '@/lib/academic/usageEvents'
import { cn } from '@/lib/utils'
import { PrivacyCard } from './Privacy'
import { academicErrorText } from './errorText'

// In-app reminders and their settings (BE-009, #27; SCORE-014, NOTIF-001/003/004).

function useReminderText() {
  const { t, lo } = useAcademicCopy()
  return (note: AcademicNotification) => {
    // Guardian links (migration 152): a request to confirm, or a link that ended.
    if (note.category === 'guardian_link') {
      const removed = note.code === 'guardian.removed'
      return {
        title: removed ? t('guardians.note.removed.title') : t('guardians.note.request.title', { name: String(note.payload.guardian ?? '') }),
        body: removed ? t('guardians.note.removed.body', { name: String(note.payload.guardian ?? '') }) : t('guardians.note.request.body'),
        href: '/academy/scores/data',
        cta: t('guardians.open'),
      }
    }
    const raw = (lo ? note.payload.period_label_lo : note.payload.period_label_en)?.trim()
    const month = lo ? raw?.replace(/^ເດືອນ\s*/, '') : raw
    return {
      title: month ? t('inbox.reminder.title', { month }) : t('inbox.reminder.titleAny'),
      body: t(note.code === 'score_reminder.second' ? 'inbox.reminder.second' : 'inbox.reminder.first'),
      href: note.payload.period_id ? `/academy/scores/entry?period=${note.payload.period_id}` : '/academy/scores/entry',
      cta: t('entry.cta'),
    }
  }
}

// Usage events (ANL-001): a reminder counts as shown once per page load.
const shownReminders = new Set<string>()
const reminderCode = (note: AcademicNotification) =>
  note.code === 'score_reminder.first' || note.code === 'score_reminder.second' ? note.code : null

function useReminderEvents(notes: AcademicNotification[]) {
  const track = useTrackUsage()
  const ids = notes.map(note => note.id).join(',')
  useEffect(() => {
    for (const note of notes) {
      const code = reminderCode(note)
      if (!code || shownReminders.has(note.id)) continue
      shownReminders.add(note.id)
      track('reminder_shown', { code })
    }
    // notes is a new array each render; ids says when it changed.
  }, [ids, track])
  return (note: AcademicNotification) => {
    const code = reminderCode(note)
    if (code) track('reminder_clicked', { code })
  }
}

/** Header bell with the unread count. */
export function InboxButton() {
  const { t } = useAcademicCopy()
  const unread = unreadCount(useNotifications().data)
  return (
    <Link
      to="/academy/scores/inbox"
      aria-label={unread ? t('inbox.openUnread', { count: unread }) : t('inbox.open')}
      className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-slate-900/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:hover:bg-white/10"
    >
      <Bell className="h-5 w-5" />
      {unread > 0 && (
        <span aria-hidden className="absolute right-0.5 top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[11px] font-black leading-none text-white ring-2 ring-white dark:ring-gray-950">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  )
}

/** The newest unread reminder, on the dashboard. */
export function ReminderBanner() {
  const { t } = useAcademicCopy()
  const text = useReminderText()
  const markRead = useMarkNotificationsRead()
  const note = useNotifications().data?.pages[0]?.items.find(item => item.state === 'sent')
  const clicked = useReminderEvents(note ? [note] : [])
  if (!note) return null
  const { title, body, href, cta } = text(note)
  const done = () => markRead.mutate([note.id])
  return (
    <section aria-labelledby="reminder-banner" className="flex flex-wrap items-start gap-4 rounded-3xl bg-indigo-50 p-5 ring-1 ring-indigo-200 dark:bg-indigo-500/10 dark:ring-indigo-500/30">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-200"><BellRing className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1 basis-48">
        <h2 id="reminder-banner" className="font-black">{title}</h2>
        <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{body}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to={href} onClick={() => { clicked(note); done() }}
            className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-sm font-black text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
            <PenLine className="h-4 w-4" />{cta}
          </Link>
          <Button size="sm" variant="ghost" onClick={done}>{t('inbox.later')}</Button>
        </div>
      </div>
    </section>
  )
}

/** /academy/scores/inbox: every reminder, plus the settings. */
export function Inbox({ noticeVersion }: { noticeVersion: string | null }) {
  const { t, language } = useAcademicCopy()
  const toast = useToast()
  const text = useReminderText()
  const query = useNotifications()
  const markRead = useMarkNotificationsRead()
  const dismiss = useDismissNotification()
  const items = query.data?.pages.flatMap(page => page.items) ?? []

  // Opening the inbox reads everything shown; "New" stays on those for this visit.
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set())
  const seen = useRef(new Set<string>())
  const unreadIds = items.filter(item => item.state === 'sent' && !seen.current.has(item.id)).map(item => item.id)
  const unreadKey = unreadIds.join(',')
  const clicked = useReminderEvents(items.filter(item => item.state === 'sent'))
  useEffect(() => {
    if (!unreadKey) return
    const ids = unreadKey.split(',')
    ids.forEach(id => seen.current.add(id))
    setFresh(current => new Set([...current, ...ids]))
    markRead.mutate(ids)
    // markRead is a new object each render, so it is not a dependency.
  }, [unreadKey])

  return (
    <div className="space-y-6">
      <section aria-labelledby="inbox-title" className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-800">
        <h2 id="inbox-title" className="mb-2 text-lg font-black">{t('inbox.title')}</h2>
        {query.isPending ? (
          <div className="space-y-3 py-2" aria-busy="true"><Skeleton className="h-16 w-full rounded-2xl" /><Skeleton className="h-16 w-full rounded-2xl" /></div>
        ) : query.isError ? (
          <div className="py-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">{academicErrorText(t, query.error)}</p>
            <Button className="mt-3" size="sm" variant="outline" onClick={() => void query.refetch()}>{t('state.retry')}</Button>
          </div>
        ) : items.length === 0 ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"><Bell className="h-7 w-7" /></div>
            <h3 className="text-xl font-black">{t('inbox.empty.title')}</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-slate-400">{t('inbox.empty.body')}</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map(note => {
              const { title, body, href, cta } = text(note)
              return (
                <li key={note.id} className="flex items-start gap-3 py-4">
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"><BellRing className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">{title}</span>
                      {fresh.has(note.id) && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-black text-red-700 dark:bg-red-500/15 dark:text-red-300">{t('inbox.new')}</span>}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{body}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                      <span>{formatDate(note.created_at, language)}</span>
                      <Link to={href} onClick={() => clicked(note)} className="font-black text-indigo-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300">{cta}</Link>
                    </p>
                  </div>
                  <button type="button" aria-label={t('inbox.dismiss')} disabled={dismiss.isPending}
                    onClick={() => dismiss.mutate(note.id, { onError: error => toast.error(academicErrorText(t, error)) })}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200">
                    <X className="h-4 w-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        {query.hasNextPage && (
          <Button className="mt-2" size="sm" variant="ghost" loading={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>{t('inbox.more')}</Button>
        )}
      </section>
      <ReminderSettings noticeVersion={noticeVersion} />
    </div>
  )
}

function Switch({ checked, disabled, onChange, labelledBy, describedBy }: {
  checked: boolean; disabled?: boolean; onChange: () => void; labelledBy: string; describedBy?: string
}) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-labelledby={labelledBy} aria-describedby={describedBy}
      disabled={disabled} onClick={onChange}
      className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-50',
        checked ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600')}>
      <span className={cn('absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-5' : 'translate-x-0')} />
    </button>
  )
}

/**
 * Score reminders on/off, and the optional push to this device (NOTIF-001).
 * The browser permission prompt only ever follows a tap on the switch.
 */
export function ReminderSettings({ noticeVersion }: { noticeVersion: string | null }) {
  const { t, lo } = useAcademicCopy()
  const toast = useToast()
  const prefs = useNotificationPreferences()
  const setPref = useSetNotificationPreference()
  const grant = useGrantConsent()
  const push = useWebPush('MY_SCORES')
  const [busy, setBusy] = useState(false)

  const category = prefs.data?.categories.find(item => item.category === 'score_reminder')
  const inApp = category?.in_app_enabled ?? true
  const pushWanted = Boolean(prefs.data?.push_consent && category?.push_enabled)
  const pushHere = pushWanted && push.enabled
  const quiet = prefs.data?.quiet_hours ?? { start: '21:00', end: '07:00' }
  const fail = (error?: unknown) => toast.error(error ? academicErrorText(t, error) : t('inbox.settings.failed'))

  function toggleInApp() {
    // Turning reminders off also stops the device copy.
    setPref.mutate({ inApp: !inApp, push: inApp ? false : pushWanted }, { onError: fail })
  }

  async function togglePush() {
    setBusy(true)
    try {
      if (pushHere) {
        await setPref.mutateAsync({ inApp, push: false })
        if (await push.disable()) fail()
        return
      }
      // Permission prompt first, while the tap still counts as a user action.
      const problem = await push.enable()
      if (problem) {
        toast.error(t(problem === 'denied' ? 'inbox.settings.denied' : 'inbox.settings.failed'))
        return
      }
      if (!prefs.data?.push_consent) await grant.mutateAsync({ purpose: 'push', noticeVersion: noticeVersion ?? '' })
      await setPref.mutateAsync({ inApp, push: true })
      toast.success(t('inbox.settings.pushOn'))
    } catch (error) {
      fail(error)
    } finally {
      setBusy(false)
    }
  }

  const deviceNote = (icon: React.ReactNode, key: AcademicCopyKey, extra?: React.ReactNode) => (
    <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 dark:bg-gray-800/60 dark:text-slate-300">
      <p className="flex items-start gap-2">{icon}{t(key)}</p>
      {extra}
    </div>
  )

  return (
    <PrivacyCard icon={<Bell className="h-5 w-5" />} title={t('inbox.settings.title')}>
      {prefs.isPending ? (
        <div className="space-y-3" aria-busy="true"><Skeleton className="h-14 w-full rounded-2xl" /><Skeleton className="h-14 w-full rounded-2xl" /></div>
      ) : prefs.isError ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">{academicErrorText(t, prefs.error)}</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          <li className="flex items-start justify-between gap-4 py-3">
            <span>
              <span id="pref-in-app" className="block font-bold">{t('inbox.settings.inApp')}</span>
              <span id="pref-in-app-body" className="mt-0.5 block text-sm text-slate-600 dark:text-slate-400">{t('inbox.settings.inAppBody')}</span>
            </span>
            <Switch checked={inApp} disabled={setPref.isPending || busy} onChange={toggleInApp} labelledBy="pref-in-app" describedBy="pref-in-app-body" />
          </li>
          {push.support !== 'unconfigured' && (
            <li className="py-3">
              <div className="flex items-start justify-between gap-4">
                <span>
                  <span id="pref-push" className="block font-bold">{t('inbox.settings.push')}</span>
                  <span id="pref-push-body" className="mt-0.5 block text-sm text-slate-600 dark:text-slate-400">
                    {t('inbox.settings.pushBody', { start: quiet.start, end: quiet.end })}
                    {pushWanted && !push.enabled && prefs.data?.push_device && <> {t('inbox.settings.otherDevice')}</>}
                  </span>
                </span>
                {push.support === 'ready' && (
                  <Switch checked={pushHere} disabled={!inApp || busy || push.busy || push.loading} onChange={() => void togglePush()} labelledBy="pref-push" describedBy="pref-push-body" />
                )}
              </div>
              {push.support === 'ios-install' && deviceNote(<Smartphone className="mt-0.5 h-4 w-4 shrink-0" />, 'inbox.settings.ios', <InstallAppButton lo={lo} className="mt-3" />)}
              {push.support === 'denied' && deviceNote(<BellOff className="mt-0.5 h-4 w-4 shrink-0" />, 'inbox.settings.blocked')}
              {push.support === 'unsupported' && deviceNote(<BellOff className="mt-0.5 h-4 w-4 shrink-0" />, 'inbox.settings.unsupported')}
            </li>
          )}
        </ul>
      )}
    </PrivacyCard>
  )
}
