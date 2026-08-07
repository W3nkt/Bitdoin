import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
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

type FlipState = { dir: 1 | -1; from: number; to: number; phase: 'start' | 'go' }

// Single flip layer with two backface-hidden faces (leaving page in front,
// destination page mirrored on the back) rotated around the left spine —
// avoids animating through every intermediate page on long jumps, which
// reads fine as a single "turn" even for a table-of-contents jump.
export function FlipBook({ pages, totalPages, index, onNavigate }: FlipBookProps) {
  const [flip, setFlip] = useState<FlipState | null>(null)
  const total = pages.length

  const goTo = useCallback((to: number) => {
    if (flip || to === index || to < 0 || to >= total) return
    setFlip({ dir: to > index ? 1 : -1, from: index, to, phase: 'start' })
  }, [flip, index, total])

  useEffect(() => {
    if (flip?.phase !== 'start') return
    const id = requestAnimationFrame(() => setFlip(f => (f ? { ...f, phase: 'go' } : f)))
    return () => cancelAnimationFrame(id)
  }, [flip?.phase])

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

  const resting = pages[flip ? flip.to : index]
  const angle = flip ? (flip.phase === 'go' ? (flip.dir === 1 ? -179.9 : 179.9) : 0) : 0

  return (
    <div className="mx-auto" style={{ width: 'min(92vw, 460px)' }}>
      <div className="relative flex items-center justify-center">
        <NavEdge dir="prev" onClick={() => goTo(index - 1)} disabled={index === 0 || !!flip} />
        <div
          className="relative touch-pan-y select-none"
          style={{ width: '100%', height: 'min(70vh, 600px)', perspective: '2400px' }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <PageFace page={resting} />
          {flip && (
            <div
              className="absolute inset-0"
              style={{
                transformStyle: 'preserve-3d',
                transformOrigin: '0% 50%',
                transform: `rotateY(${angle}deg)`,
                transition: flip.phase === 'go' ? 'transform 520ms cubic-bezier(.4,.05,.2,1)' : 'none',
              }}
              onTransitionEnd={handleFlipEnd}
            >
              <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>
                <PageFace page={pages[flip.from]} />
                <div
                  className="pointer-events-none absolute inset-0 rounded-[1.25rem] transition-opacity"
                  style={{ background: 'linear-gradient(90deg, rgba(15,23,42,0.28), transparent 45%)', opacity: flip.phase === 'go' ? 1 : 0 }}
                />
              </div>
              <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                <PageFace page={pages[flip.to]} />
                <div
                  className="pointer-events-none absolute inset-0 rounded-[1.25rem] transition-opacity"
                  style={{ background: 'linear-gradient(270deg, rgba(15,23,42,0.28), transparent 45%)', opacity: flip.phase === 'go' ? 1 : 0 }}
                />
              </div>
            </div>
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
        page.paper === 'cover' ? 'bg-primary-950' : 'bg-[#fffdf8] ring-1 ring-black/5',
      )}
    >
      {page.content}
      {page.pageNumber != null && (
        <span className="pointer-events-none absolute bottom-3 right-5 text-[11px] font-bold text-slate-400">
          {page.pageNumber}
        </span>
      )}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/10 to-transparent" />
    </div>
  )
}

function PageCounter({ page, totalPages }: { page?: FlipBookPage; totalPages: number }) {
  if (!page?.pageNumber) return <span className="text-xs font-bold text-slate-400">&nbsp;</span>
  return <span className="text-xs font-bold text-slate-500">{page.pageNumber} / {totalPages}</span>
}

function NavButton({ dir, onClick, disabled }: { dir: 'prev' | 'next'; onClick: () => void; disabled: boolean }) {
  const Icon = dir === 'prev' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'prev' ? 'Previous page' : 'Next page'}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 transition active:scale-95 disabled:opacity-30"
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
      className="absolute top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-700 shadow-md ring-1 ring-slate-200 backdrop-blur transition hover:bg-white active:scale-95 disabled:opacity-0 sm:grid"
      style={dir === 'prev' ? { right: 'calc(100% + 14px)' } : { left: 'calc(100% + 14px)' }}
    >
      <Icon className="h-5 w-5" />
    </button>
  )
}
