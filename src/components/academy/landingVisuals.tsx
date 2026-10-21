import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, Flame, GraduationCap, Languages, MessagesSquare, Zap } from 'lucide-react'
import { OpenBook } from '@/components/ui/OpenBook'
import { cn } from '@/lib/utils'

// Small building blocks for the Academy landing page (src/pages/academy/AcademyLanding.tsx):
// scroll reveal, a cursor-lit card, the static orbit shown when 3D is unavailable, and the
// product mock-ups. The mock-ups are illustrations with sample text, not live data.
// Light mode is the cream/orange look of the sign-in page; dark mode is the gray-950 one.

/** Fades and lifts its children in the first time they scroll into view. */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (!('IntersectionObserver' in window)) {
      setShown(true)
      return
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      setShown(true)
      observer.disconnect()
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      style={{ transitionDelay: shown ? `${delay}ms` : undefined }}
      className={cn(
        'transition-all duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none',
        shown ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Surface shared by the page's cards. */
export const cardSurface = 'border border-slate-900/10 bg-white shadow-[0_18px_44px_-28px_rgba(194,100,20,0.4)] dark:border-white/10 dark:bg-white/[0.035] dark:shadow-none'

/** A card with a soft amber light that follows the cursor. */
export function SpotlightCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      onPointerMove={event => {
        const rect = event.currentTarget.getBoundingClientRect()
        event.currentTarget.style.setProperty('--mx', `${event.clientX - rect.left}px`)
        event.currentTarget.style.setProperty('--my', `${event.clientY - rect.top}px`)
      }}
      className={cn('group relative overflow-hidden rounded-[1.75rem] p-5 transition-colors duration-300 hover:border-orange-400/50 dark:hover:border-amber-300/30 sm:p-7', cardSurface, className)}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: 'radial-gradient(380px circle at var(--mx, 50%) var(--my, 50%), rgba(247,147,26,0.13), transparent 62%)' }}
      />
      <div className="relative flex h-full flex-col">{children}</div>
    </div>
  )
}

/** Static stand-in for the 3D hero: while it loads, when WebGL fails, and on Save-Data. */
export function OrbitFallback({ colors, active }: { colors: string[]; active: number }) {
  return (
    <div aria-hidden className="absolute inset-0 grid place-items-center">
      <div className="absolute h-56 w-56 rounded-full bg-amber-400/30 blur-[70px] dark:bg-amber-400/20" />
      <div className="relative aspect-square w-[min(66%,21rem)] animate-orbit motion-reduce:animate-none">
        <div className="absolute inset-0 rounded-full border border-orange-500/35 dark:border-amber-300/30" />
        <div className="absolute inset-[21%] rounded-full border border-orange-500/15 dark:border-amber-300/10" />
        {colors.map((color, i) => {
          const angle = (i / colors.length) * Math.PI * 2
          return (
            <span
              key={color}
              className={cn('absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-500', i === active ? 'h-5 w-5' : 'h-3 w-3')}
              style={{ left: `${50 + 50 * Math.cos(angle)}%`, top: `${50 + 50 * Math.sin(angle)}%`, background: color, boxShadow: `0 0 ${i === active ? 26 : 14}px ${color}` }}
            />
          )
        })}
      </div>
      <div className="absolute grid h-28 w-28 animate-float place-items-center rounded-[2rem] border border-orange-400/40 bg-gradient-to-br from-amber-200/80 to-orange-100/40 shadow-[0_0_60px_-10px_rgba(247,147,26,0.55)] motion-reduce:animate-none dark:border-amber-300/30 dark:from-amber-300/25 dark:to-amber-500/5 dark:shadow-[0_0_60px_-10px_rgba(251,191,36,0.6)]">
        <GraduationCap className="h-14 w-14 text-orange-600 dark:text-amber-300" strokeWidth={1.5} />
      </div>
    </div>
  )
}

/* ---------- "How it works" mock-ups ---------- */

const mockShell = 'rounded-2xl border border-orange-900/10 bg-orange-50/70 p-4 shadow-[0_24px_50px_-30px_rgba(120,60,10,0.45)] dark:border-white/10 dark:bg-gray-900 dark:shadow-[0_24px_50px_-28px_rgba(0,0,0,0.9)]'
const mockTitle = 'font-black leading-snug text-slate-900 dark:text-white'
const mockLabel = 'text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400'
const rowSurface = 'border border-slate-900/10 bg-white/70 dark:border-white/10 dark:bg-white/[0.04]'

export function LessonMock({ lo }: { lo: boolean }) {
  return (
    <div className={mockShell}>
      <div className="flex items-center justify-between text-[11px] font-bold">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/15 px-2.5 py-1 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300"><OpenBook className="h-3 w-3" />{lo ? 'ສະຫຼຸບປຶ້ມ' : 'Reading summary'}</span>
        <span className="text-slate-500 dark:text-slate-400">{lo ? '5 ນາທີ' : '5 min'}</span>
      </div>
      <p className={cn('mt-4 text-[15px]', mockTitle)}>{lo ? 'ແນວຄິດສຳຄັນ → ການນຳໄປໃຊ້' : 'Big ideas → practical actions'}</p>
      <div className="mt-3 space-y-2" aria-hidden>
        <div className="h-2 w-full rounded-full bg-slate-900/10 dark:bg-white/10" />
        <div className="h-2 w-11/12 rounded-full bg-slate-900/10 dark:bg-white/10" />
        <div className="h-2 w-2/3 rounded-full bg-slate-900/10 dark:bg-white/10" />
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
        {(lo ? ['ຈຸດສຳຄັນ 1', 'ຈຸດສຳຄັນ 2', 'ຈຸດສຳຄັນ 3'] : ['Takeaway 1', 'Takeaway 2', 'Takeaway 3']).map(label => (
          <span key={label} className="rounded-full border border-slate-900/10 px-2.5 py-1 dark:border-white/10">{label}</span>
        ))}
      </div>
    </div>
  )
}

export function QuizMock({ lo }: { lo: boolean }) {
  const options = lo
    ? ['ເລີ່ມນ້ອຍໆ ແລະ ເຮັດທຸກມື້', 'ລໍຖ້າໃຫ້ມີແຮງຈູງໃຈ', 'ປ່ຽນທຸກຢ່າງພ້ອມກັນ']
    : ['Start tiny and repeat daily', 'Wait until you feel motivated', 'Change everything at once']
  return (
    <div className={mockShell}>
      <p className={mockLabel}>{lo ? 'ແບບທົດສອບ' : 'Knowledge check'}</p>
      <p className={cn('mt-2 text-[15px]', mockTitle)}>{lo ? 'ການກະທຳໃດສ້າງນິໄສໄດ້ໄວທີ່ສຸດ?' : 'Which action builds a habit fastest?'}</p>
      <div className="mt-3 space-y-2">
        {options.map((option, i) => (
          <div
            key={option}
            className={cn('flex items-center gap-2.5 rounded-xl border px-3 py-2 text-[13px] font-semibold', i === 0 ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-800 dark:border-emerald-400/60 dark:bg-emerald-400/10 dark:text-emerald-200' : 'border-slate-900/10 text-slate-600 dark:border-white/10 dark:text-slate-300')}
          >
            <span className={cn('grid h-5 w-5 flex-none place-items-center rounded-full text-[10px] font-black', i === 0 ? 'bg-emerald-500 text-white dark:bg-emerald-400 dark:text-[#06231a]' : 'border border-slate-900/20 dark:border-white/20')}>
              {i === 0 ? <Check className="h-3 w-3" strokeWidth={3} /> : 'ABC'[i]}
            </span>
            {option}
          </div>
        ))}
      </div>
    </div>
  )
}

export function ProgressMock({ lo }: { lo: boolean }) {
  const days = lo ? ['ຈ', 'ອ', 'ພ', 'ພ', 'ສ', 'ສ', 'ອ'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  return (
    <div className={mockShell}>
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className={mockLabel}>XP</p>
          <p className={cn('text-3xl tabular-nums leading-none', mockTitle)}>+20 <span className="text-sm text-orange-600 dark:text-amber-300">XP</span></p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2.5 py-1 text-[11px] font-black text-orange-700 dark:bg-orange-400/15 dark:text-orange-300"><Flame className="h-3.5 w-3.5" />{lo ? '5 ມື້ຕໍ່ເນື່ອງ' : '5-day streak'}</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10">
        <div className="h-full w-3/5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500" />
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {days.map((day, i) => (
          <div key={i} className="text-center">
            <span className={cn('grid aspect-square place-items-center rounded-full text-[11px] font-black', i < 5 ? 'bg-amber-400 text-[#1f1207]' : i === 5 ? 'border border-dashed border-orange-500/70 text-orange-700 dark:border-amber-300/70 dark:text-amber-200' : 'border border-slate-900/10 text-slate-400 dark:border-white/10 dark:text-slate-500')}>
              {i < 5 ? <Check className="h-3 w-3" strokeWidth={3} /> : ''}
            </span>
            <span className="mt-1 block text-[10px] font-bold text-slate-500">{day}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- Feature tiles ---------- */

export function CoachMock({ lo }: { lo: boolean }) {
  const mine = 'ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-amber-400 px-3.5 py-2 font-semibold text-[#1f1207]'
  const coach = 'max-w-[92%] rounded-2xl rounded-bl-md border border-slate-900/10 bg-orange-50/80 px-3.5 py-2.5 text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200'
  return (
    <div className="space-y-2.5 text-[13px] font-medium leading-6" aria-hidden>
      <div className={mine}>{lo ? 'ຈະກະກຽມສຳພາດທຶນການສຶກສາແນວໃດ?' : 'How do I prepare for a scholarship interview?'}</div>
      <div className={coach}>
        {lo
          ? 'ເລີ່ມຈາກ 3 ເລື່ອງສັ້ນໆ: ບັນຫາທີ່ທ່ານແກ້ໄດ້, ສິ່ງທີ່ທ່ານນຳພາ, ແລະ ເປັນຫຍັງໂຄງການນີ້ເໝາະກັບທ່ານ. ຢາກລອງຝຶກຄຳຖາມທຳອິດນຳກັນບໍ?'
          : 'Start with three short stories: a problem you solved, something you led, and why this program fits you. Want to practise the first question together?'}
      </div>
      <div className={mine}>{lo ? 'ໄດ້ເລີຍ, ມາເລີ່ມກັນ!' : "Yes, let's start!"}</div>
      <div className={coach}>
        {lo
          ? 'ຄຳຖາມທີ 1: ແນະນຳຕົວເອງພາຍໃນ 1 ນາທີ. ເລີ່ມຈາກສິ່ງທີ່ທ່ານກຳລັງຮຽນ ແລະ ເຫດຜົນທີ່ທ່ານເລືອກມັນ.'
          : 'Question 1: introduce yourself in one minute. Start with what you are studying and why you chose it.'}
      </div>
      <div className="flex w-fit items-center gap-1 rounded-full border border-slate-900/10 bg-orange-50/80 px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]">
        {[0, 1, 2].map(i => <span key={i} className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500 motion-reduce:animate-none dark:bg-amber-300" style={{ animationDelay: `${i * 180}ms` }} />)}
      </div>
    </div>
  )
}

export function ChallengeMock({ lo }: { lo: boolean }) {
  const rows = lo
    ? [['ຮຽນໃຫ້ຄົບ 3 ບົດ', true], ['ເຮັດແບບທົດສອບໃຫ້ຜ່ານ 1 ຄັ້ງ', true], ['ນຳແນວຄິດໜຶ່ງຢ່າງໄປໃຊ້ຈິງ', false]] as const
    : [['Finish 3 lessons', true], ['Pass one knowledge check', true], ['Use one idea in real life', false]] as const
  return (
    <div className="space-y-2" aria-hidden>
      {rows.map(([label, done]) => (
        <div key={label} className="flex items-center gap-2.5 text-[13px] font-semibold">
          <span className={cn('grid h-5 w-5 flex-none place-items-center rounded-md', done ? 'bg-emerald-500 text-white dark:bg-emerald-400 dark:text-[#06231a]' : 'border border-slate-900/20 dark:border-white/20')}>{done && <Check className="h-3 w-3" strokeWidth={3} />}</span>
          <span className={done ? 'text-slate-400 line-through decoration-slate-400/40 dark:text-slate-400 dark:decoration-white/20' : 'text-slate-900 dark:text-white'}>{label}</span>
        </div>
      ))}
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10"><div className="h-full w-2/3 rounded-full bg-emerald-500 dark:bg-emerald-400" /></div>
    </div>
  )
}

export function HabitMock({ lo }: { lo: boolean }) {
  const days = lo ? ['ຈ', 'ອ', 'ພ', 'ພ', 'ສ', 'ສ', 'ອ'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  return (
    <div className="grid grid-cols-7 gap-1.5" aria-hidden>
      {days.map((day, i) => (
        <div key={i} className="text-center">
          <span className={cn('grid aspect-square place-items-center rounded-full', [0, 1, 2, 4].includes(i) ? 'bg-rose-500 text-white dark:bg-rose-400 dark:text-[#2a0710]' : i === 3 ? 'border border-dashed border-rose-500/70 dark:border-rose-300/70' : 'border border-slate-900/10 dark:border-white/10')}>
            {[0, 1, 2, 4].includes(i) && <Check className="h-3 w-3" strokeWidth={3} />}
          </span>
          <span className="mt-1 block text-[10px] font-bold text-slate-500">{day}</span>
        </div>
      ))}
    </div>
  )
}

export function CareerMock({ lo }: { lo: boolean }) {
  const rows: Array<[string, string, string]> = [
    ['Software Engineer', 'Technology', lo ? 'ຕ້ອງການສູງ' : 'High demand'],
    ['Data Analyst', 'Technology', lo ? 'ຕ້ອງການສູງ' : 'High demand'],
    ['Registered Nurse', 'Healthcare', lo ? 'ຕ້ອງການສູງ' : 'High demand'],
  ]
  return (
    <div className="space-y-2" aria-hidden>
      {rows.map(([title, field, demand]) => (
        <div key={title} className={cn('flex items-center justify-between gap-3 rounded-xl px-3 py-2', rowSurface)}>
          <div className="min-w-0"><p className="truncate text-[13px] font-black text-slate-900 dark:text-white">{title}</p><p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{field}</p></div>
          <span className="flex-none rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-black text-cyan-800 dark:bg-cyan-400/15 dark:text-cyan-300">{demand}</span>
        </div>
      ))}
    </div>
  )
}

export function PlayMock({ lo }: { lo: boolean }) {
  const rows = [
    [Zap, 'Brain Sprint', 'text-amber-700 bg-amber-500/20 dark:text-amber-300 dark:bg-amber-300/15'],
    [Languages, lo ? 'ຈັບຄູ່ຄຳສັບ' : 'Word Match', 'text-emerald-700 bg-emerald-500/15 dark:text-emerald-300 dark:bg-emerald-300/15'],
    [MessagesSquare, lo ? 'ສະຖານະການກັບ AI' : 'AI Role-play Mission', 'text-violet-700 bg-violet-500/15 dark:text-violet-300 dark:bg-violet-300/15'],
  ] as const
  return (
    <div className="space-y-2" aria-hidden>
      {rows.map(([Icon, label, tone]) => (
        <div key={label} className={cn('flex items-center gap-3 rounded-xl px-3 py-2', rowSurface)}>
          <span className={cn('grid h-8 w-8 flex-none place-items-center rounded-lg', tone)}><Icon className="h-4 w-4" /></span>
          <span className="text-[13px] font-black text-slate-900 dark:text-white">{label}</span>
        </div>
      ))}
    </div>
  )
}

/** A turning wireframe cube with the "top corner" lit, echoing the Top Corner Lab. */
export function CubeMock() {
  const faces = ['rotateY(0deg)', 'rotateY(90deg)', 'rotateY(180deg)', 'rotateY(-90deg)', 'rotateX(90deg)', 'rotateX(-90deg)']
  return (
    <div aria-hidden className="grid h-36 place-items-center [perspective:700px]">
      <div className="relative h-24 w-24 animate-cube motion-reduce:animate-none [transform-style:preserve-3d]">
        {faces.map(face => (
          <div key={face} className="absolute inset-0 border border-slate-900/25 bg-slate-900/[0.03] dark:border-white/25 dark:bg-white/[0.025]" style={{ transform: `${face} translateZ(48px)` }} />
        ))}
        <span className="absolute left-1/2 top-1/2 -ml-12 -mt-px h-0.5 w-24 bg-[#ff7a6b]" style={{ transform: 'translate3d(0, 48px, 48px)' }} />
        <span className="absolute left-1/2 top-1/2 -mt-12 -ml-px h-24 w-0.5 bg-[#4fd1c5]" style={{ transform: 'translate3d(-48px, 0, 48px)' }} />
        <span className="absolute left-1/2 top-1/2 -ml-12 -mt-px h-0.5 w-24 bg-[#ffc857]" style={{ transform: 'translate3d(-48px, 48px, 0) rotateY(90deg)' }} />
        <span className="absolute left-1/2 top-1/2 -ml-1.5 -mt-1.5 h-3 w-3 rounded-full bg-orange-500 shadow-[0_0_18px_6px_rgba(247,147,26,0.6)] dark:bg-amber-300 dark:shadow-[0_0_18px_6px_rgba(251,191,36,0.7)]" style={{ transform: 'translate3d(48px, -48px, 48px)' }} />
      </div>
    </div>
  )
}
