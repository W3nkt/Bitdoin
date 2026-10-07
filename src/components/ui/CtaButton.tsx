import { type MouseEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CtaButtonProps {
  onActivate: () => void
  disabled?: boolean
  children: ReactNode
  /** Leading icon; defaults to a lightning bolt */
  icon?: ReactNode
  className?: string
}

// The highlighted primary action (Buy Now, Proceed to Checkout): an eye-catching
// gradient with a periodic shine, and a short celebration on click.

// How long the click celebration plays before onActivate runs (navigation).
// Kept short so it feels rewarding rather than slow.
const CELEBRATION_MS = 550
const PARTICLE_COLORS = ['#f97316', '#fb923c', '#fde047', '#f43f5e', '#ffffff', '#facc15']

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

// Particles live on <body> so they aren't clipped by overflow-hidden cards.
function burstParticles(originX: number, originY: number) {
  if (!('animate' in Element.prototype)) return
  const count = 18
  for (let i = 0; i < count; i++) {
    const particle = document.createElement('span')
    particle.setAttribute('aria-hidden', 'true')
    particle.className = 'buy-now-particle'
    const size = 4 + Math.random() * 5
    const isStreak = i % 3 === 0
    Object.assign(particle.style, {
      left: `${originX}px`,
      top: `${originY}px`,
      width: `${isStreak ? size * 0.6 : size}px`,
      height: `${isStreak ? size * 2.2 : size}px`,
      borderRadius: isStreak ? '2px' : '9999px',
      background: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
    })
    document.body.appendChild(particle)

    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5
    const distance = 46 + Math.random() * 44
    const x = Math.cos(angle) * distance
    const y = Math.sin(angle) * distance - 14
    const spin = (Math.random() - 0.5) * 540

    particle.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.4) rotate(0deg)', opacity: 1 },
        { transform: `translate(calc(-50% + ${x * 0.75}px), calc(-50% + ${y * 0.75}px)) scale(1.15) rotate(${spin * 0.6}deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y + 22}px)) scale(0.3) rotate(${spin}deg)`, opacity: 0 },
      ],
      { duration: 700 + Math.random() * 250, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)', fill: 'forwards' },
    ).finished.catch(() => undefined).then(() => particle.remove())
  }
}

export function CtaButton({ onActivate, disabled, children, icon, className }: CtaButtonProps) {
  const [celebrating, setCelebrating] = useState(false)
  const [ripple, setRipple] = useState<{ x: number; y: number; key: number } | null>(null)
  const timer = useRef<number>()

  useEffect(() => () => window.clearTimeout(timer.current), [])

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    if (disabled || celebrating) return
    if (prefersReducedMotion()) {
      onActivate()
      return
    }

    const rect = e.currentTarget.getBoundingClientRect()
    // Keyboard activation has no pointer position; burst from the centre.
    const clientX = e.clientX || rect.left + rect.width / 2
    const clientY = e.clientY || rect.top + rect.height / 2
    setRipple({ x: clientX - rect.left, y: clientY - rect.top, key: Date.now() })
    setCelebrating(true)
    burstParticles(rect.left + rect.width / 2, rect.top + rect.height / 2)
    timer.current = window.setTimeout(onActivate, CELEBRATION_MS)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-busy={celebrating || undefined}
      className={cn(
        'buy-now-btn group relative isolate inline-flex h-11 items-center justify-center gap-1.5 overflow-hidden rounded-xl px-5',
        'bg-gradient-to-r from-accent-500 via-orange-500 to-rose-500 bg-[length:200%_100%] bg-left',
        'text-sm font-black text-white shadow-lg shadow-accent-500/30',
        'transition-[transform,box-shadow,background-position] duration-300 ease-out',
        'hover:-translate-y-0.5 hover:scale-[1.04] hover:bg-right hover:shadow-xl hover:shadow-accent-500/45',
        'active:translate-y-0 active:scale-95',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-300',
        'disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:scale-100',
        celebrating && 'buy-now-pop',
        className,
      )}
    >
      {/* Periodic light sweep — draws the eye without constant motion */}
      {!disabled && !celebrating && <span aria-hidden className="buy-now-shine" />}

      {ripple && (
        <span
          key={ripple.key}
          aria-hidden
          className="buy-now-ripple"
          style={{ left: ripple.x, top: ripple.y }}
        />
      )}

      <span className="relative z-10 inline-flex items-center gap-1.5">
        {celebrating ? (
          <Check className="h-4 w-4 buy-now-check" strokeWidth={3} />
        ) : (
          <span className="inline-flex transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110">
            {icon ?? <Zap className="h-4 w-4 fill-yellow-200 text-yellow-200" />}
          </span>
        )}
        {children}
        <ArrowRight
          className={cn(
            'h-4 w-4 transition-transform duration-300 group-hover:translate-x-1',
            celebrating && 'translate-x-2 opacity-0',
          )}
        />
      </span>
    </button>
  )
}
