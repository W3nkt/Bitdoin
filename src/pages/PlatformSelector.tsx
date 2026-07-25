import { ArrowRight, BookOpen, Check, GraduationCap, Languages } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '@/context/LanguageContext'
import { useAuth } from '@/context/AuthContext'
import { publicAsset } from '@/lib/assets'

const copy = {
  en: {
    tagline: 'One account, two platforms',
    eyebrow: 'Two experiences. One Bitdoin account.',
    title: 'Where would you like to go?',
    subtitle: 'Shop for books across Lao PDR or build practical skills with your personal learning platform.',
    marketplace: 'Marketplace',
    bookstore: 'Bitdoin Bookstore',
    bookstoreDetail: 'Compare prices from bookstores across Lao PDR, order online, and get books delivered to your door.',
    bookstorePoints: ['Compare prices across stores', 'Order online, pay your way', 'Track delivery in real time'],
    browse: 'Browse books',
    membership: 'Membership',
    academy: 'Bitdoin Academy',
    academyDetail: 'A guided learning platform with a personal coach, practical lessons, weekly challenges, and habit tracking.',
    academyPoints: ['Personalized learning coach', 'Weekly challenges and habit tracker', 'Progress, streaks, and rewards'],
    explore: 'Explore Academy',
    footer: `© ${new Date().getFullYear()} Bitdoin. All rights reserved.`,
  },
  lo: {
    tagline: 'ບັນຊີດຽວ ສອງແພລດຟອມ',
    eyebrow: 'ສອງປະສົບການ ໃນໜຶ່ງບັນຊີ Bitdoin',
    title: 'ທ່ານຢາກໄປບ່ອນໃດ?',
    subtitle: 'ຊື້ປຶ້ມທົ່ວປະເທດລາວ ຫຼື ສ້າງທັກສະທີ່ໃຊ້ໄດ້ຈິງກັບແພລດຟອມການຮຽນສ່ວນຕົວ.',
    marketplace: 'ຕະຫຼາດປຶ້ມ',
    bookstore: 'ຮ້ານປຶ້ມ Bitdoin',
    bookstoreDetail: 'ປຽບທຽບລາຄາຈາກຮ້ານປຶ້ມທົ່ວປະເທດ, ສັ່ງອອນລາຍ ແລະ ຈັດສົ່ງເຖິງບ້ານ.',
    bookstorePoints: ['ປຽບທຽບລາຄາຫຼາຍຮ້ານ', 'ສັ່ງອອນລາຍ ແລະ ເລືອກວິທີຈ່າຍ', 'ຕິດຕາມການຈັດສົ່ງ'],
    browse: 'ເລືອກຊື້ປຶ້ມ',
    membership: 'ສະມາຊິກ',
    academy: 'Bitdoin Academy',
    academyDetail: 'ແພລດຟອມການຮຽນທີ່ມີໂຄດສ່ວນຕົວ, ບົດຮຽນ, ຄວາມທ້າທາຍ ແລະ ຕິດຕາມນິໄສ.',
    academyPoints: ['ໂຄດການຮຽນສ່ວນຕົວ', 'ຄວາມທ້າທາຍ ແລະ ຕິດຕາມນິໄສ', 'ຄວາມຄືບໜ້າ ແລະ ລາງວັນ'],
    explore: 'ສຳຫຼວດ Academy',
    footer: `© ${new Date().getFullYear()} Bitdoin. ສະຫງວນລິຂະສິດທຸກຢ່າງ.`,
  },
}

export function PlatformSelector() {
  const { profile } = useAuth()
  const { language, setLanguage } = useLanguage()
  const t = copy[language]
  const isAdmin = profile?.role !== undefined && profile.role !== 'CUSTOMER'

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-primary-950 via-primary-900 to-primary-950 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 h-56 w-56 rounded-full bg-accent-500/15 blur-[70px] sm:h-80 sm:w-80 sm:blur-[100px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-amber-400/10 blur-[70px] sm:h-96 sm:w-96 sm:blur-[110px]"
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <header className="flex items-center justify-between gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-950"
          >
            <img
              src={publicAsset('icons/Bitdoin Logo H.png')}
              alt="Bitdoin"
              className="h-8 w-8 flex-shrink-0 rounded-xl bg-white object-contain p-1"
            />
            <div>
              <p className="text-sm font-bold leading-none tracking-tight">Bitdoin</p>
              <p className="mt-1 hidden text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400 sm:block">
                {t.tagline}
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setLanguage(language === 'en' ? 'lo' : 'en')}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-semibold backdrop-blur transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70"
              aria-label="Switch language"
            >
              <Languages className="h-3.5 w-3.5 text-amber-300" aria-hidden />
              {language === 'en' ? 'ລາວ' : 'English'}
            </button>
          </div>
        </header>

        <section className="mx-auto flex w-full flex-1 flex-col justify-center py-8 sm:py-10">
          <div className="mx-auto max-w-lg text-center motion-safe:animate-fade-in sm:max-w-xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">{t.eyebrow}</p>
            <h1 className="mt-3 text-balance text-2xl font-bold leading-tight tracking-tight sm:text-3xl md:text-4xl">
              {t.title}
            </h1>
            <p className="mx-auto mt-3 max-w-md text-balance text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
              {t.subtitle}
            </p>
          </div>

          <div className="mx-auto mt-8 grid w-full max-w-3xl gap-4 sm:mt-10 md:grid-cols-2 md:gap-5">
            <PlatformCard
              to={isAdmin ? '/admin' : '/bookstore'}
              tone="bookstore"
              badge={t.marketplace}
              icon={BookOpen}
              title={t.bookstore}
              detail={t.bookstoreDetail}
              points={t.bookstorePoints}
              action={t.browse}
            />
            <PlatformCard
              to={isAdmin ? '/academy-admin' : '/academy'}
              tone="academy"
              badge={t.membership}
              icon={GraduationCap}
              title={t.academy}
              detail={t.academyDetail}
              points={t.academyPoints}
              action={t.explore}
            />
          </div>
        </section>

        <footer className="pb-1 pt-2 text-center text-[10px] text-slate-500">{t.footer}</footer>
      </div>
    </main>
  )
}

function PlatformCard({ to, tone, badge, icon: Icon, title, detail, points, action }: {
  to: string; tone: 'bookstore' | 'academy'; badge: string; icon: typeof BookOpen
  title: string; detail: string; points: string[]; action: string
}) {
  const academy = tone === 'academy'
  return (
    <Link
      to={to}
      onClick={() => localStorage.setItem('bitdoin_last_platform', tone)}
      className={`group relative flex flex-col rounded-2xl border p-5 outline-none transition duration-200 hover:-translate-y-1 sm:p-6 ${
        academy
          ? 'border-amber-300/20 bg-primary-900/70 text-white shadow-[0_12px_32px_-8px_rgba(0,0,0,0.45)] hover:border-amber-300/35 focus-visible:ring-2 focus-visible:ring-amber-300/50'
          : 'border-black/5 bg-[#fffdf9] text-primary-950 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.25)] focus-visible:ring-2 focus-visible:ring-accent-400/60'
      }`}
    >
      <span
        className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
          academy ? 'bg-amber-400/10 text-amber-300 ring-1 ring-amber-300/30' : 'bg-accent-50 text-accent-700'
        }`}
      >
        {badge}
      </span>

      <span
        className={`mt-4 grid h-10 w-10 place-items-center rounded-xl ${
          academy ? 'bg-amber-400 text-primary-950' : 'bg-accent-500 text-white shadow-md shadow-accent-500/20'
        }`}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>

      <h2 className="mt-4 text-lg font-bold tracking-tight sm:text-xl">{title}</h2>
      <p className={`mt-1.5 text-xs leading-5 sm:text-sm sm:leading-6 ${academy ? 'text-slate-300' : 'text-slate-600'}`}>
        {detail}
      </p>

      <ul className="mb-5 mt-3 space-y-2">
        {points.map(point => (
          <li key={point} className="flex items-center gap-2 text-xs font-medium sm:text-sm">
            <span
              className={`grid h-4 w-4 flex-shrink-0 place-items-center rounded-full ${
                academy ? 'bg-amber-400/15 text-amber-300' : 'bg-accent-100 text-accent-600'
              }`}
            >
              <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
            </span>
            {point}
          </li>
        ))}
      </ul>

      <span
        className={`mt-auto flex items-center justify-between gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-colors group-hover:gap-3 sm:text-sm ${
          academy ? 'bg-amber-400 text-primary-950 group-hover:bg-amber-300' : 'bg-accent-500 text-white group-hover:bg-accent-600'
        }`}
      >
        {action}
        <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 transition-transform group-hover:translate-x-1" aria-hidden />
      </span>
    </Link>
  )
}
