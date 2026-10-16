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
