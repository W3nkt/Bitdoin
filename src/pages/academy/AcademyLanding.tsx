import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, BookOpen, Box, Briefcase, Brain, Check, Compass, Gamepad2, GraduationCap, Languages, Lightbulb, ListChecks, Moon, Sparkles, Sun, Sunrise, Sunset, Target, Timer, Wallet, type LucideIcon } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { ACADEMY_PATHS, DEFAULT_QUOTE } from '@/data/academyPaths'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import {
  CareerMock, ChallengeMock, CoachMock, CubeMock, HabitMock, LessonMock, OrbitFallback,
  PlayMock, ProgressMock, QuizMock, Reveal, SpotlightCard, cardSurface,
} from '@/components/academy/landingVisuals'

// three.js is large, so the 3D hero loads after the page's text and buttons are already usable.
const AcademyHero3D = lazy(() => import('@/components/academy/AcademyHero3D'))

// The landing remembers the visitor's name and chosen path on this device only, so a return visit
// greets them and keeps the quote and sign-up button on their path.
const VISITOR_KEY = 'bitdoin_academy_visitor'
const NAME_MAX = 24

function readVisitor() {
  try {
    const raw = JSON.parse(localStorage.getItem(VISITOR_KEY) ?? 'null')
    const name = typeof raw?.name === 'string' ? raw.name.slice(0, NAME_MAX) : ''
    const known = ACADEMY_PATHS.some(path => path.slug === raw?.path)
    return { name, path: known ? (raw.path as string) : '' }
  } catch {
    return { name: '', path: '' }
  }
}

const PATH_ICONS: Record<string, LucideIcon> = {
  'reading-summaries': BookOpen,
  money: Wallet,
  'ai-skills': Sparkles,
  english: Languages,
  productivity: Timer,
  career: Briefcase,
  scholarships: GraduationCap,
  'business-ideas': Lightbulb,
}

const copy = {
  en: {
    navHow: 'How it works',
    navFeatures: 'Features',
    navPlans: 'Membership',
    signIn: 'Sign in',
    startFree: 'Start free',
    switchPlatform: 'Switch platform',
    lightMode: 'Switch to light mode',
    darkMode: 'Switch to dark mode',
    greeting: { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening', night: 'Hello' },
    welcomeBack: 'Welcome back',
    namePlaceholder: 'your name',
    nameLabel: 'Your name (optional)',
    titleA: 'Build skills that',
    titleB: 'change what comes next.',
    subtitle: 'Practical lessons, a personal AI Coach, weekly challenges, and daily habits—all in one focused learning space.',
    createAccount: 'Create free account',
    startPath: (path: string) => `Start ${path} — free`,
    membership: 'View membership',
    trust: ['Free to start', 'Lao & English', 'Works on your phone'],
    live: 'Live 3D',
    hint: 'Tap an orb to choose your path',
    pickLabel: 'What do you want to grow?',
    quoteDefault: 'Pick a path to make this yours',
    forName: (name: string) => `For ${name}`,
    marquee: ['AI Coach', 'Weekly challenges', 'Habit tracker', 'Career explorer', 'XP & streaks', 'Play & Learn'],
    howEyebrow: 'One complete learning rhythm',
    howTitle: 'Learn. Practice. Return stronger.',
    steps: [
      { title: 'Learn', text: 'Short lessons from eight practical paths, built to fit into your day.' },
      { title: 'Practice', text: 'Quick knowledge checks turn reading into remembering.' },
      { title: 'Return stronger', text: 'Build XP, streaks, and visible progress, one day at a time.' },
    ],
    stepNote: 'Sample preview',
    featEyebrow: 'Inside the Academy',
    featTitle: 'Everything you need to keep going.',
    coachTitle: 'Personal AI Coach',
    coachText: 'Get focused support for study, careers, AI, and English.',
    coachTopics: ['Study', 'Careers', 'AI', 'English'],
    coachNote: 'Example conversation',
    challengeTitle: 'Clear weekly challenges',
    challengeText: 'Turn useful knowledge into consistent action.',
    habitTitle: 'Habits you can track',
    habitText: 'Build momentum one completed day at a time.',
    careerTitle: 'Career explorer',
    careerText: 'Explore careers, required skills, and practical next steps.',
    careerLink: 'Try it now — no account needed',
    playTitle: 'Play & Learn',
    playText: 'Short activities. Real learning.',
    labTitle: '3D Top Corner Lab',
    labText: 'Add a dimension and watch the top corner move further out.',
    plansEyebrow: 'Membership',
    plansTitle: 'Start free. Go deeper when you are ready.',
    freeName: 'Free',
    freeText: 'Start with daily motivation and a preview of the mentor system.',
    freeFeatures: ['Daily motivation preview', 'Limited learning center access', 'Starter AI prompt library'],
    premiumName: 'Premium',
    premiumText: 'Daily mentor guidance, AI Coach access, learning paths, prompt packs, and productivity tools.',
    premiumFeatures: ['Daily mentor dashboard', 'AI Coach access', 'Premium lessons and resources', 'Prompt library access', 'Streak and challenge tracking', 'Personal life consultation'],
    seePlans: 'See plans and pricing',
    finalDefault: 'Your next chapter starts with one lesson.',
    finalPath: (name: string, path: string) => `${name ? `${name}, your` : 'Your'} ${path} journey starts today.`,
    finalText: 'Create your free account and take the first step today.',
    haveAccount: 'I already have an account',
    bookstore: 'Bookstore',
    footer: `© ${new Date().getFullYear()} Bitdoin. All rights reserved.`,
  },
  lo: {
    navHow: 'ວິທີຮຽນ',
    navFeatures: 'ຄຸນສົມບັດ',
    navPlans: 'ສະມາຊິກ',
    signIn: 'ເຂົ້າສູ່ລະບົບ',
    startFree: 'ເລີ່ມຟຣີ',
    switchPlatform: 'ປ່ຽນແພລດຟອມ',
    lightMode: 'ປ່ຽນເປັນໂໝດສະຫວ່າງ',
    darkMode: 'ປ່ຽນເປັນໂໝດມືດ',
    greeting: { morning: 'ສະບາຍດີຕອນເຊົ້າ', afternoon: 'ສະບາຍດີຕອນບ່າຍ', evening: 'ສະບາຍດີຕອນແລງ', night: 'ສະບາຍດີ' },
    welcomeBack: 'ຍິນດີຕ້ອນຮັບກັບມາ',
    namePlaceholder: 'ຊື່ຂອງທ່ານ',
    nameLabel: 'ຊື່ຂອງທ່ານ (ບໍ່ບັງຄັບ)',
    titleA: 'ສ້າງທັກສະທີ່',
    titleB: 'ປ່ຽນຊີວິດທ່ານ.',
    subtitle: 'ບົດຮຽນທີ່ໃຊ້ໄດ້ຈິງ, AI Coach ສ່ວນຕົວ, ຄວາມທ້າທາຍປະຈຳອາທິດ ແລະ ນິໄສປະຈຳວັນ ໃນພື້ນທີ່ການຮຽນດຽວ.',
    createAccount: 'ສ້າງບັນຊີຟຣີ',
    startPath: (path: string) => `ເລີ່ມຮຽນ ${path} — ຟຣີ`,
    membership: 'ເບິ່ງສະມາຊິກ',
    trust: ['ເລີ່ມຟຣີ', 'ພາສາລາວ ແລະ ອັງກິດ', 'ໃຊ້ໄດ້ເທິງມືຖື'],
    live: '3D ສົດ',
    hint: 'ແຕະວົງແສງເພື່ອເລືອກເສັ້ນທາງ',
    pickLabel: 'ທ່ານຢາກພັດທະນາດ້ານໃດ?',
    quoteDefault: 'ເລືອກເສັ້ນທາງ ເພື່ອປັບໃຫ້ເປັນຂອງທ່ານ',
    forName: (name: string) => `ສຳລັບ ${name}`,
    marquee: ['AI Coach', 'ຄວາມທ້າທາຍປະຈຳອາທິດ', 'ຕິດຕາມນິໄສ', 'ສຳຫຼວດອາຊີບ', 'XP ແລະ ມື້ຮຽນຕໍ່ເນື່ອງ', 'ຮຽນຮູ້ຜ່ານການຫຼິ້ນ'],
    howEyebrow: 'ຈັງຫວະການຮຽນທີ່ຄົບວົງຈອນ',
    howTitle: 'ຮຽນ. ຝຶກ. ເກັ່ງຂຶ້ນທຸກມື້.',
    steps: [
      { title: 'ຮຽນ', text: 'ບົດຮຽນສັ້ນໆ ຈາກ 8 ເສັ້ນທາງທີ່ໃຊ້ໄດ້ຈິງ ເໝາະກັບຕາຕະລາງຂອງທ່ານ.' },
      { title: 'ຝຶກ', text: 'ແບບທົດສອບສັ້ນໆ ຊ່ວຍປ່ຽນການອ່ານໃຫ້ກາຍເປັນຄວາມຈື່.' },
      { title: 'ກັບມາເກັ່ງຂຶ້ນ', text: 'ສະສົມ XP, ມື້ຮຽນຕໍ່ເນື່ອງ ແລະ ເຫັນຄວາມຄືບໜ້າ ເທື່ອລະມື້.' },
    ],
    stepNote: 'ຕົວຢ່າງ',
    featEyebrow: 'ພາຍໃນ Academy',
    featTitle: 'ທຸກຢ່າງທີ່ຊ່ວຍໃຫ້ທ່ານກ້າວຕໍ່ໄປ.',
    coachTitle: 'AI Coach ສ່ວນຕົວ',
    coachText: 'ຊ່ວຍເລື່ອງການຮຽນ, ອາຊີບ, AI ແລະ ພາສາອັງກິດ.',
    coachTopics: ['ການຮຽນ', 'ອາຊີບ', 'AI', 'ພາສາອັງກິດ'],
    coachNote: 'ຕົວຢ່າງບົດສົນທະນາ',
    challengeTitle: 'ຄວາມທ້າທາຍປະຈຳອາທິດທີ່ຊັດເຈນ',
    challengeText: 'ປ່ຽນຄວາມຮູ້ເປັນການກະທຳ.',
    habitTitle: 'ນິໄສທີ່ຕິດຕາມໄດ້',
    habitText: 'ກ້າວໜ້າຂຶ້ນເທື່ອລະມື້.',
    careerTitle: 'ສຳຫຼວດອາຊີບ',
    careerText: 'ສຳຫຼວດອາຊີບ, ທັກສະທີ່ຕ້ອງການ ແລະ ຂັ້ນຕອນຕໍ່ໄປທີ່ເຮັດໄດ້ຈິງ.',
    careerLink: 'ລອງເລີຍ — ບໍ່ຕ້ອງມີບັນຊີ',
    playTitle: 'ຮຽນຮູ້ຜ່ານການຫຼິ້ນ',
    playText: 'ກິດຈະກຳສັ້ນໆ. ຮຽນຮູ້ຈິງ.',
    labTitle: 'ຫ້ອງທົດລອງມຸມສູງສຸດ 3D',
    labText: 'ເພີ່ມມິຕິ ແລ້ວເບິ່ງມຸມສູງສຸດຍ້າຍໄປໄກອອກໄປ.',
    plansEyebrow: 'ສະມາຊິກ',
    plansTitle: 'ເລີ່ມຟຣີ. ຮຽນໃຫ້ເລິກຂຶ້ນເມື່ອທ່ານພ້ອມ.',
    freeName: 'ຟຣີ',
    freeText: 'ເລີ່ມຕົ້ນດ້ວຍແຮງຈູງໃຈປະຈຳວັນ ແລະ ຕົວຢ່າງລະບົບຜູ້ແນະນຳ.',
    freeFeatures: ['ຕົວຢ່າງແຮງຈູງໃຈປະຈຳວັນ', 'ເຂົ້າສູນການຮຽນໄດ້ບາງສ່ວນ', 'ຄັງ AI Prompt ເບື້ອງຕົ້ນ'],
    premiumName: 'Premium',
    premiumText: 'ຜູ້ແນະນຳປະຈຳວັນ, AI Coach, ເສັ້ນທາງການຮຽນ, ຊຸດ Prompt ແລະ ເຄື່ອງມືເພີ່ມຜົນງານ.',
    premiumFeatures: ['ແດຊບອດຜູ້ແນະນຳປະຈຳວັນ', 'ໃຊ້ AI Coach', 'ບົດຮຽນ ແລະ ແຫຼ່ງຮຽນຮູ້ Premium', 'ເຂົ້າຄັງ Prompt', 'ຕິດຕາມມື້ຮຽນຕໍ່ເນື່ອງ ແລະ ຄວາມທ້າທາຍ', 'ປຶກສາຊີວິດສ່ວນຕົວ'],
    seePlans: 'ເບິ່ງແພັກເກັດ ແລະ ລາຄາ',
    finalDefault: 'ບົດໃໝ່ຂອງທ່ານ ເລີ່ມຈາກບົດຮຽນດຽວ.',
    finalPath: (name: string, path: string) => `${name ? `${name}, ` : ''}ການເດີນທາງ ${path} ຂອງທ່ານ ເລີ່ມຕົ້ນມື້ນີ້.`,
    finalText: 'ສ້າງບັນຊີຟຣີ ແລ້ວກ້າວທຳອິດໄດ້ເລີຍມື້ນີ້.',
    haveAccount: 'ຂ້ອຍມີບັນຊີແລ້ວ',
    bookstore: 'ຮ້ານປຶ້ມ',
    footer: `© ${new Date().getFullYear()} Bitdoin. ສະຫງວນລິຂະສິດທຸກຢ່າງ.`,
  },
}

function dayPart(hour: number) {
  if (hour < 5) return 'night'
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

const DAY_ICONS = { morning: Sunrise, afternoon: Sun, evening: Sunset, night: Moon }

// Light mode is the cream/orange look of the sign-in page (src/pages/Auth.tsx); dark mode is its gray-950 look.
const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-amber-300/80 dark:focus-visible:ring-offset-gray-950'
const primaryButton = 'group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#fbb040] to-[#f7931a] px-6 py-3.5 text-sm font-black text-[#1f1207] shadow-[0_12px_36px_-10px_rgba(247,147,26,0.75)] transition hover:from-[#ffc766] hover:to-[#fbb040] hover:shadow-[0_16px_44px_-8px_rgba(247,147,26,0.9)]'
const ghostButton = 'inline-flex items-center justify-center rounded-full border border-slate-900/15 bg-white/60 px-6 py-3.5 text-sm font-black text-slate-900 transition hover:bg-white dark:border-white/20 dark:bg-transparent dark:text-white dark:hover:bg-white/10'
const eyebrowClass = 'text-xs font-black uppercase tracking-[0.2em] text-orange-700 dark:text-amber-300'
const bodyText = 'text-slate-600 dark:text-slate-400'

export function AcademyLanding() {
  const { profile, loading } = useAuth()
  const { language, setLanguage } = useLanguage()
  const dark = useTheme(state => state.theme) === 'dark'
  const toggleTheme = useTheme(state => state.toggleTheme)
  const lo = language === 'lo'
  const t = copy[language]

  const [initial] = useState(readVisitor)
  const [name, setName] = useState(initial.name)
  const [pathSlug, setPathSlug] = useState(initial.path)
  const [hour] = useState(() => new Date().getHours())
  const [no3d, setNo3d] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [ctaVisible, setCtaVisible] = useState(true)
  const [dockHeight, setDockHeight] = useState(0)
  const ctaRef = useRef<HTMLDivElement>(null)
  const dockRef = useRef<HTMLDivElement>(null)

  const selected = ACADEMY_PATHS.findIndex(path => path.slug === pathSlug)
  const path = selected >= 0 ? ACADEMY_PATHS[selected] : null
  const accent = path?.color ?? '#fbbf24'
  // Pale path colours (amber, cyan) lose contrast as text on cream, so light mode darkens them.
  const tone = (color: string) => (dark ? color : `color-mix(in srgb, ${color} 58%, #1e293b)`)
  const orbs = useMemo(() => ACADEMY_PATHS.map(item => ({ color: item.color, label: item.name[language] })), [language])
  const orbColors = useMemo(() => ACADEMY_PATHS.map(item => item.color), [])
  // Phones on Save-Data skip the 3D download and keep the static orbit.
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true
  const show3d = !no3d && !saveData

  useEffect(() => {
    try {
      localStorage.setItem(VISITOR_KEY, JSON.stringify({ name, path: pathSlug }))
    } catch {
      // Storage can be unavailable (private mode); the choice just won't survive a reload.
    }
  }, [name, pathSlug])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // The phone bar offers sign-up once the hero's own buttons have scrolled away.
  useEffect(() => {
    const node = ctaRef.current
    if (!node) return
    // Only once they have scrolled past (above the viewport); below the fold the header button is enough.
    const observer = new IntersectionObserver(([entry]) => setCtaVisible(entry.isIntersecting || entry.boundingClientRect.top > 0))
    observer.observe(node)
    return () => observer.disconnect()
  }, [loading])

  useEffect(() => {
    const node = dockRef.current
    if (!node) return
    const observer = new ResizeObserver(() => setDockHeight(Math.round(node.getBoundingClientRect().height)))
    observer.observe(node)
    return () => observer.disconnect()
  }, [loading])

  if (loading) return null
  if (profile?.role === 'CUSTOMER') return <Navigate to="/academy/home" replace />
  if (profile) return <Navigate to="/academy-admin" replace />

  const part = dayPart(hour)
  const DayIcon = DAY_ICONS[part]
  const greeting = (initial.name || initial.path) ? t.welcomeBack : t.greeting[part]
  const quote = path?.quote ?? DEFAULT_QUOTE
  const quoteLabel = path ? `${path.name[language]}${name ? ` · ${t.forName(name)}` : ''}` : t.quoteDefault
  const primaryLabel = path ? t.startPath(path.name[language]) : t.createAccount
  // After sign-up the member lands on the path they picked.
  const from = path ? `/academy/learn/${path.slug}` : '/academy/home'
  const signupState = { from, mode: 'signup' }
  const signinState = { from }
  const display = lo ? 'leading-[1.4]' : 'leading-[1.04]'
  const stageBackground = dark
    ? 'radial-gradient(ellipse 80% 60% at 50% 38%, #1d2a4d 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 15% 100%, #2b1c1c 0%, transparent 70%), #0b1020'
    : 'radial-gradient(ellipse 80% 60% at 50% 38%, #ffe3b8 0%, transparent 72%), radial-gradient(ellipse 60% 50% at 15% 100%, #ffd2a1 0%, transparent 70%), #fff3df'
  const gridLine = dark ? 'rgba(255,255,255,0.05)' : 'rgba(194,100,20,0.11)'
  const gridMask = 'radial-gradient(ellipse 72% 62% at 50% 40%, black, transparent)'

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fff7ec] via-white to-[#fff1e2] pb-24 text-slate-900 dark:from-gray-950 dark:via-gray-950 dark:to-gray-950 dark:text-white lg:pb-0">
      <header className={cn('sticky top-0 z-40 border-b transition-colors duration-300', scrolled ? 'border-slate-900/10 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-gray-950/80' : 'border-transparent')}>
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:h-20 sm:gap-3 sm:px-6">
          <Link to="/academy" aria-label="Bitdoin Academy" className={cn('flex flex-none items-center gap-2.5 rounded-2xl sm:gap-3', focusRing)}>
            <span className="grid h-10 w-10 flex-none place-items-center rounded-2xl bg-gradient-to-br from-[#fbb040] to-[#f7931a] text-[#1f1207] shadow-[0_8px_20px_-8px_rgba(247,147,26,0.8)] sm:h-11 sm:w-11"><GraduationCap className="h-6 w-6" /></span>
            <div className="max-[379px]:hidden">
              <p className="whitespace-nowrap font-black leading-tight">Bitdoin Academy</p>
              <p className="hidden text-[10px] font-bold uppercase tracking-[0.18em] text-orange-700 dark:text-amber-300 sm:block">Learn · Practice · Grow</p>
            </div>
          </Link>
          <nav aria-label="Academy" className="ml-6 hidden items-center gap-1 lg:flex">
            {[['#how', t.navHow], ['#features', t.navFeatures], ['#plans', t.navPlans]].map(([href, label]) => (
              <a key={href} href={href} className={cn('rounded-full px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-900/5 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white', focusRing)}>{label}</a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-0.5 sm:gap-2">
            <Link to="/" className="hidden rounded-full px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-900/5 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white xl:block">{t.switchPlatform}</Link>
            <button type="button" onClick={() => setLanguage(lo ? 'en' : 'lo')} aria-label={lo ? 'English' : 'ລາວ'} className={cn('flex h-10 min-w-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-bold text-slate-600 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-white/5 sm:px-3', focusRing)}>
              <Languages className="h-4 w-4" /><span className="hidden min-[420px]:inline">{lo ? 'English' : 'ລາວ'}</span>
            </button>
            <button type="button" onClick={toggleTheme} aria-label={dark ? t.lightMode : t.darkMode} title={dark ? t.lightMode : t.darkMode} className={cn('grid h-10 w-10 place-items-center rounded-full text-slate-600 transition hover:bg-slate-900/5 dark:text-amber-300 dark:hover:bg-white/10', focusRing)}>
              {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>
            <Link to="/auth" state={signinState} className={cn('hidden rounded-full px-4 py-2.5 text-sm font-black transition hover:bg-slate-900/5 dark:hover:bg-white/10 sm:block', focusRing)}>{t.signIn}</Link>
            <Link to="/auth" state={signupState} className={cn('whitespace-nowrap rounded-full bg-gradient-to-r from-[#fbb040] to-[#f7931a] px-3.5 py-2.5 sm:ml-1 sm:px-4 text-sm font-black text-[#1f1207] shadow-[0_8px_22px_-8px_rgba(247,147,26,0.8)] transition hover:from-[#ffc766] hover:to-[#fbb040]', focusRing)}>{t.startFree}</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden px-4 pb-14 pt-4 sm:px-6 sm:pb-24 sm:pt-10 lg:pt-14">
          <div aria-hidden className="absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-amber-300/40 blur-[110px] dark:bg-amber-400/15" />
          <div aria-hidden className="absolute -left-52 top-1/3 h-[30rem] w-[30rem] rounded-full bg-orange-200/50 blur-[120px] dark:bg-indigo-500/15" />
          {/* One column on phones (intro, sign-up buttons, stage, quote); two on large screens (text left, stage right). */}
          <div className="relative mx-auto grid max-w-7xl items-center gap-x-12 gap-y-7 lg:grid-cols-[1.02fr_0.98fr] lg:gap-y-8">
            <div className="order-1 lg:order-none lg:col-start-1 lg:row-start-1">
              <label className="inline-flex max-w-full items-center gap-2.5 rounded-full border border-slate-900/10 bg-white/80 py-1.5 pl-3.5 pr-1.5 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200 dark:shadow-none">
                <DayIcon className="h-4 w-4 flex-none text-orange-600 dark:text-amber-300" />
                <span className="whitespace-nowrap">{greeting}{name ? ',' : ''}</span>
                <input
                  value={name}
                  maxLength={NAME_MAX}
                  onChange={event => setName(event.target.value)}
                  placeholder={t.namePlaceholder}
                  aria-label={t.nameLabel}
                  autoComplete="given-name"
                  style={{ width: `${Math.max(12, name.length + 4)}ch` }}
                  className="min-w-0 max-w-[12rem] rounded-full bg-orange-100/70 px-3 py-1 text-base font-bold text-slate-900 placeholder:font-medium placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-400/70 dark:bg-white/10 dark:text-white dark:placeholder:text-slate-400 dark:focus:ring-amber-300/70 sm:text-sm"
                />
              </label>
              <h1 className={cn('mt-5 text-balance font-black tracking-tight sm:mt-6', display, lo ? 'text-[2.2rem] min-[400px]:text-[2.4rem] sm:text-6xl xl:text-[4.25rem]' : 'text-[2.5rem] min-[400px]:text-[2.75rem] sm:text-6xl xl:text-[4.5rem]')}>
                {t.titleA}{' '}
                <span className="bg-gradient-to-r from-[#e2650f] via-[#f7931a] to-[#d97706] bg-clip-text text-transparent dark:from-amber-200 dark:via-amber-400 dark:to-orange-400">{t.titleB}</span>
              </h1>
              <p className={cn('mt-4 max-w-xl text-base leading-7 sm:mt-5 sm:text-lg sm:leading-8', bodyText, 'dark:text-slate-300')}>{t.subtitle}</p>
            </div>

            {/* The stage: 3D cap and one orb per path, with the path picker docked at its foot. */}
            <div className="order-3 lg:order-none lg:col-start-2 lg:row-span-3 lg:row-start-1">
              <div
                className="relative h-[400px] overflow-hidden rounded-[1.75rem] border border-orange-900/10 shadow-[0_40px_90px_-40px_rgba(226,101,15,0.55)] dark:border-white/10 dark:shadow-[0_40px_90px_-40px_rgba(0,0,0,0.9)] min-[400px]:h-[430px] sm:h-[520px] sm:rounded-[2rem] lg:h-[620px]"
                style={{ background: stageBackground }}
              >
                <div aria-hidden className="absolute inset-0 opacity-60 dark:opacity-50" style={{ backgroundImage: `linear-gradient(${gridLine} 1px, transparent 1px), linear-gradient(90deg, ${gridLine} 1px, transparent 1px)`, backgroundSize: '44px 44px', maskImage: gridMask, WebkitMaskImage: gridMask }} />
                {show3d ? (
                  <Suspense fallback={<OrbitFallback colors={orbColors} active={selected} />}>
                    <AcademyHero3D
                      orbs={orbs}
                      selected={selected}
                      dark={dark}
                      insetBottom={dockHeight}
                      onSelect={index => setPathSlug(index >= 0 ? ACADEMY_PATHS[index].slug : '')}
                      onUnavailable={() => setNo3d(true)}
                    />
                  </Suspense>
                ) : (
                  <OrbitFallback colors={orbColors} active={selected} />
                )}
                <div className="pointer-events-none absolute inset-x-4 top-4 flex items-center justify-between gap-3 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-orange-700/80 dark:text-amber-200/80">
                  <span className="inline-flex flex-none items-center gap-1.5"><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500 motion-reduce:animate-none dark:bg-emerald-400" />{t.live}</span>
                  <span className={cn('text-right', lo && 'font-lao text-xs tracking-normal')}>{t.hint}</span>
                </div>
                <div ref={dockRef} className="absolute inset-x-0 bottom-0 border-t border-slate-900/10 bg-white/80 px-3 pb-3 pt-2.5 backdrop-blur-md dark:border-white/10 dark:bg-gray-950/75">
                  <p id="path-picker" className={cn('mb-2 px-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400', lo && 'font-lao text-xs tracking-normal')}>{t.pickLabel}</p>
                  <div role="group" aria-labelledby="path-picker" className="scrollbar-hide -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 pr-8 lg:flex-wrap lg:overflow-visible lg:pr-1">
                    {ACADEMY_PATHS.map((item, index) => {
                      const Icon = PATH_ICONS[item.slug]
                      const on = index === selected
                      return (
                        <button
                          key={item.slug}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setPathSlug(on ? '' : item.slug)}
                          className={cn('inline-flex min-h-10 flex-none items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-bold transition lg:min-h-9', on ? 'text-slate-900 dark:text-white' : 'border-slate-900/10 bg-white text-slate-700 hover:border-orange-400/60 hover:bg-orange-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-white/30 dark:hover:bg-white/10', focusRing)}
                          style={on ? { borderColor: item.color, background: `${item.color}${dark ? '26' : '33'}`, boxShadow: `0 0 22px -6px ${item.color}` } : undefined}
                        >
                          <Icon className="h-3.5 w-3.5" style={{ color: tone(item.color) }} />{item.name[language]}
                        </button>
                      )
                    })}
                  </div>
                  {/* Fade at the right edge hints that the chip row scrolls on phones. */}
                  <div aria-hidden className="pointer-events-none absolute bottom-3 right-0 h-10 w-9 bg-gradient-to-l from-white/95 to-transparent dark:from-gray-950/95 lg:hidden" />
                </div>
              </div>
            </div>

            <div className="order-4 lg:order-none lg:col-start-1 lg:row-start-2">
              <figure aria-live="polite" className={cn('relative overflow-hidden rounded-2xl p-5 pl-6 backdrop-blur', cardSurface)}>
                <span aria-hidden className="absolute inset-y-0 left-0 w-1 transition-colors duration-500" style={{ background: accent }} />
                <span aria-hidden className="absolute -top-3 right-4 select-none font-serif text-7xl font-black leading-none text-slate-900/[0.06] dark:text-white/[0.06]">”</span>
                <p className={cn('font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] transition-colors duration-500', !path && 'text-orange-700 dark:text-amber-300', lo && 'font-lao text-xs tracking-normal')} style={path ? { color: tone(accent) } : undefined}>{quoteLabel}</p>
                <blockquote key={path?.slug ?? 'default'} className="mt-2 animate-fade-in text-lg font-bold leading-snug sm:text-xl">“{quote[language]}”</blockquote>
                <figcaption className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">— {quote.by}</figcaption>
                {path && <p className="mt-3 border-t border-slate-900/10 pt-3 text-sm leading-6 text-slate-600 dark:border-white/10 dark:text-slate-300">{path.blurb[language]}</p>}
              </figure>
            </div>

            <div className="order-2 lg:order-none lg:col-start-1 lg:row-start-3">
              <div ref={ctaRef} className="flex flex-wrap items-center gap-3">
                <Link to="/auth" state={signupState} className={cn(primaryButton, 'w-full sm:w-auto', focusRing)}>{primaryLabel}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
                <Link to="/auth" state={signinState} className={cn(ghostButton, 'flex-1 sm:flex-none', focusRing)}>{t.signIn}</Link>
                <Link to="/academy/subscription" className={cn('rounded-full px-3 py-2 text-sm font-bold text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline dark:text-slate-300 dark:hover:text-white', focusRing)}>{t.membership}</Link>
              </div>
              <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                {t.trust.map(item => <li key={item} className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={3} />{item}</li>)}
              </ul>
            </div>
          </div>
        </section>

        <div aria-hidden className="overflow-hidden border-y border-slate-900/10 bg-white/50 py-4 dark:border-white/10 dark:bg-white/[0.02]" style={{ maskImage: 'linear-gradient(90deg, transparent, black 10%, black 90%, transparent)', WebkitMaskImage: 'linear-gradient(90deg, transparent, black 10%, black 90%, transparent)' }}>
          <div className="flex w-max animate-marquee motion-reduce:animate-none">
            {[0, 1].flatMap(copyIndex => [...ACADEMY_PATHS.map(item => item.name[language]), ...t.marquee].map(label => (
              <span key={`${copyIndex}-${label}`} className="flex items-center gap-8 pl-8 text-sm font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                {label}<span className="h-1.5 w-1.5 rounded-full bg-orange-500/70 dark:bg-amber-300/70" />
              </span>
            )))}
          </div>
        </div>

        <section id="how" className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-7xl">
            <Reveal>
              <p className={cn(eyebrowClass, lo && 'tracking-normal')}>{t.howEyebrow}</p>
              <h2 className={cn('mt-4 max-w-3xl text-balance text-3xl font-black sm:text-5xl', display)}>{t.howTitle}</h2>
            </Reveal>
            <div className="mt-10 grid gap-5 sm:mt-12 md:grid-cols-3">
              {t.steps.map((step, index) => (
                <Reveal key={step.title} delay={index * 120}>
                  <div className={cn('h-full rounded-[1.75rem] p-5 sm:p-6', cardSurface)}>
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-gradient-to-br from-[#fbb040] to-[#f7931a] font-mono text-sm font-black text-[#1f1207]">{index + 1}</span>
                      <h3 className="text-2xl font-black">{step.title}</h3>
                    </div>
                    <p className={cn('mt-3 text-sm leading-7 md:min-h-[3.5rem]', bodyText)}>{step.text}</p>
                    <div className="mt-5">{index === 0 ? <LessonMock lo={lo} /> : index === 1 ? <QuizMock lo={lo} /> : <ProgressMock lo={lo} />}</div>
                    <p className="mt-3 text-center text-[11px] font-semibold text-slate-500">{t.stepNote}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-20 border-y border-orange-900/10 bg-white/60 px-4 py-16 dark:border-white/10 dark:bg-white/[0.02] sm:px-6 sm:py-28">
          <div className="mx-auto max-w-7xl">
            <Reveal>
              <p className={cn(eyebrowClass, lo && 'tracking-normal')}>{t.featEyebrow}</p>
              <h2 className={cn('mt-4 max-w-3xl text-balance text-3xl font-black sm:text-5xl', display)}>{t.featTitle}</h2>
            </Reveal>
            <div className="mt-10 grid gap-4 sm:mt-12 md:grid-cols-6">
              <Reveal className="md:col-span-4 md:row-span-2">
                <SpotlightCard className="h-full">
                  <Tile icon={Brain} tone="text-amber-700 bg-amber-500/20 dark:text-amber-300 dark:bg-amber-300/15" title={t.coachTitle} text={t.coachText} />
                  <div className="mt-6 flex-1"><CoachMock lo={lo} /></div>
                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    {t.coachTopics.map(topic => <span key={topic} className="rounded-full border border-slate-900/10 px-3 py-1 text-xs font-bold text-slate-600 dark:border-white/10 dark:text-slate-300">{topic}</span>)}
                    <span className="ml-auto text-[11px] font-semibold text-slate-500">{t.coachNote}</span>
                  </div>
                </SpotlightCard>
              </Reveal>
              <Reveal delay={100} className="md:col-span-2">
                <SpotlightCard className="h-full">
                  <Tile icon={Target} tone="text-emerald-700 bg-emerald-500/15 dark:text-emerald-300 dark:bg-emerald-300/15" title={t.challengeTitle} text={t.challengeText} />
                  <div className="mt-5"><ChallengeMock lo={lo} /></div>
                </SpotlightCard>
              </Reveal>
              <Reveal delay={180} className="md:col-span-2">
                <SpotlightCard className="h-full">
                  <Tile icon={ListChecks} tone="text-rose-700 bg-rose-500/15 dark:text-rose-300 dark:bg-rose-300/15" title={t.habitTitle} text={t.habitText} />
                  <div className="mt-5"><HabitMock lo={lo} /></div>
                </SpotlightCard>
              </Reveal>
              <Reveal className="md:col-span-2">
                <SpotlightCard className="h-full">
                  <Tile icon={Compass} tone="text-cyan-700 bg-cyan-500/15 dark:text-cyan-300 dark:bg-cyan-300/15" title={t.careerTitle} text={t.careerText} />
                  <div className="mt-5 flex-1"><CareerMock lo={lo} /></div>
                  <Link to="/academy/careers" className={cn('mt-4 inline-flex items-center gap-1.5 text-sm font-black text-cyan-700 hover:text-cyan-900 dark:text-cyan-300 dark:hover:text-cyan-200', focusRing)}>{t.careerLink}<ArrowRight className="h-4 w-4" /></Link>
                </SpotlightCard>
              </Reveal>
              <Reveal delay={100} className="md:col-span-2">
                <SpotlightCard className="h-full">
                  <Tile icon={Gamepad2} tone="text-violet-700 bg-violet-500/15 dark:text-violet-300 dark:bg-violet-300/15" title={t.playTitle} text={t.playText} />
                  <div className="mt-5"><PlayMock lo={lo} /></div>
                </SpotlightCard>
              </Reveal>
              <Reveal delay={180} className="md:col-span-2">
                <SpotlightCard className="h-full">
                  <Tile icon={Box} tone="text-orange-700 bg-orange-500/15 dark:text-orange-300 dark:bg-orange-300/15" title={t.labTitle} text={t.labText} />
                  <div className="mt-2 flex-1"><CubeMock /></div>
                </SpotlightCard>
              </Reveal>
            </div>
          </div>
        </section>

        <section id="plans" className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-5xl">
            <Reveal className="text-center">
              <p className={cn(eyebrowClass, lo && 'tracking-normal')}>{t.plansEyebrow}</p>
              <h2 className={cn('mx-auto mt-4 max-w-3xl text-balance text-3xl font-black sm:text-5xl', display)}>{t.plansTitle}</h2>
            </Reveal>
            <div className="mt-10 grid gap-5 sm:mt-12 md:grid-cols-2">
              <Reveal>
                <div className={cn('flex h-full flex-col rounded-[1.75rem] p-6 sm:p-7', cardSurface)}>
                  <h3 className="text-2xl font-black">{t.freeName}</h3>
                  <p className={cn('mt-2 text-sm leading-7', bodyText)}>{t.freeText}</p>
                  <PlanList items={t.freeFeatures} />
                  <Link to="/auth" state={signupState} className={cn(primaryButton, 'mt-8', focusRing)}>{t.createAccount}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
                </div>
              </Reveal>
              <Reveal delay={120}>
                <div className="relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-orange-400/50 bg-gradient-to-b from-amber-100/80 to-white p-6 shadow-[0_18px_44px_-28px_rgba(194,100,20,0.45)] dark:border-amber-300/40 dark:from-amber-300/[0.09] dark:to-transparent dark:shadow-none sm:p-7">
                  <div aria-hidden className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-400/30 blur-[60px] dark:bg-amber-400/20" />
                  <h3 className="relative text-2xl font-black text-orange-700 dark:text-amber-200">{t.premiumName}</h3>
                  <p className="relative mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{t.premiumText}</p>
                  <PlanList items={t.premiumFeatures} />
                  <Link to="/academy/subscription" className={cn(ghostButton, 'relative mt-8', focusRing)}>{t.seePlans}</Link>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <section className="px-4 pb-16 sm:px-6 sm:pb-28">
          <Reveal>
            {/* Light: the orange panel of the sign-in page. Dark: its night-sky panel, moon and stars included. */}
            <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#fbb040] via-[#f7931a] to-[#e2650f] px-6 py-12 text-[#1f1207] dark:from-[#3a220f] dark:via-[#1f140b] dark:to-[#0f0a06] dark:text-white sm:rounded-[2.25rem] sm:px-14 sm:py-20">
              <div aria-hidden className="absolute -left-24 top-10 h-72 w-72 rounded-[45%] bg-gradient-to-b from-[#ffc76b]/60 to-transparent dark:from-[#f7931a]/20" />
              <div aria-hidden className="absolute inset-0 hidden dark:block">
                <div className="absolute right-8 top-8 h-10 w-10 rounded-full shadow-[inset_-9px_-5px_0_0_#fbbf6b] sm:right-14 sm:top-12" />
                {[[18, 30], [42, 14], [64, 26], [80, 46], [30, 62], [56, 44], [88, 20], [72, 70]].map(([left, top]) => (
                  <span key={`${left}-${top}`} className="absolute h-1 w-1 rounded-full bg-amber-100/70" style={{ left: `${left}%`, top: `${top}%` }} />
                ))}
              </div>
              <GraduationCap aria-hidden className="absolute -bottom-10 -right-6 h-56 w-56 rotate-[-12deg] text-white/25 dark:text-amber-300/10 sm:h-80 sm:w-80" strokeWidth={1.2} />
              <div className="relative max-w-3xl">
                <h2 key={path?.slug ?? 'default'} className={cn('animate-fade-in text-balance text-3xl font-black sm:text-5xl', display)}>
                  {path ? t.finalPath(name, path.name[language]) : t.finalDefault}
                </h2>
                <p className="mt-4 max-w-xl text-base font-semibold leading-7 text-[#1f1207]/75 dark:text-slate-300 sm:text-lg sm:leading-8">{t.finalText}</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link to="/auth" state={signupState} className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1f1207] px-7 py-4 text-sm font-black text-amber-200 shadow-[0_16px_40px_-12px_rgba(31,18,7,0.7)] transition hover:bg-[#2c1a0b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f1207] focus-visible:ring-offset-2 focus-visible:ring-offset-amber-400 dark:bg-gradient-to-r dark:from-[#fbb040] dark:to-[#f7931a] dark:text-[#1f1207] dark:shadow-[0_16px_40px_-12px_rgba(247,147,26,0.6)] dark:hover:from-[#ffc766] dark:hover:to-[#fbb040] dark:focus-visible:ring-amber-300 dark:focus-visible:ring-offset-[#1f140b] sm:w-auto">{t.createAccount}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
                  <Link to="/auth" state={signinState} className="inline-flex w-full items-center justify-center rounded-full border-2 border-[#1f1207]/30 px-7 py-4 text-sm font-black transition hover:bg-[#1f1207]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f1207] dark:border-white/25 dark:hover:bg-white/10 dark:focus-visible:ring-amber-300 sm:w-auto">{t.haveAccount}</Link>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-slate-900/10 px-4 py-8 dark:border-white/10 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm font-semibold text-slate-500 dark:text-slate-400 sm:flex-row">
          <p>{t.footer}</p>
          <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <Link to="/academy/subscription" className="hover:text-slate-900 dark:hover:text-white">{t.navPlans}</Link>
            <Link to="/bookstore" className="hover:text-slate-900 dark:hover:text-white">{t.bookstore}</Link>
            <Link to="/" className="hover:text-slate-900 dark:hover:text-white">{t.switchPlatform}</Link>
          </nav>
        </div>
      </footer>

      {!ctaVisible && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex animate-slide-up items-center gap-3 border-t border-slate-900/10 bg-white/90 px-4 pt-3 backdrop-blur-xl dark:border-white/10 dark:bg-gray-950/90 lg:hidden" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <Link to="/auth" state={signupState} className={cn(primaryButton, 'min-w-0 flex-1 truncate', focusRing)}>{primaryLabel}</Link>
          <Link to="/auth" state={signinState} className={cn('flex-none rounded-full px-3 py-3 text-sm font-black text-slate-700 dark:text-slate-200', focusRing)}>{t.signIn}</Link>
        </div>
      )}
    </div>
  )
}

function Tile({ icon: Icon, tone, title, text }: { icon: LucideIcon; tone: string; title: string; text: string }) {
  return (
    <div>
      <span className={cn('grid h-11 w-11 place-items-center rounded-2xl', tone)}><Icon className="h-5 w-5" /></span>
      <h3 className="mt-4 text-xl font-black">{title}</h3>
      <p className={cn('mt-2 text-sm leading-7', bodyText)}>{text}</p>
    </div>
  )
}

function PlanList({ items }: { items: string[] }) {
  return (
    <ul className="relative mt-6 flex-1 space-y-3">
      {items.map(item => (
        <li key={item} className="flex items-start gap-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <span className="mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full bg-emerald-500/15 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300"><Check className="h-3 w-3" strokeWidth={3} /></span>
          {item}
        </li>
      ))}
    </ul>
  )
}
