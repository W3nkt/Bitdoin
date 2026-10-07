import { type CSSProperties, lazy, type MouseEvent, type PointerEvent, Suspense, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { BittyAvatar } from './BittyAvatar'
import './bitty.css'

// The panel (and its chat code) only loads once a customer opens Bitty.
const BittyChatPanel = lazy(() => import('./BittyChatPanel'))

const OPEN_KEY = 'bitty_open_v1'
const LIFT_KEY = 'bitty_lift_v1'
// Gap kept between the launcher and whatever it rests on.
const REST_GAP = 12
// Keeps the launcher below the sticky header when dragged to the top.
const HEADER_CLEARANCE = 72
// Pointer travel (px) before a press counts as a drag instead of a click.
const DRAG_THRESHOLD = 6
const SPARK_COLORS = ['#f97316', '#fb923c', '#3b5ff0', '#facc15', '#ce1126', '#6b8aff']

function readOpen() {
  try {
    return sessionStorage.getItem(OPEN_KEY) === '1'
  } catch {
    return false
  }
}

function writeOpen(open: boolean) {
  try {
    sessionStorage.setItem(OPEN_KEY, open ? '1' : '0')
  } catch {
    // Ignore blocked storage; the panel just won't reopen after navigation.
  }
}

function readLift() {
  try {
    const value = Number(localStorage.getItem(LIFT_KEY))
    return Number.isFinite(value) && value > 0 ? value : 0
  } catch {
    return 0
  }
}

function writeLift(lift: number) {
  try {
    localStorage.setItem(LIFT_KEY, String(Math.round(lift)))
  } catch {
    // Ignore blocked storage; the launcher just returns to its default spot.
  }
}

/**
 * Distance from the viewport bottom at which the launcher rests: just above
 * the highest visible [data-bitty-avoid] element (mobile tab bar, cart summary
 * bar, page footer once it scrolls into view), so it always sits at the
 * bottom of the content area instead of covering those.
 */
function measureRestingBottom() {
  const viewportHeight = window.innerHeight
  let covered = 0
  document.querySelectorAll<HTMLElement>('[data-bitty-avoid]').forEach(el => {
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    if (rect.top >= viewportHeight || rect.bottom <= 0) return
    covered = Math.max(covered, viewportHeight - rect.top)
  })
  return covered + (covered > 0 ? REST_GAP : window.innerWidth >= 768 ? 24 : 16)
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

type Phase = 'closed' | 'open' | 'closing'

/** Floating "Arlin" Bitdoin assistant. Rendered only by the Bookstore layout. */
export function BittyAssistant() {
  const { t } = useTranslation()
  // A panel restored after page navigation opens without the entrance effect.
  const [phase, setPhase] = useState<Phase>(() => (readOpen() ? 'open' : 'closed'))
  const [animateIn, setAnimateIn] = useState(false)
  const [launcherReturning, setLauncherReturning] = useState(false)
  const [burst, setBurst] = useState<{ id: number; x: number; y: number } | null>(null)
  const closingRef = useRef(false)

  // Launcher position: `restingBottom` follows the layout; `lift` is how far
  // the customer has dragged it up from there (remembered across visits).
  const launcherRef = useRef<HTMLButtonElement>(null)
  const [restingBottom, setRestingBottom] = useState(16)
  const [lift, setLift] = useState(readLift)
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef<{ pointerId: number; startY: number; startLift: number; moved: boolean } | null>(null)
  const suppressClickRef = useRef(false)

  useEffect(() => {
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setRestingBottom(measureRestingBottom()))
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    // Pages mount/unmount bottom bars (e.g. the cart summary) without scrolling.
    const observer = new MutationObserver(update)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      observer.disconnect()
    }
  }, [])

  function maxLift(bottom = restingBottom) {
    const height = launcherRef.current?.offsetHeight ?? 48
    return Math.max(0, window.innerHeight - bottom - height - HEADER_CLEARANCE)
  }

  const effectiveLift = Math.min(lift, maxLift())

  function handlePointerDown(e: PointerEvent<HTMLButtonElement>) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    dragRef.current = { pointerId: e.pointerId, startY: e.clientY, startLift: effectiveLift, moved: false }
  }

  function handlePointerMove(e: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    const dy = e.clientY - drag.startY
    if (!drag.moved) {
      if (Math.abs(dy) < DRAG_THRESHOLD) return
      drag.moved = true
      setDragging(true)
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    setLift(Math.min(Math.max(drag.startLift - dy, 0), maxLift()))
  }

  function handlePointerEnd(e: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    dragRef.current = null
    if (drag.moved) {
      // The click event that follows a drag must not open the panel.
      suppressClickRef.current = true
      setDragging(false)
      setLift(current => {
        writeLift(current)
        return current
      })
    }
  }

  function open(e: MouseEvent<HTMLButtonElement>) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    closingRef.current = false
    writeOpen(true)
    const motion = !prefersReducedMotion()
    if (motion) {
      const rect = e.currentTarget.getBoundingClientRect()
      setBurst({ id: Date.now(), x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
    }
    setAnimateIn(motion)
    setPhase('open')
  }

  function close() {
    writeOpen(false)
    if (prefersReducedMotion()) {
      setPhase('closed')
    } else {
      closingRef.current = true
      setPhase('closing')
      // Fallback in case animationend never fires (e.g. the tab is in the background).
      window.setTimeout(handleExited, 600)
    }
  }

  function handleExited() {
    if (!closingRef.current) return
    closingRef.current = false
    setPhase('closed')
    setLauncherReturning(true)
  }

  return (
    <>
      {phase !== 'closed' && (
        <Suspense fallback={null}>
          <BittyChatPanel
            animateIn={animateIn}
            closing={phase === 'closing'}
            onClose={close}
            onExited={handleExited}
          />
        </Suspense>
      )}

      {phase === 'closed' && (
        <button
          ref={launcherRef}
          type="button"
          onClick={open}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onAnimationEnd={e => { if (e.target === e.currentTarget) setLauncherReturning(false) }}
          aria-label={t('bitty.open')}
          title={t('bitty.name')}
          style={{ bottom: restingBottom + effectiveLift }}
          className={cn(
            'bitty-launcher fixed right-4 z-40 flex touch-none select-none items-center gap-2 rounded-full bg-primary-700 py-1.5 pl-1.5 pr-3 text-white shadow-lg transition-[transform,box-shadow,background-color] hover:-translate-y-0.5 hover:bg-primary-800 hover:shadow-xl sm:py-2 sm:pl-2 sm:pr-4 md:right-6',
            dragging ? 'cursor-grabbing scale-105 shadow-2xl' : 'cursor-pointer active:scale-95',
            launcherReturning && 'bitty-launcher-return',
          )}
        >
          <BittyAvatar className="bitty-launcher-avatar h-8 w-8 ring-2 ring-white/40 sm:h-10 sm:w-10" />
          <span className="text-xs font-semibold sm:text-sm">{t('bitty.name')}</span>
        </button>
      )}

      {burst && <BittyBurst key={burst.id} x={burst.x} y={burst.y} onDone={() => setBurst(null)} />}
    </>
  )
}

/** Rings and sparks bursting from the launcher as the panel opens. */
function BittyBurst({ x, y, onDone }: { x: number; y: number; onDone: () => void }) {
  return (
    <div className="pointer-events-none fixed z-[60]" style={{ left: x, top: y }} aria-hidden="true">
      <span className="bitty-burst-ring absolute -left-6 -top-6 h-12 w-12 rounded-full border-2 border-accent-400" />
      <span className="bitty-burst-ring absolute -left-6 -top-6 h-12 w-12 rounded-full border-2 border-primary-400" />
      {SPARK_COLORS.concat(SPARK_COLORS).map((color, i, all) => (
        <span
          key={i}
          className="bitty-spark absolute -left-1 -top-1 h-2 w-2 rounded-full"
          onAnimationEnd={i === all.length - 1 ? onDone : undefined}
          style={{
            backgroundColor: color,
            '--bitty-angle': `${(360 / all.length) * i}deg`,
            '--bitty-distance': `${i % 2 === 0 ? 86 : 62}px`,
          } as CSSProperties}
        />
      ))}
    </div>
  )
}
