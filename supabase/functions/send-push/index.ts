import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'
import {
  academyDailyMessage,
  newBooksMessage,
  testMessage,
  type Lang,
  type NewBook,
  type PushMessage,
} from './messages.ts'

// Sends Web Push notifications (browser + home-screen app) for both platforms.
// Devices and their per-platform switches live in push_subscriptions
// (migration 102). Actions (POST JSON { action, ... }):
//
//   academy-daily  pg_cron, every 15 min. One reminder per device per day in
//                  the member's slot (Laos time). Safe to call any number of
//                  times: a device is claimed for today before it is sent.
//   new-books      pg_cron, daily 18:00 Laos. One digest of books added since
//                  the last digest; nothing is sent when there are none.
//   announcement   Staff only. { id } of a PENDING push_announcements row.
//   test           Signed-in user. Sends a test to the caller's own devices.
//
// Dead subscriptions (404/410 from the push service) are deleted.
//
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:...),
//          ALLOWED_ORIGINS (optional, comma separated)

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@bitdoin.store'
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

/**
 * Sends one message per row. Returns counts; deletes subscriptions the push
 * service says are gone, and records the last successful delivery.
 */
async function deliver(
  admin: SupabaseClient,
  rows: SubscriptionRow[],
  messageFor: (row: SubscriptionRow) => PushMessage,
  options: { ttl: number; onFailure?: (row: SubscriptionRow) => Promise<void> },
) {
  let sent = 0
  let failed = 0
  const gone: string[] = []
  const delivered: string[] = []

  for (let i = 0; i < rows.length; i += SEND_CONCURRENCY) {
    await Promise.all(rows.slice(i, i + SEND_CONCURRENCY).map(async row => {
      try {
        await webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          JSON.stringify(messageFor(row)),
          // No Topic header: Apple rejects it (400 BadWebPushTopic). The
          // payload's `tag` already replaces an older notification on device.
          { TTL: options.ttl, urgency: 'normal' },
        )
        sent += 1
        delivered.push(row.id)
      } catch (error) {
        failed += 1
        const status = (error as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) {
          gone.push(row.id)
        } else {
          console.error('[send-push] delivery failed', status, (error as Error).message)
          await options.onFailure?.(row)
        }
      }
    }))
  }

  if (gone.length) await admin.from('push_subscriptions').delete().in('id', gone)
  if (delivered.length) {
    await admin.from('push_subscriptions').update({ last_success_at: new Date().toISOString() }).in('id', delivered)
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

// ─── HTTP ────────────────────────────────────────────────────────────────────

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
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return json(req, { skipped: 'VAPID keys not set' })

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
  const body = await req.json().catch(() => ({})) as { action?: string; id?: string; platform?: string; draft?: unknown }

  try {
    switch (body.action) {
      case 'academy-daily':
        return json(req, await sendAcademyDaily(admin))
      case 'new-books':
        return json(req, await sendNewBooks(admin))
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
