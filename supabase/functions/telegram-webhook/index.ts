import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Telegram bot webhook for Academy daily reminders.
//   /start <token>  link this chat to the member who generated the token
//   /stop           pause daily reminders
//   /resume         turn daily reminders back on
//
// Secrets:
//   TELEGRAM_BOT_TOKEN       from @BotFather
//   TELEGRAM_WEBHOOK_SECRET  any random string; also passed to setWebhook as
//                            secret_token, so Telegram signs every update
//   PUBLIC_APP_URL           default https://bitdoin.store

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? ''
const TELEGRAM_WEBHOOK_SECRET = Deno.env.get('TELEGRAM_WEBHOOK_SECRET') ?? ''
const PUBLIC_APP_URL = (Deno.env.get('PUBLIC_APP_URL') ?? 'https://bitdoin.store').replace(/\/+$/, '')

const SLOT_LABEL: Record<string, { lo: string; en: string }> = {
  MORNING: { lo: 'ຕອນເຊົ້າ (07:30)', en: 'Morning (7:30)' },
  AFTERNOON: { lo: 'ຕອນບ່າຍ (12:30)', en: 'Afternoon (12:30)' },
  EVENING: { lo: 'ຕອນແລງ (19:30)', en: 'Evening (19:30)' },
}

interface TelegramUpdate {
  message?: {
    text?: string
    chat: { id: number }
    from?: { username?: string; language_code?: string }
  }
}

async function reply(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  }).catch(error => console.error('[telegram-webhook] reply failed', error))
}

serve(async (req) => {
  if (req.method !== 'POST') return new Response('ok')
  if (!TELEGRAM_WEBHOOK_SECRET || req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== TELEGRAM_WEBHOOK_SECRET) {
    return new Response('forbidden', { status: 403 })
  }

  // Always answer 200 so Telegram does not retry the same update forever.
  try {
    const update = await req.json() as TelegramUpdate
    const message = update.message
    const text = message?.text?.trim() ?? ''
    if (!message || !text.startsWith('/')) return new Response('ok')

    const chatId = message.chat.id
    const [rawCommand, argument] = text.split(/\s+/, 2)
    // Commands can arrive as /stop@BitdoinBot.
    const command = rawCommand.split('@')[0].toLowerCase()
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
    const profileLink = `${PUBLIC_APP_URL}/academy/profile`

    if (command === '/start' && argument) {
      const { data: link } = await admin
        .from('premium_telegram_links')
        .select('user_id,reminder_slot,link_token_expires_at')
        .eq('link_token', argument)
        .maybeSingle()

      if (!link || !link.link_token_expires_at || new Date(link.link_token_expires_at) < new Date()) {
        await reply(chatId, `ລິ້ງນີ້ໝົດອາຍຸແລ້ວ. ກະລຸນາກົດ "ເຊື່ອມຕໍ່ Telegram" ອີກຄັ້ງໃນໂປຣໄຟລ໌ Academy.\nThis link has expired. Tap "Connect Telegram" again in your Academy profile:\n${profileLink}`)
        return new Response('ok')
      }

      // One chat belongs to one member: detach it from anyone it was linked to before.
      await admin.from('premium_telegram_links').update({ chat_id: null, linked_at: null })
        .eq('chat_id', chatId).neq('user_id', link.user_id)
      await admin.from('premium_telegram_links').update({
        chat_id: chatId,
        telegram_username: message.from?.username ?? null,
        linked_at: new Date().toISOString(),
        link_token: null,
        link_token_expires_at: null,
        reminders_enabled: true,
      }).eq('user_id', link.user_id)

      const { data: member } = await admin.from('users').select('name,language').eq('id', link.user_id).maybeSingle()
      const slot = SLOT_LABEL[link.reminder_slot] ?? SLOT_LABEL.MORNING
      const name = member?.name?.trim() || ''
      await reply(chatId, (member?.language ?? 'lo') === 'lo'
        ? `ເຊື່ອມຕໍ່ສຳເລັດ ✅ ສະບາຍດີ ${name}!\nທ່ານຈະໄດ້ຮັບການແຈ້ງເຕືອນການຮຽນຈາກ Bitdoin Academy ທຸກມື້, ${slot.lo}.\n\nພິມ /stop ເພື່ອຢຸດ, /resume ເພື່ອເປີດຄືນ.`
        : `Connected ✅ Hi ${name}!\nYou'll get a daily Bitdoin Academy learning reminder every ${slot.en}.\n\nSend /stop to pause or /resume to turn it back on.`)
      return new Response('ok')
    }

    const { data: linked } = await admin
      .from('premium_telegram_links')
      .select('user_id')
      .eq('chat_id', chatId)
      .maybeSingle()

    if (command === '/stop' || command === '/resume') {
      if (!linked) {
        await reply(chatId, `ບັນຊີ Telegram ນີ້ຍັງບໍ່ໄດ້ເຊື່ອມຕໍ່.\nThis Telegram account is not connected yet:\n${profileLink}`)
        return new Response('ok')
      }
      const enable = command === '/resume'
      await admin.from('premium_telegram_links').update({ reminders_enabled: enable }).eq('user_id', linked.user_id)
      await reply(chatId, enable
        ? 'ເປີດການແຈ້ງເຕືອນປະຈຳວັນແລ້ວ 🔔\nDaily reminders are on again 🔔'
        : 'ຢຸດການແຈ້ງເຕືອນປະຈຳວັນແລ້ວ. ພິມ /resume ເພື່ອເປີດຄືນ.\nDaily reminders paused. Send /resume to turn them back on.')
      return new Response('ok')
    }

    // Plain /start or anything else: explain how to connect.
    await reply(chatId, linked
      ? 'ທ່ານເຊື່ອມຕໍ່ແລ້ວ ✅ ພິມ /stop ເພື່ອຢຸດ ຫຼື /resume ເພື່ອເປີດການແຈ້ງເຕືອນ.\nYou are connected ✅ Send /stop to pause or /resume to turn reminders on.'
      : `ສະບາຍດີ! ເພື່ອຮັບການແຈ້ງເຕືອນ, ເປີດໂປຣໄຟລ໌ Bitdoin Academy ແລ້ວກົດ "ເຊື່ອມຕໍ່ Telegram".\nHi! To get daily reminders, open your Bitdoin Academy profile and tap "Connect Telegram":\n${profileLink}`)
  } catch (error) {
    console.error('[telegram-webhook]', error)
  }
  return new Response('ok')
})
