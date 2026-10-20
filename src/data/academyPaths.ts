// The eight learning paths shown on the Academy landing page. Slugs, names and blurbs mirror the
// categories seeded in supabase/migrations/054_premium_learning_hub.sql, so a slug is also the
// /academy/learn/:categorySlug route. Each path carries the quote the landing shows for it.

export type LocalText = { en: string; lo: string }

export interface AcademyPath {
  slug: string
  /** Orb and chip accent in the landing page. */
  color: string
  name: LocalText
  blurb: LocalText
  quote: LocalText & { by: string }
}

export const ACADEMY_PATHS: AcademyPath[] = [
  {
    slug: 'reading-summaries',
    color: '#a78bfa',
    name: { en: 'Reading summaries', lo: 'ສະຫຼຸບປຶ້ມ' },
    blurb: { en: 'Big ideas from useful books, turned into practical actions.', lo: 'ແນວຄິດສຳຄັນຈາກປຶ້ມ ແລະ ວິທີນຳໄປໃຊ້.' },
    quote: {
      en: 'A reader lives a thousand lives before he dies. The man who never reads lives only one.',
      lo: 'ຜູ້ທີ່ອ່ານປຶ້ມ ໄດ້ມີຊີວິດນັບພັນຊີວິດກ່ອນຈະຈາກໂລກນີ້ໄປ. ຄົນທີ່ບໍ່ເຄີຍອ່ານ ມີຊີວິດພຽງຊີວິດດຽວ.',
      by: 'George R.R. Martin',
    },
  },
  {
    slug: 'money',
    color: '#34d399',
    name: { en: 'Money lessons', lo: 'ບົດຮຽນການເງິນ' },
    blurb: { en: 'Build confident everyday money habits.', lo: 'ສ້າງນິໄສການເງິນທີ່ດີໃນຊີວິດປະຈຳວັນ.' },
    quote: {
      en: 'Beware of little expenses. A small leak will sink a great ship.',
      lo: 'ຈົ່ງລະວັງລາຍຈ່າຍນ້ອຍໆ. ຮູຮົ່ວນ້ອຍໆ ກໍ່ເຮັດໃຫ້ເຮືອໃຫຍ່ຈົມໄດ້.',
      by: 'Benjamin Franklin',
    },
  },
  {
    slug: 'ai-skills',
    color: '#60a5fa',
    name: { en: 'AI skills', lo: 'ທັກສະ AI' },
    blurb: { en: 'Use AI thoughtfully for study, work, and creativity.', lo: 'ໃຊ້ AI ເພື່ອການຮຽນ ວຽກ ແລະ ຄວາມຄິດສ້າງສັນ.' },
    quote: {
      en: 'The best way to predict the future is to invent it.',
      lo: 'ວິທີທີ່ດີທີ່ສຸດທີ່ຈະທຳນາຍອະນາຄົດ ຄືການສ້າງມັນຂຶ້ນມາເອງ.',
      by: 'Alan Kay',
    },
  },
  {
    slug: 'english',
    color: '#fbbf24',
    name: { en: 'English', lo: 'ພາສາອັງກິດ' },
    blurb: { en: 'Practice useful English with confidence.', lo: 'ຝຶກພາສາອັງກິດທີ່ໃຊ້ໄດ້ຈິງ.' },
    quote: {
      en: 'The limits of my language mean the limits of my world.',
      lo: 'ຂອບເຂດຂອງພາສາຂອງຂ້ອຍ ຄືຂອບເຂດຂອງໂລກຂອງຂ້ອຍ.',
      by: 'Ludwig Wittgenstein',
    },
  },
  {
    slug: 'productivity',
    color: '#fb7185',
    name: { en: 'Productivity', lo: 'ການເຮັດວຽກຢ່າງມີຜົນ' },
    blurb: { en: 'Focus better and finish what matters.', lo: 'ຈົດຈໍ່ ແລະ ສຳເລັດສິ່ງສຳຄັນ.' },
    quote: {
      en: 'It is not that we have a short time to live, but that we waste a lot of it.',
      lo: 'ບໍ່ແມ່ນວ່າເຮົາມີເວລາໃນຊີວິດສັ້ນ, ແຕ່ເຮົາເສຍມັນໄປຫຼາຍ.',
      by: 'Seneca',
    },
  },
  {
    slug: 'career',
    color: '#22d3ee',
    name: { en: 'Career advice', lo: 'ຄຳແນະນຳອາຊີບ' },
    blurb: { en: 'Make clearer education and career decisions.', lo: 'ຕັດສິນໃຈດ້ານການຮຽນ ແລະ ອາຊີບໄດ້ດີຂຶ້ນ.' },
    quote: {
      en: 'The only way to do great work is to love what you do.',
      lo: 'ວິທີດຽວທີ່ຈະເຮັດວຽກທີ່ຍິ່ງໃຫຍ່ໄດ້ ຄືການຮັກໃນສິ່ງທີ່ທ່ານເຮັດ.',
      by: 'Steve Jobs',
    },
  },
  {
    slug: 'scholarships',
    color: '#818cf8',
    name: { en: 'Scholarships', lo: 'ທຶນການສຶກສາ' },
    blurb: { en: 'Find opportunities and prepare stronger applications.', lo: 'ຊອກຫາທຶນ ແລະ ກະກຽມໃບສະໝັກ.' },
    quote: {
      en: 'Education is the most powerful weapon which you can use to change the world.',
      lo: 'ການສຶກສາ ຄືອາວຸດທີ່ມີພະລັງທີ່ສຸດ ທີ່ທ່ານສາມາດໃຊ້ປ່ຽນແປງໂລກໄດ້.',
      by: 'Nelson Mandela',
    },
  },
  {
    slug: 'business-ideas',
    color: '#fb923c',
    name: { en: 'Business ideas', lo: 'ແນວຄິດທຸລະກິດ' },
    blurb: { en: 'Test small ideas before risking your money.', lo: 'ທົດສອບແນວຄິດກ່ອນລົງທຶນ.' },
    quote: {
      en: "If you are not embarrassed by the first version of your product, you've launched too late.",
      lo: 'ຖ້າທ່ານບໍ່ອາຍກັບຜະລິດຕະພັນລຸ້ນທຳອິດ ກໍ່ແປວ່າທ່ານເປີດຕົວຊ້າເກີນໄປ.',
      by: 'Reid Hoffman',
    },
  },
]

/** Shown before a path is picked. */
export const DEFAULT_QUOTE: AcademyPath['quote'] = {
  en: 'A journey of a thousand miles begins with a single step.',
  lo: 'ການເດີນທາງພັນໄມ ເລີ່ມຕົ້ນດ້ວຍກ້າວທຳອິດ.',
  by: 'Lao Tzu',
}
