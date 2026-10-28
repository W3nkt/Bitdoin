import { useId, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDownRight, ArrowUpRight, Atom, BookA, BookOpen, Calculator, Dna, Earth, FlaskConical, Info, Landmark, Languages, Minus,
  Music, Palette, Dumbbell, Monitor, SignalHigh, SignalLow, SignalMedium, type LucideIcon,
} from 'lucide-react'
import { useAcademicCopy } from '@/lib/academic/copy'
import { cn } from '@/lib/utils'

// Shared Schooling visuals: one icon and colour per subject, emoji for score
// levels and ratings, coloured direction chips and icon tiles. Colour is never
// the only signal: every face, chip and tile also has text or an aria-label.

type SubjectVisual = { icon: LucideIcon; color: string }

const SUBJECTS: Record<string, SubjectVisual> = {
  MATH: { icon: Calculator, color: '#2563eb' },
  PHYS: { icon: Atom, color: '#7c3aed' },
  CHEM: { icon: FlaskConical, color: '#0891b2' },
  BIO: { icon: Dna, color: '#16a34a' },
  LAO: { icon: BookA, color: '#dc2626' },
  ENG: { icon: Languages, color: '#db2777' },
  HIST: { icon: Landmark, color: '#b45309' },
  GEO: { icon: Earth, color: '#0d9488' },
  ART: { icon: Palette, color: '#c026d3' },
  MUS: { icon: Music, color: '#9333ea' },
  PE: { icon: Dumbbell, color: '#ea580c' },
  ICT: { icon: Monitor, color: '#4f46e5' },
}
// Planner goals and tasks carry only names, so English names also find their subject.
const NAME_HINTS: [RegExp, string][] = [
  [/math/i, 'MATH'], [/physic(?!al)/i, 'PHYS'], [/chem/i, 'CHEM'], [/bio/i, 'BIO'], [/^lao/i, 'LAO'], [/english/i, 'ENG'],
  [/histor/i, 'HIST'], [/geograph/i, 'GEO'], [/\bart/i, 'ART'], [/music/i, 'MUS'], [/physical|sport/i, 'PE'], [/ict|computer/i, 'ICT'],
]
const FALLBACK = ['#2563eb', '#7c3aed', '#0891b2', '#16a34a', '#db2777', '#b45309', '#0d9488', '#4f46e5']

/** Icon and colour for a subject code; unknown codes get a stable colour from the name. */
export function subjectVisual(code: string | null | undefined, name = ''): SubjectVisual {
  const key = (code ?? '').toUpperCase()
  const known = SUBJECTS[key] ?? Object.entries(SUBJECTS).find(([prefix]) => key && key.startsWith(prefix))?.[1]
    ?? (!key ? SUBJECTS[NAME_HINTS.find(([pattern]) => pattern.test(name))?.[1] ?? ''] : undefined)
  if (known) return known
  let hash = 0
  for (const char of key || name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return { icon: BookOpen, color: FALLBACK[hash % FALLBACK.length] }
}

/** The subject's bare icon, for chips and inline text. */
export function SubjectIcon({ code, name, className }: { code: string | null | undefined; name?: string; className?: string }) {
  const { icon: Icon } = subjectVisual(code, name)
  return <Icon aria-hidden className={cn('h-4 w-4 shrink-0', className)} />
}

/** Tinted square with the subject's icon. */
export function SubjectBadge({ code, name, size = 'md' }: { code: string | null | undefined; name?: string; size?: 'sm' | 'md' | 'lg' }) {
  const { icon: Icon, color } = subjectVisual(code, name)
  return (
    <span aria-hidden className={cn('grid shrink-0 place-items-center rounded-2xl',
      size === 'sm' ? 'h-8 w-8 rounded-xl' : size === 'lg' ? 'h-14 w-14' : 'h-10 w-10')}
      style={{ color, backgroundColor: `${color}1f` }}>
      <Icon className={size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-7 w-7' : 'h-5 w-5'} />
    </span>
  )
}

// ─── Score levels ────────────────────────────────────────────────────────────

type Scale = { min: number | null; max: number | null }

// Encouraging at every level (NOTIF-004): the lowest band says "keep going".
const LEVELS = [
  { below: 0.5, emoji: '💪', tone: 'bg-amber-100 text-amber-900 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-500/30' },
  { below: 0.65, emoji: '🙂', tone: 'bg-sky-100 text-sky-900 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-200 dark:ring-sky-500/30' },
  { below: 0.8, emoji: '😄', tone: 'bg-emerald-100 text-emerald-900 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-500/30' },
  { below: Infinity, emoji: '🤩', tone: 'bg-violet-100 text-violet-900 ring-violet-200 dark:bg-violet-500/15 dark:text-violet-200 dark:ring-violet-500/30' },
] as const

export function scoreLevel(value: number | string | null | undefined, scale: Scale) {
  if (value === null || value === undefined || value === '' || scale.max === null) return null
  const min = scale.min ?? 0
  const share = (Number(value) - min) / ((scale.max - min) || 1)
  return LEVELS.find(level => share < level.below)!
}

/** A score in a coloured pill with its level's emoji. */
export function ScorePill({ value, scale, label, size = 'md' }: { value: number | string | null; scale: Scale; label: string; size?: 'md' | 'lg' }) {
  const level = scoreLevel(value, scale)
  if (!level) return <span className="text-lg font-black">{label}</span>
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full font-black tabular-nums ring-1', level.tone,
      size === 'lg' ? 'px-4 py-2 text-2xl' : 'px-2.5 py-1 text-base')}>
      <span aria-hidden className={size === 'lg' ? 'text-2xl' : 'text-sm'}>{level.emoji}</span>{label}
    </span>
  )
}

/** The big face beside the headline average. */
export function ScoreFace({ value, scale }: { value: number | string | null; scale: Scale }) {
  const level = scoreLevel(value, scale)
  if (!level) return null
  return <span aria-hidden className={cn('grid h-16 w-16 shrink-0 place-items-center rounded-3xl text-4xl ring-1', level.tone)}>{level.emoji}</span>
}

// ─── Topic mastery (quizzes, mock exams) ─────────────────────────────────────

export const MASTERY = {
  secure: { emoji: '🌟', tone: 'bg-emerald-100 text-emerald-900 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-100 dark:ring-emerald-500/30' },
  developing: { emoji: '🌿', tone: 'bg-sky-100 text-sky-900 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-100 dark:ring-sky-500/30' },
  needs_practice: { emoji: '💪', tone: 'bg-amber-100 text-amber-900 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-100 dark:ring-amber-500/30' },
  not_enough: { emoji: '❔', tone: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700' },
} as const

/** Encouraging emoji for a right/total result: 🌟 most, 👍 half or more, 💪 otherwise. */
export function resultEmoji(correct: number, total: number) {
  const share = total ? correct / total : 0
  return share >= 0.8 ? '🌟' : share >= 0.5 ? '👍' : '💪'
}

/** A mastery band as a coloured pill: emoji plus the band's name. */
export function MasteryPill({ band, label }: { band: string; label: string }) {
  const visual = MASTERY[band as keyof typeof MASTERY] ?? MASTERY.not_enough
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black ring-1', visual.tone)}>
      <span aria-hidden>{visual.emoji}</span>{label}
    </span>
  )
}

/** Answer letter in a circle; green or rose once marked. Screen readers hear "B." before the answer. */
export function OptionLetter({ letter, state = 'idle' }: { letter: string; state?: 'idle' | 'selected' | 'right' | 'wrong' }) {
  return (
    <>
    <span className="sr-only">{letter}. </span>
    <span aria-hidden className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-black',
      state === 'selected' ? 'bg-indigo-600 text-white' : state === 'right' ? 'bg-emerald-600 text-white' : state === 'wrong' ? 'bg-rose-600 text-white'
        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200')}>
      {letter}
    </span>
    </>
  )
}

// ─── Careers ─────────────────────────────────────────────────────────────────

const CLUSTER_EMOJI: Record<string, string> = {
  technology: '💻', engineering: '⚙️', health: '🩺', business: '💼', creative: '🎨', environment_agriculture: '🌾',
  education: '🍎', law_public: '⚖️', tourism_hospitality: '🏨',
}
export const clusterEmoji = (cluster: string) => CLUSTER_EMOJI[cluster] ?? '🧭'

const AREA_EMOJI: Record<string, string> = { R: '🔧', I: '🔬', A: '🎨', S: '🤝', E: '🚀', C: '🗂️' }
export const areaEmoji = (area: string) => AREA_EMOJI[area] ?? '⭐'

/** 3, 2, 1 or 0 filled bars for an interest level; the word sits beside it. */
export function LevelBars({ level }: { level: string }) {
  const filled = level === 'high' ? 3 : level === 'medium' ? 2 : level === 'low' ? 1 : 0
  return (
    <span aria-hidden className="inline-flex items-end gap-0.5">
      {[1, 2, 3].map(bar => <span key={bar} className={cn('w-1.5 rounded-sm', bar === 1 ? 'h-2' : bar === 2 ? 'h-3' : 'h-4', bar <= filled ? 'bg-rose-500' : 'bg-slate-200 dark:bg-slate-700')} />)}
    </span>
  )
}

// ─── Direction ───────────────────────────────────────────────────────────────

const DIRECTIONS = {
  up: { icon: ArrowUpRight, tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
  down: { icon: ArrowDownRight, tone: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  same: { icon: Minus, tone: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
} as const

export function directionVisual(direction: string) {
  return DIRECTIONS[direction as keyof typeof DIRECTIONS] ?? DIRECTIONS.same
}

/** Round coloured arrow; pass `label` when no text sits next to it. */
export function DirectionChip({ direction, label }: { direction: string; label?: string }) {
  const { icon: Icon, tone } = directionVisual(direction)
  return (
    <span role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}
      className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full', tone)}>
      <Icon className="h-4 w-4" />
    </span>
  )
}

// ─── Confidence ──────────────────────────────────────────────────────────────

const SIGNALS = { high: SignalHigh, medium: SignalMedium, low: SignalLow } as const

/** Signal bars plus the word, so the level never rests on the icon alone. */
export function ConfidenceBars({ confidence, label }: { confidence: 'high' | 'medium' | 'low'; label: string }) {
  const Icon = SIGNALS[confidence]
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
      <Icon aria-hidden className="h-3.5 w-3.5" />{label}
    </span>
  )
}

// ─── Ratings ─────────────────────────────────────────────────────────────────

export const RATING_FACES = [
  { emoji: '😞', tone: 'bg-rose-100 ring-rose-300 dark:bg-rose-500/20 dark:ring-rose-400/60' },
  { emoji: '🙁', tone: 'bg-orange-100 ring-orange-300 dark:bg-orange-500/20 dark:ring-orange-400/60' },
  { emoji: '😐', tone: 'bg-amber-100 ring-amber-300 dark:bg-amber-500/20 dark:ring-amber-400/60' },
  { emoji: '🙂', tone: 'bg-lime-100 ring-lime-300 dark:bg-lime-500/20 dark:ring-lime-400/60' },
  { emoji: '😍', tone: 'bg-emerald-100 ring-emerald-300 dark:bg-emerald-500/20 dark:ring-emerald-400/60' },
] as const

/** Five emoji faces as one radio-like group; the selected face grows and takes its colour. */
export function EmojiRating({ value, onChange, label, low, high }: {
  value: number | undefined
  onChange: (value: number) => void
  label: string
  low: string
  high: string
}) {
  return (
    <fieldset>
      <legend className="font-bold">{label}</legend>
      <div className="mt-2 flex gap-2">
        {RATING_FACES.map((face, index) => {
          const rating = index + 1
          const selected = value === rating
          return (
            <button key={rating} type="button" aria-pressed={selected}
              aria-label={`${rating} / 5${rating === 1 ? ` · ${low}` : rating === 5 ? ` · ${high}` : ''}`}
              onClick={() => onChange(rating)}
              className={cn('grid h-14 flex-1 place-items-center rounded-2xl text-3xl ring-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                selected ? cn(face.tone, 'scale-110 ring-2') : value ? 'bg-white opacity-50 grayscale ring-slate-200 hover:opacity-100 hover:grayscale-0 dark:bg-gray-900 dark:ring-slate-700'
                  : 'bg-white ring-slate-200 hover:scale-105 dark:bg-gray-900 dark:ring-slate-700')}>
              <span aria-hidden>{face.emoji}</span>
            </button>
          )
        })}
      </div>
      <div className="mt-1 flex justify-between text-xs text-slate-600 dark:text-slate-400"><span>{low}</span><span>{high}</span></div>
    </fieldset>
  )
}

// ─── Layout pieces ───────────────────────────────────────────────────────────

function InfoButton({ open, onToggle, controls, label }: { open: boolean; onToggle: () => void; controls: string; label: string }) {
  return (
    <button type="button" aria-expanded={open} aria-controls={controls} aria-label={label} title={label} onClick={onToggle}
      className="inline-grid h-8 w-8 shrink-0 place-items-center rounded-full align-middle text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100">
      <Info aria-hidden className="h-4 w-4" />
    </button>
  )
}

function InfoText({ id, text }: { id: string; text: ReactNode }) {
  return <span id={id} role="note" className="mt-2 block rounded-2xl bg-slate-50 p-3 text-xs font-medium leading-relaxed text-slate-700 dark:bg-gray-800/60 dark:text-slate-300">{text}</span>
}

/** An ⓘ button that opens the longer explanation in place, so cards can lead with icons. */
export function InfoTip({ text, label, className }: { text: ReactNode; label?: string; className?: string }) {
  const { t } = useAcademicCopy()
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <span className={cn('inline', className)}>
      <InfoButton open={open} onToggle={() => setOpen(value => !value)} controls={id} label={label ?? t('common.info')} />
      {open && <InfoText id={id} text={text} />}
    </span>
  )
}

/** Card heading: coloured icon chip, title, optional ⓘ for the explanation and a trailing slot. */
export function CardTitle({ icon: Icon, color, emoji, title, info, infoLabel, as: Heading = 'h2', id, children }: {
  icon?: LucideIcon
  color?: string
  emoji?: string
  title: ReactNode
  info?: ReactNode
  infoLabel?: string
  as?: 'h2' | 'h3'
  id?: string
  children?: ReactNode
}) {
  const { t } = useAcademicCopy()
  const tint = color ?? '#6366f1'
  const [open, setOpen] = useState(false)
  const noteId = useId()
  return (
    <div>
      <div className="flex items-center gap-3">
        {(Icon || emoji) && (
          <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-xl" style={{ color: tint, backgroundColor: `${tint}1f` }}>
            {emoji ?? (Icon && <Icon className="h-5 w-5" />)}
          </span>
        )}
        <Heading id={id} className={cn('min-w-0 flex-1 break-words font-black', Heading === 'h2' ? 'text-lg' : 'text-base')}>{title}</Heading>
        {info && <InfoButton open={open} onToggle={() => setOpen(value => !value)} controls={noteId} label={infoLabel ?? t('common.info')} />}
        {children}
      </div>
      {info && open && <InfoText id={noteId} text={info} />}
    </div>
  )
}

/** Square icon tile for the main actions: big tinted icon over a 1–2 word label. */
export function ActionTile({ to, icon: Icon, color, label, primary = false, state }: {
  to: string
  icon: LucideIcon
  color: string
  label: string
  primary?: boolean
  state?: unknown
}) {
  return (
    <Link to={to} state={state}
      className={cn('group flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-3xl p-3 text-center text-xs font-black leading-tight ring-1 transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 sm:text-sm',
        primary ? 'text-white ring-transparent shadow-lg' : 'bg-white text-slate-800 ring-slate-200 hover:shadow-md dark:bg-gray-900 dark:text-slate-100 dark:ring-slate-800')}
      style={primary ? { background: `linear-gradient(135deg, ${color}, ${color}cc)`, boxShadow: `0 12px 24px -14px ${color}` } : undefined}>
      <span aria-hidden className={cn('grid h-11 w-11 place-items-center rounded-2xl transition group-hover:scale-110', primary && 'bg-white/20')}
        style={primary ? undefined : { color, backgroundColor: `${color}1f` }}>
        <Icon className="h-6 w-6" />
      </span>
      <span className="break-words">{label}</span>
    </Link>
  )
}

/** Round emoji or icon in a soft circle, used for empty states and notices. */
export function EmojiBubble({ emoji, className }: { emoji: string; className?: string }) {
  return <span aria-hidden className={cn('mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-indigo-50 text-4xl dark:bg-indigo-500/15', className)}>{emoji}</span>
}
