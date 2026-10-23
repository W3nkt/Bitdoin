import type { CSSProperties } from 'react'

// Flat illustrations for the Learning Hub cards (LearnHubView.tsx). They are drawn in white and a few warm accents so
// they read on any of the cards' gradients. `icon` is the category's icon key from the database; unknown keys get the book.

const GOLD = '#fcd34d'
const GOLD_DARK = '#f59e0b'

function Book() {
  return (
    <>
      <path d="M80 42C60 28 34 30 18 38v68c16-8 42-10 62 2z" fill="#fff" />
      <path d="M80 42c20-14 46-12 62-4v68c-16-8-42-10-62 2z" fill="#eef2ff" />
      <path d="M80 42v66" stroke="#c7d2fe" strokeWidth="2" />
      <g stroke="#c4b5fd" strokeWidth="3.4" strokeLinecap="round" fill="none">
        <path d="M32 56c14-4 29-3 40 3" /><path d="M32 70c14-4 29-3 40 3" /><path d="M32 84c10-3 20-3 28 1" />
        <path d="M92 59c11-6 26-7 40-3" /><path d="M92 73c11-6 26-7 40-3" />
      </g>
      <path d="M112 30v32l9-7 9 7V30z" fill="#f43f5e" />
    </>
  )
}

function Money() {
  const coin = (cx: number, cy: number) => (
    <g key={cy}>
      <rect x={cx - 30} y={cy} width="60" height="11" fill={GOLD_DARK} />
      <ellipse cx={cx} cy={cy + 11} rx="30" ry="10" fill={GOLD_DARK} />
      <ellipse cx={cx} cy={cy} rx="30" ry="10" fill={GOLD} />
      <ellipse cx={cx} cy={cy} rx="20" ry="6" fill="none" stroke={GOLD_DARK} strokeWidth="2" opacity=".6" />
    </g>
  )
  return (
    <>
      {[106, 94, 82].map(y => coin(50, y))}
      {[106, 94].map(y => coin(112, y))}
      <circle cx="104" cy="52" r="26" fill="#fde68a" stroke={GOLD_DARK} strokeWidth="4" />
      <text x="104" y="63" textAnchor="middle" fontSize="32" fontWeight="900" fill="#d97706" fontFamily="Inter, sans-serif">$</text>
      <path d="M22 62l16-14 10 8 18-22" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M56 32h10v10" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  )
}

function Chip() {
  return (
    <>
      <g stroke="#bfdbfe" strokeWidth="5" strokeLinecap="round">
        {[56, 72, 88, 104].map(v => <path key={v} d={`M${v} 34v10M${v} 108v10M34 ${v}h10M116 ${v}h10`} />)}
      </g>
      <rect x="44" y="44" width="72" height="72" rx="16" fill="#fff" />
      <rect x="58" y="58" width="44" height="44" rx="10" fill="#3b82f6" />
      <path d="M80 62c2 10 6 14 16 16-10 2-14 6-16 16-2-10-6-14-16-16 10-2 14-6 16-16z" fill="#fff" />
      <path d="M130 28c1 6 3 8 9 9-6 1-8 3-9 9-1-6-3-8-9-9 6-1 8-3 9-9z" fill={GOLD} />
      <path d="M26 100c1 5 2 6 7 7-5 1-6 2-7 7-1-5-2-6-7-7 5-1 6-2 7-7z" fill="#fff" opacity=".8" />
    </>
  )
}

function Speech() {
  return (
    <>
      <path d="M30 30h74a16 16 0 0 1 16 16v20a16 16 0 0 1-16 16H62l-20 16V82H30a16 16 0 0 1-16-16V46a16 16 0 0 1 16-16z" fill="#fff" />
      <text x="67" y="67" textAnchor="middle" fontSize="28" fontWeight="900" fill={GOLD_DARK} fontFamily="Inter, sans-serif">Hello!</text>
      <path d="M72 88h50a16 16 0 0 1 16 16v4a16 16 0 0 1-16 16h-8v14l-18-14H72a16 16 0 0 1-16-16v-4a16 16 0 0 1 16-16z" fill="#fff" opacity=".4" stroke="#fff" strokeWidth="3" />
      <text x="97" y="116" textAnchor="middle" fontSize="19" fontWeight="800" fill="#fff" fontFamily="'Noto Sans Lao', Inter, sans-serif">ສະບາຍດີ</text>
    </>
  )
}

function Timer() {
  return (
    <>
      <rect x="68" y="24" width="24" height="9" rx="4" fill="#fff" />
      <circle cx="80" cy="80" r="44" fill="#fff" />
      <circle cx="80" cy="80" r="36" fill="#ffe4e6" />
      <g stroke="#fb7185" strokeWidth="4" strokeLinecap="round">
        <path d="M80 52v6M80 102v6M52 80h6M102 80h6" />
      </g>
      <path d="M80 80V58" stroke="#be123c" strokeWidth="5" strokeLinecap="round" />
      <path d="M80 80l16 10" stroke="#fb7185" strokeWidth="5" strokeLinecap="round" />
      <circle cx="80" cy="80" r="5" fill="#be123c" />
      <circle cx="126" cy="38" r="19" fill="#22c55e" stroke="#fff" strokeWidth="4" />
      <path d="M117 38l6 6 11-12" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  )
}

function Briefcase() {
  return (
    <>
      <path d="M62 62V50a8 8 0 0 1 8-8h20a8 8 0 0 1 8 8v12" stroke="#fff" strokeWidth="7" fill="none" />
      <rect x="28" y="58" width="104" height="64" rx="12" fill="#fff" />
      <path d="M28 86h104" stroke="#a5f3fc" strokeWidth="6" />
      <rect x="70" y="78" width="20" height="18" rx="5" fill="#06b6d4" />
      <path d="M116 34l7 14 15 2-11 10 3 15-14-8-14 8 3-15-11-10 15-2z" fill={GOLD} transform="translate(-6 -8) scale(.8)" />
    </>
  )
}

function GradCap() {
  return (
    <>
      <path d="M44 78v24c0 11 72 11 72 0V78l-36 16z" fill="#c7d2fe" />
      <path d="M80 34l66 28-66 28-66-28z" fill="#fff" />
      <path d="M80 44l40 18-40 18-40-18z" fill="#e0e7ff" />
      <path d="M134 66v36" stroke={GOLD} strokeWidth="4" strokeLinecap="round" />
      <circle cx="134" cy="106" r="7" fill={GOLD} />
      <path d="M130 108l-3 12M138 108l3 12" stroke={GOLD} strokeWidth="3" strokeLinecap="round" />
    </>
  )
}

function Bulb() {
  return (
    <>
      <g stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".9">
        <path d="M80 14v12M40 28l8 9M120 28l-8 9M22 66h12M126 66h12" />
      </g>
      <circle cx="80" cy="66" r="34" fill="#fde047" />
      <circle cx="68" cy="54" r="10" fill="#fff" opacity=".45" />
      <path d="M62 96h36l-5 18H67z" fill="#e5e7eb" />
      <rect x="66" y="112" width="28" height="8" rx="4" fill="#9ca3af" />
      <path d="M70 66c4-8 6 8 10 0s6 8 10 0" stroke="#f59e0b" strokeWidth="3.5" strokeLinecap="round" fill="none" />
    </>
  )
}

function Compass() {
  return (
    <>
      <circle cx="80" cy="76" r="46" fill="#fff" />
      <circle cx="80" cy="76" r="38" fill="#e0f2fe" />
      <g stroke="#7dd3fc" strokeWidth="4" strokeLinecap="round">
        <path d="M80 42v6M80 104v6M46 76h6M108 76h6" />
      </g>
      <path d="M80 76l-12-8 24-18z" fill="#ef4444" />
      <path d="M80 76l12 8-24 18z" fill="#cbd5e1" />
      <circle cx="80" cy="76" r="5" fill="#0f172a" />
      <path d="M128 26c1 6 3 8 9 9-6 1-8 3-9 9-1-6-3-8-9-9 6-1 8-3 9-9z" fill={GOLD} />
    </>
  )
}

function Prompt() {
  return (
    <>
      <rect x="16" y="30" width="104" height="72" rx="18" fill="#fff" />
      <path d="M40 102v20l22-20z" fill="#fff" />
      <g stroke="#c4b5fd" strokeWidth="6" strokeLinecap="round">
        <path d="M36 52h56M36 68h40" />
      </g>
      <rect x="36" y="80" width="5" height="12" rx="2" fill="#8b5cf6" />
      <path d="M124 20c2 12 6 16 18 18-12 2-16 6-18 18-2-12-6-16-18-18 12-2 16-6 18-18z" fill={GOLD} />
      <path d="M138 76c1 6 3 8 9 9-6 1-8 3-9 9-1-6-3-8-9-9 6-1 8-3 9-9z" fill="#fff" opacity=".85" />
    </>
  )
}

const ART: Record<string, () => JSX.Element> = {
  'book-open': Book, wallet: Money, sparkles: Chip, languages: Speech, timer: Timer,
  briefcase: Briefcase, 'graduation-cap': GradCap, lightbulb: Bulb, compass: Compass, prompt: Prompt,
}

export function TopicArt({ icon, className, style }: { icon: string; className?: string; style?: CSSProperties }) {
  const Art = ART[icon] ?? Book
  return (
    <svg viewBox="0 0 160 140" className={className} style={style} aria-hidden="true" focusable="false">
      <ellipse cx="80" cy="128" rx="46" ry="6" fill="#000" opacity=".16" />
      <Art />
    </svg>
  )
}
