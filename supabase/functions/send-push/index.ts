import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'
import { membershipActivatedMessage } from '../_shared/membership-notify.ts'
import {
  academyDailyMessage,
  engagementMessage,
  ENGAGEMENT_KINDS,
  newBooksMessage,
  scoreReminderMessage,
  testMessage,
  WELLBEING_KINDS,
  type EngagementKind,
  type EngagementParams,
  type ScoreReminderPayload,
  type Lang,
  type NewBook,
  type PushMessage,
} from './messages.ts'
import { createNativeSender, parseNativeEndpoint } from './native-push.ts'

// Sends push notifications for both platforms: Web Push (browser + home-screen app) and the
// iOS / Android apps (native-push.ts: APNs and FCM). Devices and their per-platform switches
// live in push_subscriptions (migrations 102, 120, 176); a phone's endpoint is native://ios/<token>
// or native://android/<token>. Actions (POST JSON { action, ... }):
//
//   academy-daily  pg_cron, every 15 min. One reminder per device per day in
//                  the member's slot (Laos time). Safe to call any number of
//                  times: a device is claimed for today before it is sent.
//   new-books      pg_cron, daily 18:00 Laos. One digest of books added since
//                  the last digest; nothing is sent when there are none.
//   announcement   Staff only. { id } of a PENDING push_announcements row.
//   test           Signed-in user. Sends a test to the caller's own devices.
//   engagement     pg_cron, every 15 min. Streak / leaderboard / comeback nudges and the two
//                  well-being messages (take a break, put the phone down) to phones. The
//                  database decides who gets what and applies the windows, caps and back-off
//                  (push_claim_engagement, migration 176).
//   test-engagement  Staff only. { kind } previews one of those messages on the caller's own devices.
//   academic-reminders  pg_cron, every 15 min. Delivers My Scores reminders
//                  claimed from academic_notifications (migration 118); the
//                  database applies opt-in, quiet hours and caps.
//
// Dead subscriptions (404/410 from the push service) are deleted.
//
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:...)      browsers
//          APNS_KEY_P8, APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID, APNS_ENVIRONMENT   iPhone app
//          FCM_SERVICE_ACCOUNT                                                  Android app
//          ALLOWED_ORIGINS (optional, comma separated)
// Each group is optional: a kind of device without its secrets is skipped, not failed.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@bitdoin.store'
const nativeSender = createNativeSender({
  APNS_KEY_P8: Deno.env.get('APNS_KEY_P8'),
  APNS_KEY_ID: Deno.env.get('APNS_KEY_ID'),
  APNS_TEAM_ID: Deno.env.get('APNS_TEAM_ID'),
  APNS_BUNDLE_ID: Deno.env.get('APNS_BUNDLE_ID'),
  APNS_ENVIRONMENT: Deno.env.get('APNS_ENVIRONMENT'),
  FCM_SERVICE_ACCOUNT: Deno.env.get('FCM_SERVICE_ACCOUNT'),
})
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)

// Laos is UTC+7 all year (no daylight saving).
const LAOS_OFFSET_MS = 7 * 60 * 60 * 1000
// Slot start, in minutes after midnight Laos time (same as Telegram reminders).
const SLOT_MINUTES: Record<string, number> = { MORNING: 7 * 60 + 30, AFTERNOON: 12 * 60 + 30, EVENING: 19 * 60 + 30 }
// Parallel requests to the push services; they handle bursts well.
const SEND_CONCURRENCY = 20
const STAFF_ROLES = ['ADMIN', 'OPERATIONS']

type Platform = 'BOOKSTORE' | 'ACADEMY'

interface SubscriptionRow {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
}

function laosNow() {
  const local = new Date(Date.now() + LAOS_OFFSET_MS)
  return {
    date: local.toISOString().slice(0, 10),
    minutes: local.getUTCHours() * 60 + local.getUTCMinutes(),
  }
}

function corsHeaders(req: Request) {
  const origin = req.headers.get('Origin') ?? ''
  const allowedOrigin = ALLOWED_ORIGINS.length === 0
    ? '*'
    : ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })
}

const asLang = (value: unknown): Lang => (value === 'en' ? 'en' : 'lo')

async function languagesFor(admin: SupabaseClient, userIds: string[]) {
  const map = new Map<string, { name: string; lang: Lang }>()
  for (let i = 0; i < userIds.length; i += 500) {
    const { data } = await admin.from('users').select('id,name,language').in('id', userIds.slice(i, i + 500))
    for (const user of data ?? []) map.set(user.id, { name: user.name ?? '', lang: asLang(user.language) })
  }
  return map
}

type SendOutcome = 'sent' | 'gone' | 'failed'

/** One message to one device, browser or phone. */
async function sendOne(row: SubscriptionRow, message: PushMessage, ttl: number): Promise<SendOutcome> {
  const phone = parseNativeEndpoint(row.endpoint)
  if (phone) return nativeSender.send(phone.channel, phone.token, message, ttl)
  try {
    await webpush.sendNotification(
      { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
      JSON.stringify(message),
      // No Topic header: Apple rejects it (400 BadWebPushTopic). The
      // payload's `tag` already replaces an older notification on device.
      { TTL: ttl, urgency: 'normal' },
    )
    return 'sent'
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode
    if (status === 404 || status === 410) return 'gone'
    console.error('[send-push] delivery failed', status, (error as Error).message)
    return 'failed'
  }
}

/**
 * Sends one message per row. Returns counts; deletes subscriptions the push
 * service says are gone, and records the last successful delivery.
 */
async function deliver<T extends SubscriptionRow>(
  admin: SupabaseClient,
  rows: T[],
  messageFor: (row: T) => PushMessage,
  options: { ttl: number; onFailure?: (row: T) => Promise<void>; onDelivered?: (row: T) => void },
) {
  let sent = 0
  let failed = 0
  const gone: string[] = []
  const delivered: string[] = []

  for (let i = 0; i < rows.length; i += SEND_CONCURRENCY) {
    await Promise.all(rows.slice(i, i + SEND_CONCURRENCY).map(async row => {
      const outcome = await sendOne(row, messageFor(row), options.ttl)
      if (outcome === 'sent') {
        sent += 1
        delivered.push(row.id)
        options.onDelivered?.(row)
        return
      }
      failed += 1
      if (outcome === 'gone') gone.push(row.id)
      else await options.onFailure?.(row)
    }))
  }

  if (gone.length) await admin.from('push_subscriptions').delete().in('id', gone)
  if (delivered.length) {
    await admin.from('push_subscriptions').update({ last_success_at: new Date().toISOString() }).in('id', [...new Set(delivered)])
  }
  return { sent, failed, removed: gone.length }
}

// ─── academy-daily ───────────────────────────────────────────────────────────

async function sendAcademyDaily(admin: SupabaseClient) {
  const now = laosNow()
  const dueSlots = Object.entries(SLOT_MINUTES).filter(([, start]) => now.minutes >= start).map(([slot]) => slot)
  if (!dueSlots.length) return { sent: 0, reason: 'no slot due yet' }

  // Claim today's reminder first so overlapping runs cannot double-send.
  const { data: claimed, error } = await admin
    .from('push_subscriptions')
    .update({ last_academy_reminder_on: now.date })
    .eq('academy_enabled', true)
    .in('academy_slot', dueSlots)
    .or(`last_academy_reminder_on.is.null,last_academy_reminder_on.lt.${now.date}`)
    .select('id,user_id,endpoint,p256dh,auth')
  if (error) throw error
  const rows = (claimed ?? []) as SubscriptionRow[]
  if (!rows.length) return { sent: 0, date: now.date }

  const userIds = [...new Set(rows.map(row => row.user_id))]
  const [{ data: mentor }, guidanceBatches] = await Promise.all([
    admin.from('premium_daily_motivations').select('quote')
      .lte('publish_date', now.date).eq('is_active', true)
      .order('publish_date', { ascending: false }).limit(1).maybeSingle(),
    Promise.all(Array.from({ length: Math.ceil(userIds.length / 500) }, (_, i) =>
      admin.from('premium_personalized_daily_guidance').select('user_id,quote')
        .eq('publish_date', now.date).in('user_id', userIds.slice(i * 500, (i + 1) * 500)),
    )),
  ])
  const quotes = new Map(guidanceBatches.flatMap(batch => batch.data ?? []).map(row => [row.user_id, row.quote]))

  const result = await deliver(admin, rows, row => {
    return academyDailyMessage({
      laosDate: now.date,
      personalizedQuote: quotes.get(row.user_id),
      quote: mentor?.quote,
    })
  }, {
    ttl: 12 * 60 * 60,
    // Temporary failure: release today's claim so the next run retries.
    onFailure: async row => {
      await admin.from('push_subscriptions').update({ last_academy_reminder_on: null })
        .eq('id', row.id).eq('last_academy_reminder_on', now.date)
    },
  })
  return { ...result, date: now.date }
}

// ─── academic-reminders ──────────────────────────────────────────────────────

interface ClaimedNotification {
  id: string
  user_id: string
  code: string
  payload: ScoreReminderPayload
  language: string | null
}

async function sendAcademicReminders(admin: SupabaseClient) {
  // Claiming marks rows 'sending', so overlapping runs cannot double-send.
  const { data: claimed, error } = await admin.rpc('academic_claim_push_notifications', { p_limit: 200 })
  if (error) throw error
  const notes = (claimed ?? []) as ClaimedNotification[]
  if (!notes.length) return { sent: 0, notifications: 0 }

  const userIds = [...new Set(notes.map(note => note.user_id))]
  const { data: devices, error: devicesError } = await admin
    .from('push_subscriptions')
    .select('id,user_id,endpoint,p256dh,auth')
    .in('user_id', userIds)
    .eq('my_scores_enabled', true) // migration 120
  if (devicesError) throw devicesError

  // One delivery per device per notification.
  const rows = notes.flatMap(note => ((devices ?? []) as SubscriptionRow[])
    .filter(device => device.user_id === note.user_id)
    .map(device => ({ ...device, note })))
  const sentIds = new Set<string>()
  const result = await deliver(admin, rows, row => scoreReminderMessage(asLang(row.note.language), row.note.payload), {
    ttl: 12 * 60 * 60,
    onDelivered: row => sentIds.add(row.note.id),
  })

  const failedIds = notes.map(note => note.id).filter(id => !sentIds.has(id))
  const { error: completeError } = await admin.rpc('academic_complete_push_notifications', {
    p_sent: [...sentIds],
    p_failed: failedIds,
  })
  if (completeError) throw completeError
  return { sent: result.sent, failed: result.failed, removed: result.removed, notifications: notes.length, delivered: sentIds.size }
}

// ─── new-books ───────────────────────────────────────────────────────────────

async function sendNewBooks(admin: SupabaseClient) {
  const { data: last } = await admin
    .from('push_announcements')
    .select('created_at,last_book_created_at')
    .eq('kind', 'NEW_BOOKS')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // At most one digest a day, even if the job is triggered again.
  if (last && Date.now() - Date.parse(last.created_at) < 20 * 60 * 60 * 1000) {
    return { sent: 0, reason: 'digest already sent today' }
  }
  // First run: only look back one day, not at the whole catalogue.
  const since = last?.last_book_created_at ?? last?.created_at ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: books, error, count } = await admin
    .from('books')
    .select('id,title,author,cover_image_url,created_at', { count: 'exact' })
    .eq('is_active', true)
    .gt('created_at', since)
    .order('created_at', { ascending: false })
    .limit(5)
  if (error) throw error
  if (!books?.length) return { sent: 0, reason: 'no new books' }

  const newest = books[0].created_at
  const featured = books as NewBook[]
  const total = count ?? featured.length
  const message = (lang: Lang) => newBooksMessage(featured, total, lang)
  const lo = message('lo')
  const en = message('en')

  const { data: log, error: logError } = await admin.from('push_announcements').insert({
    platform: 'BOOKSTORE',
    kind: 'NEW_BOOKS',
    title_lo: lo.title,
    body_lo: lo.body,
    title_en: en.title,
    body_en: en.body,
    url: en.url,
    status: 'SENDING',
    last_book_created_at: newest,
  }).select('id').single()
  if (logError) throw logError

  const result = await sendToPlatform(admin, 'BOOKSTORE', message, 12 * 60 * 60)
  await admin.from('push_announcements').update({
    status: 'SENT', sent_count: result.sent, failed_count: result.failed, sent_at: new Date().toISOString(),
  }).eq('id', log.id)
  return { ...result, books: total }
}

// ─── announcement / shared platform fan-out ──────────────────────────────────

async function sendToPlatform(
  admin: SupabaseClient,
  platform: Platform | 'ALL',
  messageFor: (lang: Lang) => PushMessage,
  ttl: number,
) {
  const rows: SubscriptionRow[] = []
  // Page through every enabled device.
  for (let from = 0; ; from += 1000) {
    let query = admin.from('push_subscriptions').select('id,user_id,endpoint,p256dh,auth').order('id').range(from, from + 999)
    if (platform === 'BOOKSTORE') query = query.eq('bookstore_enabled', true)
    if (platform === 'ACADEMY') query = query.eq('academy_enabled', true)
    const { data, error } = await query
    if (error) throw error
    rows.push(...((data ?? []) as SubscriptionRow[]))
    if (!data || data.length < 1000) break
  }
  if (!rows.length) return { sent: 0, failed: 0, removed: 0 }

  const users = await languagesFor(admin, [...new Set(rows.map(row => row.user_id))])
  const byLang = { lo: messageFor('lo'), en: messageFor('en') }
  return deliver(admin, rows, row => byLang[users.get(row.user_id)?.lang ?? 'lo'], { ttl })
}

interface AnnouncementText {
  title_lo?: string | null
  body_lo?: string | null
  title_en?: string | null
  body_en?: string | null
  url?: string | null
}

const cleanText = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '')

/** The announcement in the member's language, falling back to the other one. */
function announcementMessage(item: AnnouncementText, lang: Lang, tag: string): PushMessage | undefined {
  const lo = { title: cleanText(item.title_lo, 80), body: cleanText(item.body_lo, 240) }
  const en = { title: cleanText(item.title_en, 80), body: cleanText(item.body_en, 240) }
  const [first, second] = lang === 'lo' ? [lo, en] : [en, lo]
  const title = first.title || second.title
  const body = first.body || second.body
  const url = cleanText(item.url, 500)
  if (!title || !body || !url.startsWith('/') || url.startsWith('//')) return undefined
  return { title, body, url, tag }
}

function draftMessage(draft: unknown, lang: Lang) {
  return typeof draft === 'object' && draft ? announcementMessage(draft as AnnouncementText, lang, 'bitdoin-test') : undefined
}

async function sendAnnouncement(admin: SupabaseClient, id: string) {
  // Claim the row so a double click cannot send it twice.
  const { data: item, error } = await admin
    .from('push_announcements')
    .update({ status: 'SENDING' })
    .eq('id', id)
    .eq('kind', 'ANNOUNCEMENT')
    .eq('status', 'PENDING')
    .select('*')
    .maybeSingle()
  if (error) throw error
  if (!item) return { error: 'Announcement not found or already sent', status: 409 }

  const messageFor = (lang: Lang): PushMessage =>
    announcementMessage(item, lang, `announcement-${item.id}`) ?? { title: 'Bitdoin', body: '', url: '/', tag: `announcement-${item.id}` }

  try {
    const result = await sendToPlatform(admin, item.platform, messageFor, 24 * 60 * 60)
    await admin.from('push_announcements').update({
      status: 'SENT', sent_count: result.sent, failed_count: result.failed, sent_at: new Date().toISOString(),
    }).eq('id', id)
    return result
  } catch (sendError) {
    await admin.from('push_announcements').update({ status: 'FAILED' }).eq('id', id)
    throw sendError
  }
}

async function sendTest(admin: SupabaseClient, userId: string, platform: Platform, draft?: PushMessage) {
  const { data: rows, error } = await admin
    .from('push_subscriptions')
    .select('id,user_id,endpoint,p256dh,auth')
    .eq('user_id', userId)
  if (error) throw error
  if (!rows?.length) return { sent: 0, failed: 0, removed: 0 }
  const users = await languagesFor(admin, [userId])
  const message = draft ?? testMessage(users.get(userId)?.lang ?? 'lo', platform)
  return deliver(admin, rows as SubscriptionRow[], () => message, { ttl: 60 * 60 })
}

// ─── engagement ──────────────────────────────────────────────────────────────

interface EngagementPick {
  user_id: string
  kind: EngagementKind
  language: string | null
  params: EngagementParams | null
}

interface PhoneRow extends SubscriptionRow {
  engagement_enabled: boolean
  wellbeing_enabled: boolean
}

// A streak reminder that arrives after the evening is worse than none; a break nudge is only useful right away.
const ENGAGEMENT_TTL: Record<EngagementKind, number> = {
  STREAK_AT_RISK: 3 * 60 * 60,
  XP_RIVAL: 3 * 60 * 60,
  DAILY_NOT_OPENED: 3 * 60 * 60,
  COMEBACK: 3 * 60 * 60,
  BREAK: 30 * 60,
  WINDDOWN: 60 * 60,
}

async function sendEngagement(admin: SupabaseClient) {
  // The database picks who gets what and records it, so overlapping runs cannot double-send.
  const { data: claimed, error } = await admin.rpc('push_claim_engagement', { p_limit: 500 })
  if (error) throw error
  const picks = (claimed ?? []) as EngagementPick[]
  if (!picks.length) return { sent: 0, picked: 0 }

  const userIds = [...new Set(picks.map(pick => pick.user_id))]
  const phones: PhoneRow[] = []
  for (let i = 0; i < userIds.length; i += 200) {
    const { data, error: phonesError } = await admin
      .from('push_subscriptions')
      .select('id,user_id,endpoint,p256dh,auth,engagement_enabled,wellbeing_enabled')
      .in('user_id', userIds.slice(i, i + 200))
      .like('endpoint', 'native://%')
    if (phonesError) throw phonesError
    phones.push(...((data ?? []) as PhoneRow[]))
  }

  const date = laosNow().date
  const totals = { sent: 0, failed: 0, removed: 0 }
  const reached = new Set<string>()
  for (const kind of ENGAGEMENT_KINDS) {
    const wellbeing = WELLBEING_KINDS.includes(kind)
    const rows = picks.filter(pick => pick.kind === kind).flatMap(pick => phones
      .filter(phone => phone.user_id === pick.user_id && (wellbeing ? phone.wellbeing_enabled : phone.engagement_enabled))
      .map(phone => ({ ...phone, pick })))
    if (!rows.length) continue
    const result = await deliver(admin, rows, row => engagementMessage(kind, asLang(row.pick.language), row.pick.params ?? {}, date), {
      ttl: ENGAGEMENT_TTL[kind],
      onDelivered: row => reached.add(`${row.pick.user_id}:${kind}`),
    })
    totals.sent += result.sent
    totals.failed += result.failed
    totals.removed += result.removed
  }

  // Nothing got through (no phone left, or a temporary failure): give the claim back so the next run tries again.
  const unreached = picks.filter(pick => !reached.has(`${pick.user_id}:${pick.kind}`))
  await Promise.all(unreached.map(pick => admin.rpc('push_release_engagement', { p_user_id: pick.user_id, p_kind: pick.kind })))
  return { ...totals, picked: picks.length, released: unreached.length }
}

/** Staff preview of one engagement message on their own devices. */
async function sendEngagementPreview(admin: SupabaseClient, userId: string, kind: EngagementKind) {
  const { data: rows, error } = await admin
    .from('push_subscriptions')
    .select('id,user_id,endpoint,p256dh,auth')
    .eq('user_id', userId)
  if (error) throw error
  if (!rows?.length) return { sent: 0, failed: 0, removed: 0 }
  const users = await languagesFor(admin, [userId])
  const message = engagementMessage(kind, users.get(userId)?.lang ?? 'lo', { streak: 5, gap: 40, rank: 3, days: 4 }, laosNow().date)
  return deliver(admin, rows as SubscriptionRow[], () => message, { ttl: 60 * 60 })
}

// ─── HTTP ────────────────────────────────────────────────────────────────────

/**
 * The congratulation after a PhaJay payment starts or extends a Premium membership (phajay-checkout and
 * phajay-webhook call this). It goes to the member's devices that have Academy notifications on.
 */
async function sendMembershipActivated(admin: SupabaseClient, userId: string, endsAt: string, extendsPrevious: boolean) {
  const { data: rows, error } = await admin
    .from('push_subscriptions')
    .select('id,user_id,endpoint,p256dh,auth')
    .eq('user_id', userId)
    .eq('academy_enabled', true)
  if (error) throw error
  if (!rows?.length) return { sent: 0, failed: 0, removed: 0 }
  const users = await languagesFor(admin, [userId])
  const message = membershipActivatedMessage(users.get(userId)?.lang ?? 'lo', endsAt, extendsPrevious)
  return deliver(admin, rows as SubscriptionRow[], () => message, { ttl: 24 * 60 * 60 })
}

/** True only for a caller that presents the service role key: this action must never be reachable by a member. */
function isServiceCall(req: Request) {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  if (!token || !SUPABASE_SERVICE_KEY || token.length !== SUPABASE_SERVICE_KEY.length) return false
  let difference = 0
  for (let i = 0; i < token.length; i++) difference |= token.charCodeAt(i) ^ SUPABASE_SERVICE_KEY.charCodeAt(i)
  return difference === 0
}

async function signedInUser(req: Request) {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  if (!token) return null
  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data: { user } } = await authClient.auth.getUser(token)
  return user
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405)
  const webReady = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY)
  if (!webReady && !nativeSender.configured.ios && !nativeSender.configured.android) return json(req, { skipped: 'No push keys set' })

  // Without VAPID keys browsers cannot be reached (their sends fail); phones still can.
  if (webReady) webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
  const body = await req.json().catch(() => ({})) as {
    action?: string; id?: string; platform?: string; draft?: unknown; user_id?: string; ends_at?: string; extends_previous?: boolean; kind?: string
  }

  try {
    switch (body.action) {
      case 'academy-daily':
        return json(req, await sendAcademyDaily(admin))
      case 'new-books':
        return json(req, await sendNewBooks(admin))
      case 'academic-reminders':
        return json(req, await sendAcademicReminders(admin))
      case 'engagement':
        return json(req, await sendEngagement(admin))
      case 'test-engagement': {
        const user = await signedInUser(req)
        if (!user) return json(req, { error: 'Please sign in.' }, 401)
        const { data: profile } = await admin.from('users').select('role').eq('id', user.id).maybeSingle()
        if (!STAFF_ROLES.includes(profile?.role ?? '')) return json(req, { error: 'Not allowed' }, 403)
        const kind = ENGAGEMENT_KINDS.find(item => item === body.kind)
        if (!kind) return json(req, { error: 'Unknown kind' }, 400)
        return json(req, await sendEngagementPreview(admin, user.id, kind))
      }
      case 'membership-activated': {
        if (!isServiceCall(req)) return json(req, { error: 'Not allowed' }, 403)
        const validId = typeof body.user_id === 'string' && /^[0-9a-f-]{36}$/i.test(body.user_id)
        if (!validId || typeof body.ends_at !== 'string' || Number.isNaN(Date.parse(body.ends_at))) return json(req, { error: 'Invalid request' }, 400)
        return json(req, await sendMembershipActivated(admin, body.user_id as string, body.ends_at, body.extends_previous === true))
      }
      case 'announcement': {
        const user = await signedInUser(req)
        if (!user) return json(req, { error: 'Please sign in.' }, 401)
        const { data: profile } = await admin.from('users').select('role').eq('id', user.id).maybeSingle()
        if (!STAFF_ROLES.includes(profile?.role ?? '')) return json(req, { error: 'Not allowed' }, 403)
        if (typeof body.id !== 'string') return json(req, { error: 'Missing announcement id' }, 400)
        const result = await sendAnnouncement(admin, body.id)
        return 'status' in result ? json(req, { error: result.error }, result.status) : json(req, result)
      }
      case 'test': {
        const user = await signedInUser(req)
        if (!user) return json(req, { error: 'Please sign in.' }, 401)
        const platform = body.platform === 'ACADEMY' ? 'ACADEMY' : 'BOOKSTORE'
        // Staff can preview an announcement draft on their own devices.
        let draft: PushMessage | undefined
        if (body.draft) {
          const { data: profile } = await admin.from('users').select('role,language').eq('id', user.id).maybeSingle()
          if (!STAFF_ROLES.includes(profile?.role ?? '')) return json(req, { error: 'Not allowed' }, 403)
          draft = draftMessage(body.draft, asLang(profile?.language))
          if (!draft) return json(req, { error: 'Invalid draft' }, 400)
        }
        return json(req, await sendTest(admin, user.id, platform, draft))
      }
      default:
        return json(req, { error: 'Unknown action' }, 400)
    }
  } catch (error) {
    console.error('[send-push]', error)
    return json(req, { error: error instanceof Error ? error.message : String(error) }, 500)
  }
})
