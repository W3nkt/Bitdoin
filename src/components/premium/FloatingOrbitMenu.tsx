import { useEffect, useId, useState } from 'react'
import { X as XIcon, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface FloatingOrbitMenuItem {
  key: string
  label: string
  icon: LucideIcon
  onClick: () => void
  /** The section currently in view: drawn in red. */
  active?: boolean
  /** A shortcut that stands out from the sections (e.g. AI Coach). */
  accent?: boolean
  /** Count bubble on the item, e.g. pending requests. Hidden when 0. */
  badge?: number
}

// Item centres relative to the floating button's centre (px): an inner chain
// of three and an outer chain of five, each drawn as one gooey blob that fans
// up and left from the bottom-right corner. Items fill the inner chain first.
const INNER_CHAIN: Array<[number, number]> = [[2, -74], [-52, -58], [-73, -2]]
const OUTER_CHAIN: Array<[number, number]> = [[2, -151], [-54, -137], [-102, -99], [-135, -54], [-148, 0]]
export const FLOATING_ORBIT_MAX_ITEMS = INNER_CHAIN.length + OUTER_CHAIN.length
const ITEM_RADIUS = 24
const BUTTON_HALF = 24

/**
 * Round floating menu in the bottom-right corner (up to 8 items). Tapping the
 * dots button fans the items out as two blob chains; picking one closes it.
 */
export function FloatingOrbitMenu({
  items,
  menuLabel,
  openLabel,
  closeLabel,
}: {
  items: FloatingOrbitMenuItem[]
  menuLabel: string
  openLabel: string
  closeLabel: string
}) {
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)
  const id = useId().replace(/:/g, '')
  const menuId = `floating-orbit-${id}`

  const shown = items.slice(0, FLOATING_ORBIT_MAX_ITEMS)
  const chains = [
    INNER_CHAIN.slice(0, shown.length),
    OUTER_CHAIN.slice(0, Math.max(0, shown.length - INNER_CHAIN.length)),
  ].filter(chain => chain.length > 0)
  const positions = chains.flat()
  const topY = Math.min(...positions.map(([, y]) => y))
  const caption = shown.find(item => item.key === hovered)?.label ?? shown.find(item => item.active)?.label
  const totalBadge = shown.reduce((sum, item) => sum + (item.badge ?? 0), 0)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <>
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={cn(
          'fixed inset-0 z-40 bg-slate-950/30 transition-opacity duration-200',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />
      <div data-no-premium-translate className="fixed bottom-5 right-5 z-50 h-12 w-12 sm:bottom-6 sm:right-6">
        <nav
          id={menuId}
          aria-label={menuLabel}
          className={cn(
            'absolute inset-0 origin-center transition-[transform,opacity,visibility] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
            open ? 'visible scale-100 opacity-100' : 'invisible scale-0 opacity-0',
          )}
        >
          {caption && (
            <span
              className="pointer-events-none absolute right-0 whitespace-nowrap rounded-full bg-slate-900/90 px-3 py-1.5 text-xs font-black text-white shadow-lg ring-1 ring-white/10"
              style={{ bottom: BUTTON_HALF - topY + ITEM_RADIUS + 10 }}
            >
              {caption}
            </span>
          )}
          <svg
            aria-hidden
            width={210}
            height={210}
            viewBox="-200 -200 210 210"
            className="pointer-events-none absolute overflow-visible drop-shadow-[0_10px_18px_rgba(2,6,23,0.35)]"
            style={{ left: BUTTON_HALF - 200, top: BUTTON_HALF - 200 }}
          >
            {/* Pure vector blob (no blur/threshold filter) so edges stay crisp on high-DPI mobile screens. */}
            <g className="fill-white">
              {chains.map((chain, chainIndex) => (
                <g key={chainIndex}>
                  {chain.slice(1).map((point, index) => (
                    <path key={index} d={metaballBridge(chain[index], point, ITEM_RADIUS)} />
                  ))}
                  {chain.map(([x, y]) => (
                    <circle key={`${x},${y}`} cx={x} cy={y} r={ITEM_RADIUS} />
                  ))}
                </g>
              ))}
            </g>
          </svg>
          {shown.map((item, index) => {
            const [x, y] = positions[index]
            const Icon = item.icon
            return (
              <button
                key={item.key}
                type="button"
                aria-label={item.badge ? `${item.label} (${item.badge})` : item.label}
                aria-current={item.active ? 'page' : undefined}
                tabIndex={open ? 0 : -1}
                onClick={() => { setOpen(false); setHovered(null); item.onClick() }}
                onMouseEnter={() => setHovered(item.key)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(item.key)}
                onBlur={() => setHovered(null)}
                className={cn(
                  'absolute flex h-12 w-12 items-center justify-center rounded-full transition duration-200 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                  item.active ? 'text-red-500' : item.accent ? 'text-amber-500 hover:text-amber-600' : 'text-slate-500 hover:text-primary-700',
                )}
                style={{ left: BUTTON_HALF + x - ITEM_RADIUS, top: BUTTON_HALF + y - ITEM_RADIUS }}
              >
                <Icon className="h-5 w-5" strokeWidth={2.25} />
                {!!item.badge && <CountBubble count={item.badge} className="-right-0.5 -top-0.5" />}
              </button>
            )
          })}
        </nav>
        <button
          type="button"
          onClick={() => setOpen(current => !current)}
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={open ? closeLabel : openLabel}
          className={cn(
            'relative flex h-12 w-12 items-center justify-center rounded-full text-white shadow-[0_10px_24px_-8px_rgba(2,6,23,0.55)] transition duration-300 hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/60',
            open ? 'bg-red-500 hover:bg-red-400' : 'bg-primary-900 ring-1 ring-amber-300/50 hover:bg-primary-800',
          )}
        >
          <span aria-hidden className={cn('absolute grid grid-cols-2 gap-1 transition duration-300', open ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100')}>
            {[0, 1, 2, 3].map(dot => <span key={dot} className="h-1.5 w-1.5 rounded-full bg-current" />)}
          </span>
          <XIcon className={cn('absolute h-6 w-6 transition duration-300', open ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0')} strokeWidth={2.5} />
          {/* While closed, the button carries the total so pending work isn't hidden. */}
          {!open && totalBadge > 0 && <CountBubble count={totalBadge} className="-right-1 -top-1" />}
        </button>
      </div>
    </>
  )
}

/**
 * Concave "goo" neck between two equal circles as a vector path (metaball
 * bridge). The circles themselves are drawn separately on top.
 */
function metaballBridge([x1, y1]: [number, number], [x2, y2]: [number, number], r: number, spread = 0.55, handleSize = 2.4) {
  const d = Math.hypot(x2 - x1, y2 - y1)
  if (d === 0) return ''
  const u = d < 2 * r ? Math.acos(d / (2 * r)) : 0
  const centers = Math.atan2(y2 - y1, x2 - x1)
  const maxSpread = Math.PI / 2
  const a1 = centers + u + (maxSpread - u) * spread
  const a2 = centers - u - (maxSpread - u) * spread
  const a3 = centers + Math.PI - u - (Math.PI - u - maxSpread) * spread
  const a4 = centers - Math.PI + u + (Math.PI - u - maxSpread) * spread
  const at = (cx: number, cy: number, angle: number, length: number) => [cx + Math.cos(angle) * length, cy + Math.sin(angle) * length]
  const p1 = at(x1, y1, a1, r)
  const p2 = at(x1, y1, a2, r)
  const p3 = at(x2, y2, a3, r)
  const p4 = at(x2, y2, a4, r)
  const handle = r * Math.min(spread * handleSize, Math.hypot(p3[0] - p1[0], p3[1] - p1[1]) / (2 * r)) * Math.min(1, d / r)
  const h1 = at(p1[0], p1[1], a1 - Math.PI / 2, handle)
  const h2 = at(p2[0], p2[1], a2 + Math.PI / 2, handle)
  const h3 = at(p3[0], p3[1], a3 + Math.PI / 2, handle)
  const h4 = at(p4[0], p4[1], a4 - Math.PI / 2, handle)
  const pt = ([x, y]: number[]) => `${x.toFixed(2)} ${y.toFixed(2)}`
  return `M ${pt(p1)} C ${pt(h1)} ${pt(h3)} ${pt(p3)} L ${pt(p4)} C ${pt(h4)} ${pt(h2)} ${pt(p2)} Z`
}

function CountBubble({ count, className }: { count: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'absolute grid h-5 min-w-5 place-items-center rounded-full bg-amber-400 px-1 text-[10px] font-black leading-none text-primary-950 ring-2 ring-white',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
