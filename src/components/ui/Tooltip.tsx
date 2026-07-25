import { useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface TooltipProps {
  label: string
  children: ReactNode
  side?: 'top' | 'bottom'
  className?: string
}

const EDGE_MARGIN = 64

export function Tooltip({ label, children, side = 'bottom', className }: TooltipProps) {
  const anchorRef = useRef<HTMLSpanElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  function show() {
    const rect = anchorRef.current?.getBoundingClientRect()
    if (!rect) return
    const left = Math.min(Math.max(rect.left + rect.width / 2, EDGE_MARGIN), window.innerWidth - EDGE_MARGIN)
    const top = side === 'bottom' ? rect.bottom + 8 : rect.top - 8
    setPos({ top, left })
  }

  function hide() {
    setPos(null)
  }

  return (
    <span
      ref={anchorRef}
      className={cn('relative inline-flex', className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {pos && createPortal(
        <span
          role="tooltip"
          style={{ top: pos.top, left: pos.left }}
          className={cn(
            'pointer-events-none fixed z-[100] -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-lg shadow-black/20 ring-1 ring-white/10 motion-safe:animate-fade-in',
            side === 'top' && '-translate-y-full',
          )}
        >
          {label}
          <span
            aria-hidden
            className={cn(
              'absolute left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-gray-900',
              side === 'bottom' ? '-top-1' : '-bottom-1',
            )}
          />
        </span>,
        document.body,
      )}
    </span>
  )
}
