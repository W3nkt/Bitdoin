// Notification copy for send-push.
//
// What the copy follows (see the PR / docs for sources):
//   * Short: title <= ~40 chars, body <= ~100 chars, so phones don't cut it off.
//   * Concrete beats generic: a real lesson title or today's challenge is used
//     whenever one exists; templates fill the remaining days.
//   * Novelty: repeating one message makes people ignore it (Duolingo's
//     notification research), so a member cycles through every template
//     before seeing one again, and members see different ones on the same day.
//   * Personal and kind: the member's first name, no guilt-tripping.

export type Lang = 'lo' | 'en'

export interface PushMessage {
  title: string
  body: string
  url: string
  tag: string
  image?: string
}

export interface Lesson {
  slug: string
  title_en: string
  title_lo: string
  summary_en: string
  summary_lo: string
  estimated_minutes: number
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

export function firstName(name: string | null | undefined, lang: Lang) {
  const first = (name ?? '').trim().split(/\s+/)[0]
  return first || (lang === 'lo' ? 'ສະມາຊິກ' : 'there')
}

/** Stable small number per user, so members start at different templates. */
export function userOffset(userId: string) {
  let hash = 0
  for (const char of userId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return hash
}

/** Days since 1970 for a Laos-time YYYY-MM-DD date. */
export function dayNumber(laosDate: string) {
  return Math.floor(Date.parse(`${laosDate}T00:00:00Z`) / DAY_MS)
}

// ─── Academy daily templates ─────────────────────────────────────────────────
// {name} is replaced with the member's first name.

interface Template {
  url: string
  lo: [string, string]
  en: [string, string]
}

const ACADEMY_TEMPLATES: Template[] = [
  {
    url: '/academy/learn',
    lo: ['🧠 1 ແນວຄິດທີ່ປ່ຽນອາທິດຂອງທ່ານໄດ້', 'ສະບາຍດີ {name}, ບົດຮຽນ 5 ນາທີຂອງມື້ນີ້ພ້ອມແລ້ວ. ກົດເບິ່ງເລີຍ.'],
    en: ['🧠 1 idea that can change your week', "Hi {name}, today's 5-minute lesson is ready. Tap to see it."],
  },
  {
    url: '/academy/learn',
    lo: ['⏱️ ມື້ນີ້ຂໍພຽງ 5 ນາທີ', '{name}, ກ້າວນ້ອຍໆທຸກມື້ ດີກວ່າກ້າວໃຫຍ່ເດືອນລະເທື່ອ.'],
    en: ['⏱️ Just 5 minutes today?', '{name}, a small step every day beats a big step once a month.'],
  },
  {
    url: '/academy/home',
    lo: ['🔥 ຮັກສາ streak ຂອງທ່ານໄວ້', '{name}, ຮຽນບົດສັ້ນໆມື້ນີ້ ເພື່ອໃຫ້ຄວາມຄືບໜ້າຂອງທ່ານບໍ່ຢຸດ.'],
    en: ['🔥 Keep your streak going', '{name}, one quick lesson today keeps your progress moving.'],
  },
  {
    url: '/academy/coach',
    lo: ['💬 ມີເລື່ອງທີ່ຄິດບໍ່ອອກບໍ?', 'ຖາມ AI Coach ຂອງທ່ານ ແລະ ຮັບຄຳແນະນຳທີ່ຊັດເຈນພາຍໃນ 1 ນາທີ.'],
    en: ['💬 Stuck on something?', 'Ask your AI Coach and get a clear next step in under a minute.'],
  },
  {
    url: '/academy/careers',
    lo: ['🚀 ສຳຫຼວດອາຊີບທີ່ທ່ານຝັນ', 'ເບິ່ງວ່າຕ້ອງມີທັກສະຫຍັງ ແລະ ຄວນເລີ່ມຕົ້ນແນວໃດ.'],
    en: ["🚀 Explore a career you'd love", 'See the skills it takes and the first steps to get there.'],
  },
  {
    url: '/academy/habits',
    lo: ['✅ ນິໄສຂອງມື້ນີ້', '{name}, ໄຊຊະນະນ້ອຍໆລວມກັນເປັນເລື່ອງໃຫຍ່. ໃຊ້ເວລາພຽງ 10 ວິນາທີ.'],
    en: ["✅ Tick off today's habit", '{name}, small wins add up. It takes 10 seconds.'],
  },
  {
    url: '/academy/challenges',
    lo: ['🏆 ຄວາມທ້າທາຍປະຈຳອາທິດລໍຖ້າຢູ່', 'ເຮັດໃຫ້ສຳເລັດເພື່ອຮັບ XP ແລະ ຂຶ້ນອັນດັບ.'],
    en: ["🏆 This week's challenge is waiting", 'Finish it to earn XP and climb the leaderboard.'],
  },
  {
    url: '/academy/learn',
    lo: ['📈 ດີຂຶ້ນ 1% ມື້ນີ້', '{name}, ດີຂຶ້ນ 1% ທຸກມື້ ຮອດທ້າຍປີຈະດີຂຶ້ນ 37 ເທົ່າ. ເລີ່ມເລີຍ.'],
    en: ['📈 1% better today', '{name}, 1% better every day adds up to 37× in a year. Start today.'],
  },
  {
    url: '/academy/progress',
    lo: ['📊 ເບິ່ງວ່າທ່ານມາໄກປານໃດແລ້ວ', 'ທຸກບົດຮຽນ ແລະ ລາງວັນທີ່ທ່ານໄດ້ຮັບ ຢູ່ໃນໜ້າດຽວ.'],
    en: ["📊 See how far you've come", "Every lesson and badge you've earned, on one page."],
  },
  {
    url: '/academy/learn',
    lo: ['✨ ຕົວທ່ານໃນອະນາຄົດຈະຂອບໃຈ', 'ຮຽນ 10 ນາທີມື້ນີ້ ຄືຂອງຂວັນໃຫ້ຕົວທ່ານໃນມື້ອື່ນ, {name}.'],
    en: ['✨ Your future self will thank you', "10 minutes of learning today is a gift to tomorrow's you, {name}."],
  },
  {
    url: '/academy/prompts',
    lo: ['🤖 ເຮັດວຽກສະຫຼາດຂຶ້ນດ້ວຍ AI', 'ລອງໃຊ້ prompt ສຳເລັດຮູບ: ສຳເນົາ, ວາງ, ສຳເລັດ.'],
    en: ['🤖 Work smarter with AI', 'Try a ready-made prompt: copy, paste, done.'],
  },
  {
    url: '/academy/home',
    lo: ['👋 ພວກເຮົາຮັກສາບ່ອນຂອງທ່ານໄວ້', 'ສືບຕໍ່ຈາກບ່ອນທີ່ຢຸດໄວ້, {name}. ບໍ່ຕ້ອງຟ້າວ, ພຽງບົດດຽວກໍພໍ.'],
    en: ['👋 We saved your spot', 'Pick up where you left off, {name}. No pressure, just one lesson.'],
  },
  {
    url: '/academy/learn',
    lo: ['🎯 ທົດສອບຕົວເອງ 3 ຂໍ້', 'ຕອບຄຳຖາມສັ້ນໆ ເພື່ອໃຫ້ຈື່ສິ່ງທີ່ຮຽນໄດ້ດົນຂຶ້ນ.'],
    en: ['🎯 Test yourself: 3 questions', "A quick quiz locks what you've learned into memory."],
  },
  {
    url: '/academy/learn',
    lo: ['💡 ຮຽນຮູ້ສິ່ງໃໝ່ມື້ນີ້', '{name}, ມີບົດຮຽນລໍຖ້າທ່ານຢູ່ໃນ Learning Hub.'],
    en: ['💡 Learn something new today', '{name}, a lesson is waiting for you in the Learning Hub.'],
  },
  {
    url: '/academy/home',
    lo: ['🌱 ຄົນທີ່ກ້າວໜ້າ ຮຽນທຸກມື້', 'ຮັກສານິໄສໄວ້ນະ {name}. ໃຊ້ເວລາໜ້ອຍກວ່າພັກດື່ມກາເຟ.'],
    en: ['🌱 People who grow show up daily', 'Keep the habit alive, {name}. It takes less than a coffee break.'],
  },
  {
    url: '/academy/learn',
    lo: ['📚 ສະຫຼຸບປຶ້ມດີໃນ 10 ນາທີ', 'ອ່ານແນວຄິດຫຼັກຂອງປຶ້ມທັງຫົວ ໃນເວລາພັກສັ້ນໆ, {name}.'],
    en: ['📚 A great book in 10 minutes', 'Get the key ideas of a whole book in one short break, {name}.'],
  },
]
// Keep the count NOT divisible by 3 (see academyDailyMessage).

function fill(text: string, name: string) {
  return text.replaceAll('{name}', name)
}

export interface AcademyContext {
  lang: Lang
  name: string
  userId: string
  laosDate: string
  /** Published in the last 24 hours, newest first. */
  newLessons: Lesson[]
  /** Lessons this member can open (all for paid members, previews for others). */
  spotlightPool: Lesson[]
  challenge: string | null
}

/**
 * Picks today's Academy reminder. New lessons always win; otherwise the day
 * rotates between today's challenge, a lesson spotlight and a template.
 */
export function academyDailyMessage(ctx: AcademyContext): PushMessage {
  const { lang, laosDate } = ctx
  const lo = lang === 'lo'
  const name = firstName(ctx.name, lang)
  const day = dayNumber(laosDate)
  const offset = userOffset(ctx.userId)
  const tag = `academy-daily-${laosDate}`

  const latest = ctx.newLessons[0]
  if (latest) {
    const more = ctx.newLessons.length - 1
    const summary = lo ? latest.summary_lo : latest.summary_en
    const extra = more > 0 ? (lo ? ` +${more} ບົດໃໝ່ອື່ນໆ` : ` +${more} more new`) : ''
    return {
      title: clip(`🆕 ${lo ? 'ບົດຮຽນໃໝ່' : 'New lesson'}: ${lo ? latest.title_lo : latest.title_en}`, 60),
      body: clip(summary || (lo ? `ອ່ານ ${latest.estimated_minutes} ນາທີ` : `${latest.estimated_minutes}-minute read`), 100 - extra.length) + extra,
      url: `/academy/lesson/${latest.slug}`,
      tag,
    }
  }

  const kind = day % 3
  if (kind === 0 && ctx.challenge) {
    return {
      title: lo ? `🎯 ${name}, ຄວາມທ້າທາຍມື້ນີ້` : `🎯 ${name}, today's challenge`,
      body: clip(ctx.challenge, 110),
      url: '/academy/home',
      tag,
    }
  }
  if (kind === 1 && ctx.spotlightPool.length) {
    const lesson = ctx.spotlightPool[(Math.floor(day / 3) + offset) % ctx.spotlightPool.length]
    const summary = lo ? lesson.summary_lo : lesson.summary_en
    const minutes = lo ? `${lesson.estimated_minutes} ນາທີ` : `${lesson.estimated_minutes} min`
    return {
      title: clip(`📖 ${lo ? lesson.title_lo : lesson.title_en}`, 60),
      body: clip(`${minutes} · ${summary}`, 110),
      url: `/academy/lesson/${lesson.slug}`,
      tag,
    }
  }

  // Index by day: with a template count not divisible by 3, the template days
  // (and fallback days) step through every template before any repeats.
  const template = ACADEMY_TEMPLATES[(day + offset) % ACADEMY_TEMPLATES.length]
  const [title, body] = lo ? template.lo : template.en
  return { title: fill(title, name), body: fill(body, name), url: template.url, tag }
}

// ─── Bookstore new-book digest ───────────────────────────────────────────────

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

// ─── Test message ────────────────────────────────────────────────────────────

export function testMessage(lang: Lang, platform: 'BOOKSTORE' | 'ACADEMY'): PushMessage {
  const lo = lang === 'lo'
  return {
    title: lo ? '🔔 ການແຈ້ງເຕືອນເຮັດວຽກແລ້ວ!' : '🔔 Notifications are working!',
    body: lo ? 'ທ່ານຈະໄດ້ຮັບຂ່າວສານຈາກ Bitdoin ຢູ່ບ່ອນນີ້.' : "You'll get Bitdoin updates right here.",
    url: platform === 'ACADEMY' ? '/academy/profile' : '/bookstore/profile',
    tag: 'bitdoin-test',
  }
}
