import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, LockKeyhole } from 'lucide-react'
import { useTheme } from '@/lib/theme'
import { openBookThen } from './openBook'
import './bookcloset.css'

export type ClosetBook = {
  id: string
  title: string
  author?: string | null
  coverUrl?: string | null
  /** Where the book opens. Omitted for a locked slot that is not a link. */
  href?: string
  state: 'open' | 'today' | 'done' | 'locked' | 'premium'
  /** 0..1, shown as a bar on the next locked slot. */
  progress?: number
}

type Labels = {
  title: string
  subtitle: string
  today: string
  locked: string
  next: string
  premium: string
  completed: string
}

// Slots per ledge row by cabinet width: 3 on phones, 4 on tablets, 5 on desktop.
function useColumns() {
  const [cols, setCols] = useState(() => columnsFor(typeof window === 'undefined' ? 1024 : window.innerWidth))
  useEffect(() => {
    const onResize = () => setCols(columnsFor(window.innerWidth))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return cols
}

function columnsFor(width: number) {
  return width < 520 ? 3 : width < 820 ? 4 : 5
}

// Set just before leaving the summary dialog, so the closet that appears next (a fresh page) doesn't replay its intro.
let returnedAt = 0
export function markReturningFromBook() { returnedAt = Date.now() }
const returningFromBook = () => Date.now() - returnedAt < 5000

type FlamePhase = 'off' | 'igniting' | 'on' | 'blowing'

// The candle follows the theme: dark lights it slowly, light blows it out with a gust. A page that opens already in
// one theme just shows that state.
function useFlamePhase(): FlamePhase {
  const dark = useTheme(state => state.theme) === 'dark'
  const [phase, setPhase] = useState<FlamePhase>(dark ? 'on' : 'off')
  const was = useRef(dark)
  useEffect(() => {
    if (was.current === dark) return
    was.current = dark
    setPhase(dark ? 'igniting' : 'blowing')
    const timer = window.setTimeout(() => setPhase(dark ? 'on' : 'off'), 3600)
    return () => window.clearTimeout(timer)
  }, [dark])
  return phase
}

function hueOf(text: string) {
  let hash = 0
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0
  return hash % 360
}

function Cover({ book }: { book: ClosetBook }) {
  const [failed, setFailed] = useState(false)
  return (
    <span className="bc-cover">
      {book.coverUrl && !failed ? (
        <img src={book.coverUrl} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span className="bc-fallback" style={{ '--hue': hueOf(book.title) } as CSSProperties}>
          <span className="bc-fallback-title">{book.title}</span>
          {book.author && <span className="bc-fallback-author">{book.author}</span>}
        </span>
      )}
    </span>
  )
}

function Candlestick({ phase }: { phase: FlamePhase }) {
  return (
    <svg className="bc-candle" viewBox="0 0 56 104" aria-hidden="true" data-flame={phase}>
      <defs>
        <linearGradient id="bc-brass" x1="0" x2="1">
          <stop offset="0" stopColor="#f6d58a" />
          <stop offset=".35" stopColor="#c8963e" />
          <stop offset=".7" stopColor="#8a5e1f" />
          <stop offset="1" stopColor="#e9c06a" />
        </linearGradient>
        <linearGradient id="bc-wax" x1="0" x2="1">
          <stop offset="0" stopColor="#fff6df" />
          <stop offset=".6" stopColor="#f0dcb0" />
          <stop offset="1" stopColor="#cfb787" />
        </linearGradient>
        <radialGradient id="bc-fire" cx=".5" cy=".7" r=".6">
          <stop offset="0" stopColor="#fff7c8" />
          <stop offset=".45" stopColor="#ffc046" />
          <stop offset="1" stopColor="#ff7a18" />
        </radialGradient>
      </defs>
      <g className="bc-flame-g">
        <g className="bc-flame-sway">
          <path d="M28 3c6 10 10 16 10 24 0 6-4.5 10-10 10s-10-4-10-10c0-8 6-14 10-24z" fill="url(#bc-fire)" />
          <path d="M28 17c3 5 5 8 5 12 0 3-2.2 5-5 5s-5-2-5-5c0-4 2-7 5-12z" fill="#fffbe0" opacity=".95" />
        </g>
      </g>
      <rect x="27" y="36" width="2" height="7" rx="1" fill="#2a1a0c" />
      <circle className="bc-ember" cx="28" cy="37" r="1.7" fill="#ff7b2e" />
      <path className="bc-smoke" d="M28 36C24 28 33 22 29 13C26 6 31 1 30 -8" pathLength="40" strokeDasharray="40" fill="none" stroke="#ebebeb" strokeWidth="1.8" strokeLinecap="round" />
      <path className="bc-smoke bc-smoke-2" d="M28 36C32 29 25 22 28 14C30 8 26 3 28 -4" pathLength="40" strokeDasharray="40" fill="none" stroke="#ebebeb" strokeWidth="1.2" strokeLinecap="round" />
      <rect x="21" y="42" width="14" height="35" rx="2" fill="url(#bc-wax)" />
      <path d="M21 42h14v3c-2 2-3 5-3 7 0 3-2 3-2 0 0-3-1-4-3-4-2 0-3 2-4 4z" fill="#fffaf0" opacity=".85" />
      <path d="M13 76h30l-4 7H17z" fill="url(#bc-brass)" />
      <rect x="25" y="83" width="6" height="10" fill="url(#bc-brass)" />
      <ellipse cx="28" cy="87" rx="7" ry="3" fill="url(#bc-brass)" />
      <path d="M10 104c0-8 8-12 18-12s18 4 18 12z" fill="url(#bc-brass)" />
    </svg>
  )
}

function Slot({ book, index, labels, intro, away }: { book?: ClosetBook; index: number; labels: Labels; intro: boolean; away: boolean }) {
  const navigate = useNavigate()
  const style = { '--i': index } as CSSProperties
  if (!book) {
    return (
      <div className="bc-slot" aria-hidden="true">
        <div className="bc-bookwrap" />
        <div className="bc-ledge" />
      </div>
    )
  }

  if (book.state === 'locked' || book.state === 'premium') {
    const premium = book.state === 'premium'
    const label = premium ? labels.premium : typeof book.progress === 'number' ? labels.next : labels.locked
    const ghost = (
      <>
        <LockKeyhole className="bc-lock h-5 w-5" aria-hidden="true" />
        {typeof book.progress === 'number' && (
          <span className="bc-bar" aria-hidden="true"><i style={{ width: `${Math.round(book.progress * 100)}%` }} /></span>
        )}
      </>
    )
    return (
      <div className="bc-slot" style={style}>
        <div className={intro ? 'bc-bookwrap bc-book-in' : 'bc-bookwrap'} data-away={away}>
          {book.href ? (
            <Link to={book.href} className="bc-ghost" aria-label={label} title={label}>{ghost}</Link>
          ) : (
            <div className="bc-ghost" role="img" aria-label={label} data-dim={typeof book.progress !== 'number'}>{ghost}</div>
          )}
        </div>
        <div className="bc-ledge" />
      </div>
    )
  }

  const aria = [book.title, book.state === 'today' ? labels.today : '', book.state === 'done' ? labels.completed : ''].filter(Boolean).join(', ')
  return (
    <div className="bc-slot" style={style}>
      <div className={intro ? 'bc-bookwrap bc-book-in' : 'bc-bookwrap'} data-away={away}>
        <Link
          to={book.href ?? '#'}
          className="bc-book"
          data-book-id={book.id}
          aria-label={aria}
          title={book.title}
          onClick={event => {
            // Plain clicks open the book with the flight; new-tab and other modified clicks keep the browser's behaviour.
            if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !book.href) return
            event.preventDefault()
            void openBookThen(event.currentTarget, () => navigate(book.href!, { state: { fromCloset: true } }))
          }}
        >
          <Cover book={book} />
          {book.state === 'today' && <span className="bc-today">{labels.today}</span>}
          {book.state === 'done' && <span className="bc-done" aria-hidden="true"><Check className="h-3.5 w-3.5" strokeWidth={3.5} /></span>}
        </Link>
      </div>
      <div className="bc-ledge" />
    </div>
  )
}

function Wind({ on }: { on: boolean }) {
  return (
    <svg className="bc-wind" viewBox="0 0 96 56" aria-hidden="true" data-on={on}>
      <g fill="none" stroke="#f6f1e7" strokeWidth="2" strokeLinecap="round">
        <path d="M2 14C20 6 36 22 60 12S84 10 92 14" />
        <path d="M8 28C28 20 46 36 70 26S90 26 94 28" />
        <path d="M0 42C18 36 34 48 56 40" />
      </g>
    </svg>
  )
}

/**
 * `quiet`: no intro animation (the closet sits behind the summary dialog). `awayId`: the book that is out in the dialog;
 * its slot stays empty until it is put back.
 */
export function BookCloset({ books, loading, labels, quiet, awayId }: { books: ClosetBook[]; loading?: boolean; labels: Labels; quiet?: boolean; awayId?: string }) {
  const cols = useColumns()
  const [intro] = useState(() => !quiet && !returningFromBook())
  const flame = useFlamePhase()
  const items: (ClosetBook | undefined)[] = loading ? [] : [...books]
  // Always finish the last ledge row, and keep at least two rows so the cabinet never looks bare.
  const rowCount = Math.max(2, Math.ceil(items.length / cols))
  while (items.length < rowCount * cols) items.push(undefined)
  const rows = Array.from({ length: rowCount }, (_, row) => items.slice(row * cols, row * cols + cols))

  return (
    <section className="bc" aria-label={labels.title} data-intro={intro}>
      <div className="bc-frame">
        <div className="bc-mantel">
          <div className="bc-plaque">
            <span className="bc-plaque-title">{labels.title}</span>
            <span className="bc-plaque-sub">{labels.subtitle}</span>
          </div>
          <Wind on={flame === 'blowing'} />
          <Candlestick phase={flame} />
        </div>

        <div className="bc-wall">
          <div className="bc-rows" style={{ '--cols': cols } as CSSProperties}>
            {rows.map((row, r) => (
              <div className="bc-row" key={r}>
                {row.map((book, c) => loading ? (
                  <div className="bc-slot" key={c} aria-hidden="true">
                    <div className="bc-bookwrap"><span className="bc-shimmer" /></div>
                    <div className="bc-ledge" />
                  </div>
                ) : (
                  <Slot key={book?.id ?? `empty-${r}-${c}`} book={book} index={r * cols + c} labels={labels} intro={intro} away={Boolean(book && book.id === awayId)} />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Lighting sits over the whole cabinet and never takes clicks. */}
        <div className="bc-day" aria-hidden="true">
          <span className="bc-lightbar" />
        </div>
        <div className="bc-night" aria-hidden="true">
          <span className="bc-dusk" />
          <span className="bc-glow" />
        </div>
      </div>
    </section>
  )
}
