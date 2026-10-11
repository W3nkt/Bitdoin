import { ArrowRight, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Language } from '@/types'

type Bilingual = { en: string; lo: string }

// Keyed by the onboarding answers in OnboardingChat (stored in English).
const MOTIVATION_LINES: Record<string, Bilingual> = {
  Family: { en: 'Everything you learn today is something your family can be proud of.', lo: 'ທຸກສິ່ງທີ່ທ່ານຮຽນມື້ນີ້ ຈະເຮັດໃຫ້ຄອບຄົວຂອງທ່ານພູມໃຈ.' },
  Money: { en: 'Every new skill is an investment that keeps paying you back.', lo: 'ທຸກທັກສະໃໝ່ ແມ່ນການລົງທຶນທີ່ໃຫ້ຜົນຕອບແທນແກ່ທ່ານຕະຫຼອດໄປ.' },
  Career: { en: "Today's practice is quietly building the career you want.", lo: 'ການຝຶກຝົນມື້ນີ້ ກຳລັງສ້າງອາຊີບທີ່ທ່ານຕ້ອງການ.' },
  Education: { en: 'Small steps today open big doors for your studies.', lo: 'ກ້າວນ້ອຍໆມື້ນີ້ ຈະເປີດປະຕູໃຫຍ່ໃຫ້ການສຶກສາຂອງທ່ານ.' },
  'Self-improvement': { en: "You're already a little better than yesterday. Keep going.", lo: 'ທ່ານເກັ່ງກວ່າມື້ວານແລ້ວ. ສືບຕໍ່ໄປ.' },
  Freedom: { en: 'Every skill you gain gives you more choices in life.', lo: 'ທຸກທັກສະທີ່ໄດ້ຮັບ ເຮັດໃຫ້ທ່ານມີທາງເລືອກໃນຊີວິດຫຼາຍຂຶ້ນ.' },
  'Helping others': { en: 'What you learn today, you can share with someone tomorrow.', lo: 'ສິ່ງທີ່ທ່ານຮຽນມື້ນີ້ ທ່ານສາມາດແບ່ງປັນໃຫ້ຄົນອື່ນໄດ້ໃນມື້ໜ້າ.' },
}
const DEFAULT_MOTIVATION_LINE: Bilingual = { en: "We're glad you're here. Let's make today count.", lo: 'ດີໃຈທີ່ທ່ານມາ. ມາເຮັດໃຫ້ມື້ນີ້ມີຄຸນຄ່າກັນ.' }

function laosNow() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Vientiane', hour: 'numeric', hourCycle: 'h23' }).formatToParts(new Date())
  return Number(parts.find(part => part.type === 'hour')?.value ?? 12)
}

function greetingFor(hour: number, language: Language) {
  const lo = language === 'lo'
  if (hour < 5) return { text: lo ? 'ຍັງຕັ້ງໃຈຮຽນຢູ່ເລີຍ' : 'Burning the midnight oil', emoji: '🌙' }
  if (hour < 12) return { text: lo ? 'ສະບາຍດີຕອນເຊົ້າ' : 'Good morning', emoji: '☀️' }
  if (hour < 17) return { text: lo ? 'ສະບາຍດີຕອນບ່າຍ' : 'Good afternoon', emoji: '🌤️' }
  return { text: lo ? 'ສະບາຍດີຕອນແລງ' : 'Good evening', emoji: '🌙' }
}

export function MemberGreeting({
  language,
  name,
  personalization,
  memberSince,
  onSetGoal,
}: {
  language: Language
  name: string
  personalization: Record<string, string>
  memberSince?: string | null
  onSetGoal: () => void
}) {
  const lo = language === 'lo'
  const greeting = greetingFor(laosNow(), language)
  const displayName = personalization.preferred_name?.trim() || name
  const goal = personalization.priority_goal?.trim()
  const line = MOTIVATION_LINES[personalization.motivation_source] ?? DEFAULT_MOTIVATION_LINE
  const journeyDay = memberSince
    ? Math.max(1, Math.floor((Date.now() - new Date(memberSince).getTime()) / 86_400_000) + 1)
    : null
  const today = new Intl.DateTimeFormat(lo ? 'lo-LA' : 'en-GB', { timeZone: 'Asia/Vientiane', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())

  return (
    <div data-no-premium-translate className="flex flex-col gap-3">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-primary-200">{lo ? 'ໜ້າສະມາຊິກ' : 'Member home'}</p>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-primary-100 ring-1 ring-white/10">
            {journeyDay && <span className="text-amber-300">{lo ? `ມື້ທີ ${journeyDay}` : `Day ${journeyDay}`} · </span>}
            {today}
          </span>
        </div>
        <h2 className="mt-2 text-2xl font-black leading-tight">
          {greeting.text}, {displayName} <span aria-hidden>{greeting.emoji}</span>
        </h2>
        <p className="mt-1 text-sm leading-6 text-primary-100">{lo ? line.lo : line.en}</p>
      </div>

      {goal ? (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400/15 via-white/5 to-transparent px-4 py-3 ring-1 ring-amber-300/25">
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-400/10 blur-2xl" />
          <p className="relative flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-amber-300">
            <Target className="h-3.5 w-3.5" />
            {lo ? 'ເປົ້າໝາຍຂອງທ່ານ' : 'Your goal'}
          </p>
          <p className="relative mt-1 line-clamp-2 text-sm font-bold leading-6 text-white">“{goal}”</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={onSetGoal}
          className="group flex items-center gap-3 rounded-2xl border border-dashed border-amber-300/40 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        >
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
            <Target className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-black text-white">{lo ? 'ຕັ້ງເປົ້າໝາຍຂອງທ່ານ' : 'Set your goal'}</span>
            <span className="mt-0.5 block text-xs font-semibold text-primary-200">
              {lo ? 'ບອກພວກເຮົາວ່າທ່ານຢາກໄປເຖິງໃສ ແລ້ວ Mentor ຈະຊ່ວຍທ່ານທຸກມື້.' : "Tell us what you're working toward and your mentor will tailor every day to it."}
            </span>
          </span>
          <ArrowRight className="h-4 w-4 flex-shrink-0 text-amber-300 transition group-hover:translate-x-1" />
        </button>
      )}
    </div>
  )
}

export function TodayNudges({
  language,
  mentorCompleted,
  streak,
}: {
  language: Language
  mentorCompleted: number
  streak: number
}) {
  const lo = language === 'lo'
  const mentorText = mentorCompleted >= 3
    ? (lo ? 'Mentor ມື້ນີ້ສຳເລັດແລ້ວ. ເກັ່ງຫຼາຍ!' : "Today's mentor is done. Brilliant work!")
    : mentorCompleted > 0
      ? (lo ? `ເຮັດ Mentor ແລ້ວ ${mentorCompleted}/3. ອີກໜ້ອຍດຽວ!` : `${mentorCompleted} of 3 mentor tasks done. Almost there!`)
      : streak > 1
        ? (lo ? `ຮັກສາສະຖິຕິ ${streak} ມື້ຂອງທ່ານໄວ້ — ເລີ່ມ Mentor ມື້ນີ້.` : `Keep your ${streak}-day streak alive. Start today's mentor.`)
        : (lo ? 'Mentor ປະຈຳວັນລໍທ່ານຢູ່. 3 ຄຳຕອບສັ້ນໆ.' : 'Your daily mentor is waiting. Just 3 quick replies.')

  return (
    <a
        href="#mentor"
        data-no-premium-translate
        className={cn(
          'group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold ring-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300',
          mentorCompleted >= 3
            ? 'bg-emerald-400/10 text-emerald-200 ring-emerald-300/25 hover:bg-emerald-400/15'
            : 'bg-white/5 text-white ring-white/10 hover:bg-white/10',
        )}
      >
        <span aria-hidden className="text-base">{mentorCompleted >= 3 ? '🏆' : streak > 1 ? '🔥' : '✨'}</span>
        <span className="min-w-0 flex-1">{mentorText}</span>
        <ArrowRight className="h-4 w-4 flex-shrink-0 opacity-70 transition group-hover:translate-x-1" />
      </a>
  )
}
