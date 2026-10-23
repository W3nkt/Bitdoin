import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export type FlipBookPage = {
  key: string
  pageNumber?: number
  content: ReactNode
  paper?: 'cover' | 'sheet'
}

interface FlipBookProps {
  pages: FlipBookPage[]
  totalPages: number
  index: number
  onNavigate: (index: number) => void
}

type FlipState = { dir: 1 | -1; from: number; to: number }

// A page turn is one paper leaf hinged on the left spine (PageLeaf below). Going forward the leaf is the page being
// left: it lifts, bends and swings over the spine while the next page is revealed under it. Going back the leaf is the
// previous page: it swings in from the left and settles on top of the current one. A long jump (contents) is one turn too.
export function FlipBook({ pages, totalPages, index, onNavigate }: FlipBookProps) {
  const [flip, setFlip] = useState<FlipState | null>(null)
  const total = pages.length

  const goTo = useCallback((to: number) => {
    if (flip || to === index || to < 0 || to >= total) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onNavigate(to)
      return
    }
    setFlip({ dir: to > index ? 1 : -1, from: index, to })
  }, [flip, index, total, onNavigate])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') goTo(index + 1)
      if (e.key === 'ArrowLeft') goTo(index - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goTo, index])

  function handleFlipEnd() {
    if (!flip) return
    onNavigate(flip.to)
    setFlip(null)
  }

  const touchStart = useRef<{ x: number; y: number } | null>(null)
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
  }
  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStart.current
    touchStart.current = null
    if (!start) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.4) return
    goTo(dx < 0 ? index + 1 : index - 1)
  }

  // Under the leaf: the page being revealed (forward) or the page about to be covered (back).
  const resting = pages[flip ? (flip.dir === 1 ? flip.to : flip.from) : index]

  return (
    <div className="mx-auto" style={{ width: 'min(92vw, 460px)' }}>
      <div className="relative flex items-center justify-center">
        <NavEdge dir="prev" onClick={() => goTo(index - 1)} disabled={index === 0 || !!flip} />
        <div
          data-reader-book
          className="relative touch-pan-y select-none"
          style={{ width: '100%', height: 'min(70vh, 600px)', perspective: '2200px' }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <PageFace page={resting} />
          {flip && (
            <PageLeaf
              page={pages[flip.dir === 1 ? flip.from : flip.to]}
              forward={flip.dir === 1}
              onDone={handleFlipEnd}
            />
          )}
        </div>
        <NavEdge dir="next" onClick={() => goTo(index + 1)} disabled={index === total - 1 || !!flip} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 px-1 sm:hidden">
        <NavButton dir="prev" onClick={() => goTo(index - 1)} disabled={index === 0 || !!flip} />
        <PageCounter page={pages[index]} totalPages={totalPages} />
        <NavButton dir="next" onClick={() => goTo(index + 1)} disabled={index === total - 1 || !!flip} />
      </div>
      <div className="mt-4 hidden justify-center sm:flex">
        <PageCounter page={pages[index]} totalPages={totalPages} />
      </div>
    </div>
  )
}

function PageFace({ page }: { page?: FlipBookPage }) {
  if (!page) return null
  return (
    <div
      className={cn(
        'absolute inset-0 overflow-hidden rounded-[1.25rem] shadow-book',
        page.paper === 'cover' ? 'bg-primary-950' : 'bg-[#fffdf8] dark:bg-gray-900 ring-1 ring-black/5 dark:ring-white/10',
      )}
    >
      {page.content}
      {page.pageNumber != null && (
        <span className="pointer-events-none absolute bottom-3 right-5 text-[11px] font-bold text-slate-400">
          {page.pageNumber}
        </span>
      )}
      {page.paper !== 'cover' && <div className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/10 to-transparent" />}
    </div>
  )
}

// ── The turning leaf ────────────────────────────────────────────────────────────────────────────────────────────────
// The leaf is SLICES thin vertical strips nested one inside the next, so each strip can bend a little against the one
// before it and the paper curls instead of swinging stiffly. Every strip shows its own window onto the page (front) and
// plain paper (back), and is shaded by how far it has turned away from the light. Each frame sets only the strips'
// rotations and a few shadow opacities directly on the elements, so React does not re-render during the turn.
const SLICES = 14
const TURN_MS = 900
const BEND_PER_SLICE = 4.4 // degrees the strips lag behind each other at the most curled moment

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const rad = (deg: number) => (deg * Math.PI) / 180

/** How far the spine has turned: 0 = flat on the page, 180 = flat on the left. Curl lags most while it is in the air. */
function leafPose(turn: number) {
  const curl = Math.sin(rad(turn)) * (1.1 - turn / 180)
  const lag = BEND_PER_SLICE * curl
  const angles: number[] = []
  let reach = 0
  for (let i = 0; i < SLICES; i++) {
    const angle = turn - i * lag
    angles.push(angle)
    reach += Math.cos(rad(angle)) / SLICES
  }
  return { lag, angles, reach }
}

type LeafRefs = {
  leaf: HTMLElement | null
  slices: (HTMLElement | null)[]
  front: (HTMLElement | null)[]
  back: (HTMLElement | null)[]
  cast: HTMLElement | null
  gutter: HTMLElement | null
}

function Slice({ index, page, refs }: { index: number; page: FlipBookPage; refs: LeafRefs }) {
  return (
    <div
      ref={el => { refs.slices[index] = el }}
      className="fb-slice"
      style={index === 0 ? { left: 0, width: `${100 / SLICES}%` } : { left: '100%', width: '100%' }}
    >
      <div className="fb-face fb-front">
        <div style={{ position: 'absolute', top: 0, height: '100%', left: `${-index * 100}%`, width: `${SLICES * 100}%` }}>
          <PageFace page={page} />
        </div>
        <div ref={el => { refs.front[index] = el }} className="fb-shade" />
      </div>
      <div className="fb-face fb-back">
        <div className="fb-verso" />
        <div ref={el => { refs.back[index] = el }} className="fb-shade" />
      </div>
      {index < SLICES - 1 && <Slice index={index + 1} page={page} refs={refs} />}
    </div>
  )
}

function PageLeaf({ page, forward, onDone }: { page: FlipBookPage; forward: boolean; onDone: () => void }) {
  const refs = useRef<LeafRefs>({ leaf: null, slices: [], front: [], back: [], cast: null, gutter: null })
  const done = useRef(onDone)
  done.current = onDone

  useLayoutEffect(() => {
    const r = refs.current

    function apply(turn: number) {
      const { lag, angles, reach } = leafPose(turn)
      r.slices.forEach((el, i) => {
        if (el) el.style.transform = i === 0 ? `rotateY(${-turn}deg)` : `rotateY(${lag}deg)`
      })
      angles.forEach((angle, i) => {
        const c = Math.cos(rad(angle))
        // Facing us, a strip darkens as it turns edge-on; seen from behind it brightens again as it lies flat.
        const front = r.front[i]
        const back = r.back[i]
        if (front) front.style.opacity = angle < 90 ? String(0.5 * (1 - c)) : '0'
        if (back) back.style.opacity = angle >= 90 ? String(0.42 * (1 + c)) : '0'
      })
      // The leaf fades in over the last stretch of its swing to the left, so it never pops in or out.
      if (r.leaf) r.leaf.style.opacity = turn > 164 ? String(Math.max(0, (180 - turn) / 16)) : '1'
      // Shadow the leaf throws on the page under it, just past its free edge, and a soft gutter by the spine.
      if (r.cast) {
        const edge = Math.max(0, reach)
        r.cast.style.left = `${edge * 100}%`
        r.cast.style.opacity = reach > 0 ? String(Math.min(1, reach * 2.5) * Math.min(1, (180 - turn) / 60)) : '0'
      }
      if (r.gutter) r.gutter.style.opacity = String(Math.sin(rad(turn)) * 0.6)
    }

    const from = forward ? 0 : 180
    const to = forward ? 180 : 0
    apply(from)
    const start = performance.now()
    let frame = 0
    function tick() {
      const t = Math.min(1, (performance.now() - start) / TURN_MS)
      apply(from + (to - from) * easeInOut(t))
      if (t < 1) frame = requestAnimationFrame(tick)
      else done.current()
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [forward])

  return (
    <>
      <div className="fb-shadows" aria-hidden="true">
        <div ref={el => { refs.current.gutter = el }} className="fb-gutter" />
        <div ref={el => { refs.current.cast = el }} className="fb-cast" />
      </div>
      <div ref={el => { refs.current.leaf = el }} className="fb-leaf" data-paper={page.paper ?? 'sheet'} aria-hidden="true">
        <Slice index={0} page={page} refs={refs.current} />
      </div>
    </>
  )
}

function PageCounter({ page, totalPages }: { page?: FlipBookPage; totalPages: number }) {
  if (!page?.pageNumber) return <span className="text-xs font-bold text-slate-400">&nbsp;</span>
  return <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{page.pageNumber} / {totalPages}</span>
}

function NavButton({ dir, onClick, disabled }: { dir: 'prev' | 'next'; onClick: () => void; disabled: boolean }) {
  const Icon = dir === 'prev' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'prev' ? 'Previous page' : 'Next page'}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white dark:bg-gray-900 text-slate-700 dark:text-slate-200 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 transition active:scale-95 disabled:opacity-30"
    >
      <Icon className="h-5 w-5" />
    </button>
  )
}

function NavEdge({ dir, onClick, disabled }: { dir: 'prev' | 'next'; onClick: () => void; disabled: boolean }) {
  const Icon = dir === 'prev' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'prev' ? 'Previous page' : 'Next page'}
      className="absolute top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/90 dark:bg-gray-900/90 text-slate-700 dark:text-slate-200 shadow-md ring-1 ring-slate-200 dark:ring-slate-700 backdrop-blur transition hover:bg-white dark:hover:bg-gray-900 active:scale-95 disabled:opacity-0 sm:grid"
      style={dir === 'prev' ? { right: 'calc(100% + 14px)' } : { left: 'calc(100% + 14px)' }}
    >
      <Icon className="h-5 w-5" />
    </button>
  )
}
