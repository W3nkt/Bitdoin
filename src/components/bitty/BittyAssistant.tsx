import { type CSSProperties, lazy, type MouseEvent, Suspense, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { BittyAvatar } from './BittyAvatar'
import './bitty.css'

// The panel (and its chat code) only loads once a customer opens Bitty.
const BittyChatPanel = lazy(() => import('./BittyChatPanel'))

const OPEN_KEY = 'bitty_open_v1'
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

  function open(e: MouseEvent<HTMLButtonElement>) {
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
          type="button"
          onClick={open}
          onAnimationEnd={e => { if (e.target === e.currentTarget) setLauncherReturning(false) }}
          aria-label={t('bitty.open')}
          title={t('bitty.name')}
          className={cn(
            'bitty-launcher fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full bg-primary-700 py-1.5 pl-1.5 pr-3 text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-primary-800 hover:shadow-xl active:scale-95 sm:py-2 sm:pl-2 sm:pr-4 md:bottom-6 md:right-6',
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
