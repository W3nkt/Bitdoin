import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Drafts the WhatsApp message that tells an Academy member their membership
// request was approved or declined, or (with kind: 'expiry') reminds them that
// their paid membership is about to end or has ended. Sending stays manual: the admin reviews
// (and may edit) the draft, then taps "Open WhatsApp", which opens a wa.me
// chat with the text filled in. Everything in the draft is read from the
// database by subscription id, so the caller cannot change its facts.
//
// Optional secret: PUBLIC_APP_URL (default https://bitdoin.store)

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const PUBLIC_APP_URL = (Deno.env.get('PUBLIC_APP_URL') ?? 'https://bitdoin.store').replace(/\/+$/, '')
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)

const SUPERSEDED_REASON = 'Superseded by a newer subscription request.'
// Keep in sync with EXPIRY_WARNING_DAYS in src/lib/academyMembership.ts.
const EXPIRY_WARNING_DAYS = 5
const DAY_MS = 24 * 60 * 60 * 1000

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

function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(req) },
  })
}

// Lao mobile numbers arrive as +85620XXXXXXXX (onboarding), 020XXXXXXXX or
// 20XXXXXXXX (typed by hand). wa.me wants international digits only.
function normalizeLaoWhatsApp(raw: string | null | undefined) {
  const digits = (raw ?? '').replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('856') && digits.length >= 11) return digits
  if (digits.startsWith('020') && digits.length === 11) return `856${digits.slice(1)}`
  if (digits.startsWith('20') && digits.length === 10) return `856${digits}`
  if (digits.length >= 10) return digits
  return null
}

type Outcome = 'APPROVED' | 'DECLINED' | 'EXPIRING' | 'EXPIRED'

const SUBJECTS: Record<Outcome, string> = {
  APPROVED: 'Academy membership approved',
  DECLINED: 'Academy membership declined',
  EXPIRING: 'Academy membership expiring',
  EXPIRED: 'Academy membership expired',
}

// In Laos time. Lao messages use day/month/year (9/10/2026), like the app.
function formatMessageDate(iso: string, lao: boolean) {
  const date = new Date(iso)
  if (!lao) {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Vientiane' }).format(date)
  }
  const parts = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'Asia/Vientiane' })
    .formatToParts(date)
  const part = (type: string) => parts.find(p => p.type === type)?.value ?? ''
  return `${part('day')}/${part('month')}/${part('year')}`
}

function draftMessage(
  outcome: Outcome,
  lao: boolean,
  vars: { name: string; plan: string; reason: string; link: string; date: string; days: number },
) {
  if (outcome === 'EXPIRING') {
    return lao
      ? `ສະບາຍດີ ${vars.name} 👋
ສະມາຊິກ Bitdoin Academy (${vars.plan}) ຂອງທ່ານຈະໝົດອາຍຸໃນອີກ ${vars.days} ມື້ (ວັນທີ ${vars.date}).

ຕໍ່ອາຍຸໄດ້ທີ່ນີ້ ເພື່ອສືບຕໍ່ຮຽນ, ໃຊ້ AI Coach ແລະ ຮັກສາການຮຽນຕໍ່ເນື່ອງຂອງທ່ານ 🔥
${vars.link}

ຖ້າມີຄຳຖາມ, ຕອບກັບຂໍ້ຄວາມນີ້ໄດ້ເລີຍ 🙏`
      : `Hi ${vars.name} 👋
Your Bitdoin Academy membership (${vars.plan}) expires in ${vars.days} ${vars.days === 1 ? 'day' : 'days'} (on ${vars.date}).

Renew here to keep learning, keep using the AI Coach and keep your streak going 🔥
${vars.link}

If you have any questions, just reply to this message 🙏`
  }
  if (outcome === 'EXPIRED') {
    return lao
      ? `ສະບາຍດີ ${vars.name} 👋
ສະມາຊິກ Bitdoin Academy (${vars.plan}) ຂອງທ່ານໄດ້ໝົດອາຍຸແລ້ວ ເມື່ອວັນທີ ${vars.date}.

ບົດຮຽນ ແລະ ຄວາມຄືບໜ້າຂອງທ່ານຍັງຢູ່ຄົບ. ສະໝັກອີກຄັ້ງເພື່ອສືບຕໍ່ຮຽນໄດ້ທີ່:
${vars.link}

ຖ້າມີຄຳຖາມ, ຕອບກັບຂໍ້ຄວາມນີ້ໄດ້ເລີຍ 🙏`
      : `Hi ${vars.name} 👋
Your Bitdoin Academy membership (${vars.plan}) expired on ${vars.date}.

Your lessons and progress are all still here. Subscribe again to pick up where you left off:
${vars.link}

If you have any questions, just reply to this message 🙏`
  }
  if (outcome === 'APPROVED') {
    return lao
      ? `ສະບາຍດີ ${vars.name}! 🎉\nການສະໝັກສະມາຊິກ Bitdoin Academy (${vars.plan}) ຂອງທ່ານໄດ້ຮັບການອະນຸມັດແລ້ວ.\n\nເລີ່ມຮຽນໄດ້ເລີຍທີ່: ${vars.link}\n\nຂອບໃຈທີ່ເລືອກ Bitdoin Academy 🙏`
      : `Hi ${vars.name}! 🎉\nYour Bitdoin Academy membership (${vars.plan}) has been approved.\n\nStart learning here: ${vars.link}\n\nThank you for choosing Bitdoin Academy 🙏`
  }
  return lao
    ? `ສະບາຍດີ ${vars.name}.\nຂໍອະໄພ, ຄຳຮ້ອງສະໝັກສະມາຊິກ Bitdoin Academy (${vars.plan}) ຂອງທ່ານຍັງບໍ່ໄດ້ຮັບການອະນຸມັດ.\n\nເຫດຜົນ: ${vars.reason}\n\nທ່ານສາມາດກວດສອບ ແລະ ສົ່ງຄຳຮ້ອງໃໝ່ໄດ້ທີ່: ${vars.link}\nຖ້າມີຄຳຖາມ, ຕອບກັບຂໍ້ຄວາມນີ້ໄດ້ເລີຍ.`
    : `Hi ${vars.name}.\nSorry, your Bitdoin Academy membership request (${vars.plan}) was not approved.\n\nReason: ${vars.reason}\n\nYou can review it and apply again here: ${vars.link}\nIf you have any questions, just reply to this message.`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(req) })
  if (req.method !== 'POST') return jsonResponse(req, { error: 'Method not allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse(req, { error: 'Authentication required' }, 401)

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })

    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) return jsonResponse(req, { error: 'Invalid session' }, 401)
    const { data: roleRow } = await admin.from('users').select('role').eq('id', user.id).maybeSingle()
    if (roleRow?.role !== 'ADMIN') return jsonResponse(req, { error: 'Administrator access is required.' }, 403)

    const { subscription_id: subscriptionId, kind } = await req.json().catch(() => ({})) as { subscription_id?: string; kind?: string }
    if (!subscriptionId) return jsonResponse(req, { error: 'subscription_id is required' }, 400)

    const { data: subscription, error: subscriptionError } = await admin
      .from('premium_subscriptions')
      .select('id,user_id,status,ends_at,rejection_reason,plan:premium_plans(name)')
      .eq('id', subscriptionId)
      .maybeSingle()
    if (subscriptionError) throw subscriptionError
    if (!subscription) return jsonResponse(req, { error: 'Subscription not found' }, 404)

    const remainingMs = subscription.ends_at ? new Date(subscription.ends_at).getTime() - Date.now() : null
    let outcome: Outcome | null
    if (kind === 'expiry') {
      // Paid rows stay ACTIVE after ends_at, so expiry is read from the date.
      const ending = (subscription.status === 'ACTIVE' || subscription.status === 'EXPIRED') && remainingMs != null
      outcome = !ending ? null : remainingMs <= 0 ? 'EXPIRED' : remainingMs <= EXPIRY_WARNING_DAYS * DAY_MS ? 'EXPIRING' : null
      if (!outcome) return jsonResponse(req, { error: `This membership does not end within ${EXPIRY_WARNING_DAYS} days.` }, 409)
    } else {
      outcome = subscription.status === 'ACTIVE'
        ? 'APPROVED'
        : subscription.status === 'CANCELLED' && subscription.rejection_reason && subscription.rejection_reason !== SUPERSEDED_REASON
          ? 'DECLINED'
          : null
      if (!outcome) return jsonResponse(req, { error: 'This subscription has not been approved or declined.' }, 409)
    }

    const [{ data: member }, { data: onboarding }] = await Promise.all([
      admin.from('users').select('name,phone,language').eq('id', subscription.user_id).maybeSingle(),
      admin.from('premium_onboarding_responses').select('whatsapp_number').eq('user_id', subscription.user_id).maybeSingle(),
    ])

    const plan = Array.isArray(subscription.plan) ? subscription.plan[0] : subscription.plan
    const lao = (member?.language ?? 'lo') === 'lo'
    const vars = {
      name: member?.name?.trim() || (lao ? 'ສະມາຊິກ' : 'there'),
      plan: plan?.name ?? 'Academy',
      reason: subscription.rejection_reason ?? '',
      link: outcome === 'APPROVED'
        ? `${PUBLIC_APP_URL}/academy/home`
        : outcome === 'DECLINED' ? `${PUBLIC_APP_URL}/academy/subscription` : `${PUBLIC_APP_URL}/academy/subscription#plans`,
      date: subscription.ends_at ? formatMessageDate(subscription.ends_at, lao) : '',
      days: remainingMs != null ? Math.max(1, Math.ceil(remainingMs / DAY_MS)) : 0,
    }
    const message = draftMessage(outcome, lao, vars)
    // The member's Academy WhatsApp number wins; fall back to the account phone.
    const recipient = normalizeLaoWhatsApp(onboarding?.whatsapp_number) ?? normalizeLaoWhatsApp(member?.phone)

    const { data: notification } = await admin.from('notifications').insert({
      user_id: subscription.user_id,
      channel: 'WHATSAPP',
      recipient: recipient ?? 'unknown',
      subject: SUBJECTS[outcome],
      message,
      status: recipient ? 'DRAFTED' : 'NO_RECIPIENT',
    }).select('id').maybeSingle()

    // notificationId lets the admin page mark the draft SENT once WhatsApp is opened.
    return jsonResponse(req, { outcome, message, memberName: vars.name, recipient, notificationId: notification?.id ?? null })
  } catch (err) {
    console.error('[notify-member-whatsapp]', err)
    return jsonResponse(req, { error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
