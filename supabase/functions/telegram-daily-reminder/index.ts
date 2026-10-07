import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Sends each linked member one Telegram learning reminder per day, in their
// chosen slot (Laos time). Called every 15 minutes by pg_cron
// (migration 093). Safe to call any number of times: a member is claimed for
// today before the message is sent, so nobody is reminded twice.
//
// Each run also keeps the bot's webhook pointed at telegram-webhook with the
// right secret, so linking works without a manual setWebhook call.
//
// Secrets: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET,
//          PUBLIC_APP_URL (default https://bitdoin.store)

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? ''
const TELEGRAM_WEBHOOK_SECRET = Deno.env.get('TELEGRAM_WEBHOOK_SECRET') ?? ''
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/telegram-webhook`
const PUBLIC_APP_URL = (Deno.env.get('PUBLIC_APP_URL') ?? 'https://bitdoin.store').replace(/\/+$/, '')

// Laos is UTC+7 all year (no daylight saving).
const LAOS_OFFSET_MS = 7 * 60 * 60 * 1000
// Slot start, in minutes after midnight Laos time.
const SLOT_MINUTES: Record<string, number> = { MORNING: 7 * 60 + 30, AFTERNOON: 12 * 60 + 30, EVENING: 19 * 60 + 30 }
// Telegram allows ~30 messages/second for bulk sends; stay under it.
const SEND_GAP_MS = 45

function laosNow() {
  const local = new Date(Date.now() + LAOS_OFFSET_MS)
  return {
    date: local.toISOString().slice(0, 10),
    minutes: local.getUTCHours() * 60 + local.getUTCMinutes(),
  }
}

function escapeHtml(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function reminderText(lao: boolean, name: string, mentor: { quote: string; challenge: string } | null) {
  const greeting = lao
    ? `🌱 <b>ສະບາຍດີ ${escapeHtml(name)}!</b> ເຖິງເວລາຮຽນປະຈຳວັນຂອງທ່ານແລ້ວ.`
    : `🌱 <b>Hi ${escapeHtml(name)}!</b> It's time for today's learning.`
  const body = mentor
    ? `\n\n💬 <i>${escapeHtml(mentor.quote)}</i>\n\n🎯 ${lao ? 'ຄວາມທ້າທາຍມື້ນີ້' : "Today's challenge"}: ${escapeHtml(mentor.challenge)}`
    : `\n\n${lao ? 'ໃຊ້ເວລາພຽງ 10 ນາທີ ເພື່ອຮຽນບົດຮຽນໃໝ່ ແລະ ຮັກສາ streak ຂອງທ່ານ 🔥' : 'Spend just 10 minutes on a new lesson and keep your streak going 🔥'}`
  const footer = lao ? '\n\nພິມ /stop ເພື່ອຢຸດການແຈ້ງເຕືອນ.' : '\n\nSend /stop to pause reminders.'
  return greeting + body + footer
}

interface WebhookInfo {
  url?: string
  pending_update_count?: number
  last_error_date?: number
  last_error_message?: string
}

async function telegram<T>(method: string, body?: Record<string, unknown>) {
  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  const payload = await response.json().catch(() => ({})) as { ok?: boolean; result?: T; description?: string }
  if (!payload.ok) throw new Error(payload.description ?? `Telegram ${method} failed (${response.status})`)
  return payload.result as T
}

// Register (or repair) the webhook: wrong/missing URL, or a recent
// auth error from our endpoint, which means the secret does not match.
async function ensureWebhook() {
  const info = await telegram<WebhookInfo>('getWebhookInfo')
  const recentError = Boolean(info.last_error_date && Date.now() / 1000 - info.last_error_date < 20 * 60)
  const authError = recentError && /40[13]/.test(info.last_error_message ?? '')
  if (info.url === WEBHOOK_URL && !authError) {
    return { url: info.url, pending: info.pending_update_count ?? 0, lastError: info.last_error_message ?? null, repaired: false }
  }
  await telegram('setWebhook', { url: WEBHOOK_URL, secret_token: TELEGRAM_WEBHOOK_SECRET, allowed_updates: ['message'] })
  return { url: WEBHOOK_URL, pending: info.pending_update_count ?? 0, previousUrl: info.url || null, previousError: info.last_error_message ?? null, repaired: true }
}

serve(async () => {
  if (!TELEGRAM_BOT_TOKEN) return new Response(JSON.stringify({ skipped: 'TELEGRAM_BOT_TOKEN not set' }), { status: 200 })

  let webhook: unknown = null
  if (TELEGRAM_WEBHOOK_SECRET) {
    webhook = await ensureWebhook().catch(error => ({ error: error instanceof Error ? error.message : String(error) }))
  } else {
    webhook = { error: 'TELEGRAM_WEBHOOK_SECRET not set' }
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
  const now = laosNow()
  const dueSlots = Object.entries(SLOT_MINUTES).filter(([, start]) => now.minutes >= start).map(([slot]) => slot)
  if (!dueSlots.length) return new Response(JSON.stringify({ sent: 0, reason: 'no slot due yet', webhook }))

  const { data: due, error: dueError } = await admin
    .from('premium_telegram_links')
    .select('user_id,chat_id')
    .not('chat_id', 'is', null)
    .eq('reminders_enabled', true)
    .in('reminder_slot', dueSlots)
    .or(`last_reminded_on.is.null,last_reminded_on.lt.${now.date}`)
    .limit(500)
  if (dueError) {
    console.error('[telegram-daily-reminder]', dueError)
    return new Response(JSON.stringify({ error: dueError.message }), { status: 500 })
  }
  if (!due?.length) return new Response(JSON.stringify({ sent: 0, webhook }))

  const [{ data: mentor }, { data: members }] = await Promise.all([
    admin.from('premium_daily_motivations').select('quote,challenge').eq('publish_date', now.date).eq('is_active', true).maybeSingle(),
    admin.from('users').select('id,name,language').in('id', due.map(row => row.user_id)),
  ])
  const memberById = new Map((members ?? []).map(member => [member.id, member]))

  let sent = 0
  let failed = 0
  for (const row of due) {
    // Claim today's reminder first so overlapping runs cannot double-send.
    const { data: claimed } = await admin
      .from('premium_telegram_links')
      .update({ last_reminded_on: now.date })
      .eq('user_id', row.user_id)
      .or(`last_reminded_on.is.null,last_reminded_on.lt.${now.date}`)
      .select('user_id')
    if (!claimed?.length) continue

    const member = memberById.get(row.user_id)
    const lao = (member?.language ?? 'lo') === 'lo'
    const name = member?.name?.trim() || (lao ? 'ສະມາຊິກ' : 'there')
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: row.chat_id,
        text: reminderText(lao, name, mentor),
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: {
          inline_keyboard: [[{ text: lao ? '📚 ເປີດ Academy' : '📚 Open Academy', url: `${PUBLIC_APP_URL}/academy/home` }]],
        },
      }),
    }).catch(() => null)

    if (response?.ok) {
      sent += 1
    } else {
      failed += 1
      // 403 = the member blocked the bot; stop trying until they reconnect.
      if (response?.status === 403) {
        await admin.from('premium_telegram_links').update({ reminders_enabled: false }).eq('user_id', row.user_id)
      } else {
        // Temporary failure: release today's claim so the next run retries.
        await admin.from('premium_telegram_links').update({ last_reminded_on: null }).eq('user_id', row.user_id).eq('last_reminded_on', now.date)
      }
    }
    await new Promise(resolve => setTimeout(resolve, SEND_GAP_MS))
  }

  return new Response(JSON.stringify({ sent, failed, date: now.date, webhook }))
})
