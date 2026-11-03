// Notification copy for send-push.

export type Lang = 'lo' | 'en'

export interface PushMessage {
  title: string
  body: string
  url: string
  tag: string
  image?: string
}

export interface NewBook {
  id: string
  title: string
  author: string | null
  cover_image_url: string | null
}

const DAY_MS = 24 * 60 * 60 * 1000

export function clip(text: string, max: number) {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  return clean.slice(0, max - 1).replace(/[\s,.;:—-]+\S*$/, '') + '…'
}

// Academy daily reminders always contain Lao quotes, even with an English UI.
// Send the full quote; the device controls how much is visible on screen.
const LAO_MOTIVATIONAL_QUOTES = [
  'ຄວາມຝັນທີ່ຈະເຮັດວຽກກັບ NGO ບໍ່ໄດ້ເລີ່ມຈາກການຮູ້ທຸກຢ່າງ ແຕ່ເລີ່ມຈາກການລົງມືເຮັດສິ່ງນ້ອຍໆມື້ນີ້.',
  'ກ້າວນ້ອຍໆທີ່ເຮັດທຸກມື້ ຈະພາເຈົ້າໄປໃກ້ຄວາມຝັນຫຼາຍຂຶ້ນ.',
  'ບໍ່ຈຳເປັນຕ້ອງເກັ່ງກ່ອນຈຶ່ງເລີ່ມ ແຕ່ຕ້ອງເລີ່ມກ່ອນຈຶ່ງຈະເກັ່ງຂຶ້ນ.',
  'ທຸກຄວາມຜິດພາດມີບົດຮຽນ ແລະ ທຸກມື້ໃໝ່ມີໂອກາດໃຫ້ເລີ່ມອີກຄັ້ງ.',
  'ຢ່າປຽບທຽບຕົນເອງກັບຄົນອື່ນ ພຽງແຕ່ໃຫ້ຕົນເອງກ້າວໜ້າຈາກມື້ວານ.',
  'ຄວາມພະຍາຍາມຂອງມື້ນີ້ ອາດເປັນຈຸດເລີ່ມຕົ້ນຂອງໂອກາດໃນມື້ອື່ນ.',
  'ພັກໄດ້ ແລ້ວຄ່ອຍກ້າວຕໍ່ ຄວາມຝັນຂອງເຈົ້າຍັງລໍຖ້າຢູ່.',
]

export interface AcademyContext {
  laosDate: string
  personalizedQuote?: string | null
  quote?: string | null
}

/** Prefer the member's daily quote, then the published quote, then a Lao fallback. */
export function academyDailyMessage(ctx: AcademyContext): PushMessage {
  const quote = [ctx.personalizedQuote, ctx.quote]
    .map(value => value?.trim())
    .find(value => value && /[\u0e80-\u0eff]/.test(value) && !/[\u0e00-\u0e7f]/.test(value))
  const day = Math.floor(Date.parse(`${ctx.laosDate}T00:00:00Z`) / DAY_MS)
  return {
    title: '💬 ຂໍ້ຄິດປະຈຳວັນ',
    body: quote || LAO_MOTIVATIONAL_QUOTES[day % LAO_MOTIVATIONAL_QUOTES.length],
    url: '/academy/home',
    tag: `academy-daily-${ctx.laosDate}`,
  }
}

/** `books` are the newest few (newest first); `total` is how many were added. */
export function newBooksMessage(books: NewBook[], total: number, lang: Lang): PushMessage {
  const lo = lang === 'lo'
  const first = books[0]
  const cover = first.cover_image_url && /^https:\/\//.test(first.cover_image_url) ? first.cover_image_url : undefined
  if (total === 1) {
    return {
      title: clip(`📚 ${lo ? 'ປຶ້ມໃໝ່' : 'New'}: ${first.title}`, 60),
      body: clip(
        lo
          ? `${first.author ? `${first.author} · ` : ''}ມາຮອດ Bitdoin ແລ້ວ. ກົດເບິ່ງລາຄາ.`
          : `${first.author ? `${first.author} · ` : ''}Just arrived at Bitdoin. Tap to see the price.`,
        110,
      ),
      url: `/bookstore/books/${first.id}`,
      tag: 'bookstore-new-books',
      image: cover,
    }
  }
  const names = books.slice(0, 2).map(book => `“${clip(book.title, 32)}”`).join(lo ? ' ແລະ ' : ' and ')
  return {
    title: lo ? `📚 ປຶ້ມໃໝ່ ${total} ຫົວ ມາຮອດແລ້ວ` : `📚 ${total} new books just arrived`,
    body: clip(lo ? `ມີ ${names}. ເປັນຄົນທຳອິດທີ່ໄດ້ເບິ່ງ.` : `Including ${names}. Be the first to see them.`, 120),
    url: '/bookstore/books?sort=newest',
    tag: 'bookstore-new-books',
    image: cover,
  }
}

// ─── My Scores reminders (migration 118) ─────────────────────────────────────

export interface ScoreReminderPayload {
  period_key?: string
  period_label_lo?: string
  period_label_en?: string
}

// Lao copy confirmed by the owner (UX-005, #14, 2026-10-23).
// Lock-screen text: no scores, no comparison, no pressure (NOTIF-004).
export function scoreReminderMessage(lang: Lang, payload: ScoreReminderPayload): PushMessage {
  const tag = `my-scores-${payload.period_key ?? 'reminder'}`
  if (lang === 'en') {
    const month = payload.period_label_en?.trim()
    return {
      title: '📒 My Scores',
      body: month ? `Whenever you're ready, add your ${month} scores.` : "Whenever you're ready, add this month's scores.",
      url: '/academy/scores?from=reminder',
      tag,
    }
  }
  const month = payload.period_label_lo?.trim()
  return {
    title: '📒 ຄະແນນຂອງຂ້ອຍ',
    body: month ? `ເມື່ອພ້ອມແລ້ວ ເພີ່ມຄະແນນເດືອນ${month.replace(/^ເດືອນ\s*/, '')}ຂອງເຈົ້າໄດ້ເລີຍ.` : 'ເມື່ອພ້ອມແລ້ວ ເພີ່ມຄະແນນປະຈຳເດືອນຂອງເຈົ້າໄດ້ເລີຍ.',
    url: '/academy/scores?from=reminder',
    tag,
  }
}

// ─── Engagement and well-being (migration 176) ───────────────────────────────

export type EngagementKind = 'STREAK_AT_RISK' | 'XP_RIVAL' | 'DAILY_NOT_OPENED' | 'COMEBACK' | 'BREAK' | 'WINDDOWN'

export const ENGAGEMENT_KINDS: EngagementKind[] = ['STREAK_AT_RISK', 'XP_RIVAL', 'DAILY_NOT_OPENED', 'COMEBACK', 'BREAK', 'WINDDOWN']

/** The two messages that tell people to stop; everything else asks them to come in. */
export const WELLBEING_KINDS: EngagementKind[] = ['BREAK', 'WINDDOWN']

export interface EngagementParams {
  streak?: number
  gap?: number
  rank?: number
  days?: number
}

// Lock-screen text: short, kind, no pressure and no shaming about missed days. Lao follows the Academy Lao
// content standard (ທ່ານ, ມື້ຮຽນຕໍ່ເນື່ອງ for streak, XP kept in Latin letters). Drafted for review by a Lao speaker.
export function engagementMessage(kind: EngagementKind, lang: Lang, params: EngagementParams, laosDate: string): PushMessage {
  const lo = lang === 'lo'
  const count = (value: number | undefined, fallback: number) => {
    const number = Math.round(Number(value))
    return Number.isFinite(number) && number > 0 ? Math.min(number, 9999) : fallback
  }
  const tag = `engagement-${kind.toLowerCase().replace(/_/g, '-')}-${laosDate}`

  switch (kind) {
    case 'STREAK_AT_RISK': {
      const days = count(params.streak, 1)
      return {
        title: lo ? `🔥 ມື້ຮຽນຕໍ່ເນື່ອງ ${days} ມື້ ກຳລັງຈະຂາດ` : `🔥 Your ${days}-day streak is on the line`,
        body: lo
          ? 'ເຮັດກິດຈະກຳຜູ້ແນະນຳມື້ນີ້ໃຫ້ຄົບ ເພື່ອຮັກສາມື້ຮຽນຕໍ່ເນື່ອງຂອງທ່ານໄວ້. ໃຊ້ເວລາບໍ່ເທົ່າໃດນາທີ.'
          : "Finish today's mentor activities to keep it going. It only takes a few minutes.",
        url: '/academy/home',
        tag,
      }
    }
    case 'XP_RIVAL': {
      const gap = count(params.gap, 1)
      const rank = count(params.rank, 1)
      return {
        title: lo ? `📈 ອີກ ${gap} XP ກໍຂຶ້ນອັນດັບ ${rank}` : `📈 Just ${gap} XP from rank ${rank}`,
        body: lo
          ? 'ເຮັດກິດຈະກຳມື້ນີ້ອີກໜ້ອຍໜຶ່ງ ກໍຂຶ້ນຕາຕະລາງອັນດັບໄດ້ແລ້ວ.'
          : 'A little more today could move you up the leaderboard.',
        url: '/academy/home',
        tag,
      }
    }
    case 'DAILY_NOT_OPENED':
      return {
        title: lo ? '☀️ ກິດຈະກຳປະຈຳວັນລໍຖ້າທ່ານຢູ່' : '☀️ Your daily activities are waiting',
        body: lo ? 'ເຂົ້າມາເຮັດ 5 ນາທີ ເພື່ອເກັບ XP ຂອງມື້ນີ້.' : 'Spend 5 minutes today and collect your XP.',
        url: '/academy/home',
        tag,
      }
    case 'COMEBACK': {
      const days = count(params.days, 3)
      return {
        title: lo ? '👋 ຄິດຮອດທ່ານແລ້ວ' : '👋 We saved your place',
        body: lo
          ? `ບໍ່ໄດ້ເຂົ້າມາ ${days} ມື້ແລ້ວ. ມື້ນີ້ລອງເລີ່ມໃໝ່ພຽງ 5 ນາທີ ກໍພໍ.`
          : `It's been ${days} days. Five minutes today is enough to get back on track.`,
        url: '/academy/home',
        tag,
      }
    }
    case 'BREAK':
      return {
        title: lo ? '☕ ພັກສາຍຕາແດ່' : '☕ Time for a short break',
        body: lo
          ? 'ທ່ານໃຊ້ໂທລະສັບມາດົນແລ້ວ. ວາງໄວ້ກ່ອນ ຢຽດເສັ້ນຢຽດສາຍ ແລະ ດື່ມນ້ຳ ແລ້ວຄ່ອຍກັບມາຮຽນຕໍ່.'
          : "You've been on your phone for a while. Rest your eyes, stretch and drink some water, then come back.",
        url: '/',
        tag,
      }
    case 'WINDDOWN':
      return {
        title: lo ? '🌙 ເຖິງເວລາວາງໂທລະສັບແລ້ວ' : '🌙 Time to put the phone down',
        body: lo
          ? 'ນອນຫຼັບໃຫ້ພຽງພໍຈະຊ່ວຍໃຫ້ຈື່ສິ່ງທີ່ຮຽນໄດ້ດີຂຶ້ນ. ອ່ານປຶ້ມສອງສາມໜ້າ ຫຼື ພັກຜ່ອນ ແລ້ວພົບກັນໃໝ່ມື້ອື່ນ.'
          : 'Good sleep helps you remember what you learned. Read a few pages of a book or relax, and see you tomorrow.',
        url: '/',
        tag,
      }
  }
}

// ─── Test message ────────────────────────────────────────────────────────────

export function testMessage(lang: Lang, platform: 'BOOKSTORE' | 'ACADEMY'): PushMessage {
  const lo = lang === 'lo'
  return {
    title: lo ? '🔔 ການແຈ້ງເຕືອນທຳງານແລ້ວ!' : '🔔 Notifications are working!',
    body: lo ? 'ທ່ານຈະໄດ້ຮັບຂ່າວສານຈາກ Bitdoin ຢູ່ບ່ອນນີ້.' : "You'll get Bitdoin updates right here.",
    url: platform === 'ACADEMY' ? '/academy/profile' : '/bookstore/profile',
    tag: 'bitdoin-test',
  }
}
