import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { createPortal, flushSync } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { Grip, Menu, X, type LucideIcon } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { cn } from '@/lib/utils'
import { flyToPage } from '@/lib/pageTransition'
import { academyNavigation } from './academyMenuItems'
import './academyNavigation.css'

function preloadDestination(path: string) {
  if (path === '/academy/coach') return import('@/pages/premium/Coach').catch(() => undefined)
  if (path === '/academy/learn') return import('@/pages/premium/LearningHub').catch(() => undefined)
  if (path === '/academy/scores') return import('@/pages/academy/MyScores').catch(() => undefined)
  return import('@/pages/premium/Subscription').catch(() => undefined)
}

export function AcademyMenu() {
  const { pathname } = useLocation()
  const { profile } = useAuth()
  if (!profile || !pathname.startsWith('/academy/')) return null
  const currentPath = pathname === '/academy/subscription' || pathname === '/academy/plans' ? '/academy/membership'
    : /^\/academy\/(lesson|challenges|habits|progress|prompts|careers)(\/|$)/.test(pathname) ? '/academy/learn'
    : pathname === '/academy/top-corner-lab' ? '/academy/play' : pathname
  return <ResponsiveAcademyMenu key={pathname} pathname={pathname}
    items={academyNavigation.map(item => ({ ...item, active: currentPath === item.path || currentPath.startsWith(`${item.path}/`) }))}
    title={{ en: 'Academy menu', lo: 'ເມນູ Academy' }} brand="BITDOIN ACADEMY" preload={preloadDestination} />
}

export interface AcademyMenuItem {
  id: string
  en: string
  lo: string
  detail?: string
  detailLo?: string
  icon: LucideIcon
  color: string
  path?: string
  onSelect?: () => void
  active?: boolean
  badge?: number
}

export function ResponsiveAcademyMenu({ pathname, items, title, brand, preload }: {
  pathname: string
  items: readonly AcademyMenuItem[]
  title: { en: string; lo: string }
  brand: string
  preload?: (path: string) => Promise<unknown>
}) {
  const navigate = useNavigate()
  const { language } = useLanguage()
  const lo = language === 'lo'
  const id = useId().replace(/:/g, '')
  const captionPathId = `academy-caption-${id}`
  const panelId = `academy-navigation-panel-${id}`
  const titleId = `academy-navigation-title-${id}`
  const [desktop, setDesktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches)
  const [open, setOpen] = useState(false)
  const [departing, setDeparting] = useState(false)
  const activeIndex = items.findIndex(item => item.active)
  const [selected, setSelected] = useState(Math.max(0, activeIndex))
  const trigger = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const links = useRef<Array<HTMLButtonElement | null>>([])
  const gesture = useRef({ y: 0, dragged: false })
  const wheelDelta = useRef(0)
  const navigationPending = useRef(false)
  const mounted = useRef(true)
  const fadeOut = useRef<Animation | null>(null)
  const count = items.length

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      fadeOut.current?.cancel()
    }
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)')
    const update = () => setDesktop(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!open) return
    setSelected(Math.max(0, activeIndex))
    links.current[Math.max(0, activeIndex)]?.focus({ preventScroll: true })
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close() }
      if (event.key !== 'Tab') return
      const focusable = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]') ?? [])
        .filter(element => getComputedStyle(element).visibility !== 'hidden' && element.getClientRects().length > 0)
      // The mobile close button sits at the center of the radial menu.
      if (!desktop && trigger.current) focusable.push(trigger.current)
      const index = focusable.indexOf(document.activeElement as HTMLElement)
      if (event.shiftKey && index <= 0) {
        event.preventDefault()
        focusable[focusable.length - 1]?.focus()
      } else if (!event.shiftKey && (index === focusable.length - 1 || index < 0)) {
        event.preventDefault()
        focusable[0]?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, desktop, activeIndex])

  function close() {
    if (navigationPending.current) return
    setOpen(false)
    trigger.current?.focus()
  }

  async function selectDestination(item: AcademyMenuItem) {
    if (navigationPending.current) return
    if (item.onSelect) { close(); item.onSelect(); return }
    const path = item.path
    if (!path) return
    if (path === pathname) { close(); return }
    if (desktop || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      close()
      navigate(path)
      return
    }

    navigationPending.current = true
    const oldPanel = panel.current
    // Load the destination while the wheel completes its normal close motion.
    const ready = preload?.(path) ?? Promise.resolve()
    flushSync(() => { setDeparting(true); setOpen(false) })
    try {
      const closing = oldPanel?.getAnimations({ subtree: true })
        .filter(animation => 'transitionProperty' in animation && animation.transitionProperty === 'transform') ?? []
      await Promise.allSettled(closing.map(animation => animation.finished))
      if (!mounted.current) return
      await ready
      if (!mounted.current) return

      const go = () => { if (mounted.current) navigate(path) }
      if (typeof document.startViewTransition === 'function') {
        await flyToPage({
          flight: 'fade',
          from: trigger.current ?? oldPanel!,
          navigate: go,
          leftPage: () => !oldPanel?.isConnected,
          ready,
        })
      } else {
        // Older mobile browsers receive the same sequence using a root fade.
        const root = document.getElementById('root')
        fadeOut.current = root?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: 'ease-in', fill: 'forwards' }) ?? null
        await fadeOut.current?.finished.catch(() => undefined)
        if (!mounted.current) return
        flushSync(go)
        fadeOut.current?.cancel()
        root?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' })
      }
    } finally {
      if (mounted.current) {
        navigationPending.current = false
        setDeparting(false)
      }
    }
  }

  function roll(direction: number) {
    setSelected(index => (index + direction + count) % count)
  }

  function focusItem(index: number) {
    setSelected(index)
    // Wait for a previously hidden radial option to rotate into view.
    requestAnimationFrame(() => links.current[index]?.focus({ preventScroll: !desktop }))
  }

  const selectedItem = items[selected] ?? items[0]
  return createPortal(
    <div data-no-premium-translate aria-busy={departing || undefined} className={cn('academy-navigation', desktop ? 'is-desktop' : 'is-mobile', departing && 'is-navigating')}>
      <div aria-hidden onClick={close} className={cn('academy-menu-backdrop', open && 'is-open')} />
      <div ref={panel} id={panelId} role="dialog" aria-modal={open ? true : undefined} aria-labelledby={titleId} aria-hidden={!open} {...(!open ? { inert: '' } : {})} className={cn('academy-menu-panel', open && 'is-open')}>
        <div className="academy-menu-heading">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{brand}</p>
            <h2 id={titleId} className="mt-1 text-xl font-black text-slate-900 dark:text-white">{lo ? title.lo : title.en}</h2>
          </div>
          <button type="button" aria-label={lo ? 'ປິດເມນູ' : 'Close navigation'} onClick={close} className="academy-menu-close"><X className="h-5 w-5" /></button>
        </div>
        <div className="academy-wheel-track"
          onWheel={event => {
            if (desktop) return
            wheelDelta.current += event.deltaY
            if (Math.abs(wheelDelta.current) < 20) return
            roll(Math.sign(wheelDelta.current))
            wheelDelta.current = 0
          }}
          onPointerDown={event => { gesture.current = { y: event.clientY, dragged: false } }}
          onPointerMove={event => {
            if (desktop || event.buttons === 0) return
            const delta = gesture.current.y - event.clientY
            if (Math.abs(delta) < 32) return
            gesture.current.dragged = true
            gesture.current.y = event.clientY
            roll(Math.sign(delta))
          }}
        >
          {!desktop && <>
            <div aria-hidden className="academy-radial-surface" />
            <div aria-hidden className="academy-radial-core">
              <svg className="academy-radial-caption" viewBox="0 0 264 264">
                <defs><path id={captionPathId} d="M 38 132 A 94 94 0 0 1 132 38" /></defs>
                <text><textPath href={`#${captionPathId}`} startOffset="50%" textAnchor="middle">{lo ? selectedItem.lo : selectedItem.en}</textPath></text>
              </svg>
            </div>
            <div aria-hidden className="academy-radial-hub" />
          </>}
          <nav aria-label={lo ? title.lo : title.en} className="academy-wheel-scroll"
            onKeyDown={event => {
              const current = links.current.indexOf(document.activeElement as HTMLButtonElement)
              const next = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? (current + 1 + count) % count
                : event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? (current - 1 + count) % count
                : event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : null
              if (next === null) return
              event.preventDefault()
              focusItem(next)
            }}
          >
            {items.map((item, index) => {
              // Faded options at both ends hint that the ring keeps rotating.
              const distance = ((index - selected + count + Math.floor(count / 2)) % count) - Math.floor(count / 2)
              const angle = (48 - distance * 21) * Math.PI / 180
              const visible = desktop || Math.abs(distance) <= 2
              const isCurrent = index === activeIndex
              const Icon = item.icon
              const style = {
                '--item-color': item.color,
                ...(!desktop ? {
                  left: `calc(var(--radial-radius) - var(--orbit-radius) * ${Math.cos(angle).toFixed(6)})`,
                  top: `calc(var(--radial-radius) - var(--orbit-radius) * ${Math.sin(angle).toFixed(6)})`,
                } : {}),
              } as CSSProperties
              return (
                <button key={item.id} ref={element => { links.current[index] = element }} type="button" disabled={departing} aria-label={lo ? item.lo : item.en} aria-describedby={item.badge && item.badge > 0 ? `academy-pending-${id}-${item.id}` : undefined} aria-current={isCurrent ? 'page' : undefined} aria-hidden={!visible ? true : undefined} tabIndex={visible ? 0 : -1}
                  onClick={() => {
                    if (gesture.current.dragged) { gesture.current.dragged = false; return }
                    void selectDestination(item)
                  }}
                  className={cn('academy-wheel-item', (desktop ? isCurrent : index === selected) && 'is-selected', !desktop && Math.abs(distance) === 2 && 'is-edge', !visible && 'is-outside')}
                  style={style}
                >
                  {desktop && <span className="academy-wheel-label">
                    <span className="academy-wheel-name">{lo ? item.lo : item.en}</span>
                    <span className="academy-wheel-detail">{lo ? item.detailLo : item.detail}</span>
                  </span>}
                  <span className="academy-wheel-icon"><Icon aria-hidden className="h-6 w-6" strokeWidth={1.8} />
                    {!!item.badge && item.badge > 0 && <span className="academy-menu-badge">{item.badge > 99 ? '99+' : item.badge}</span>}
                  </span>
                  {!!item.badge && item.badge > 0 && <span id={`academy-pending-${id}-${item.id}`} className="sr-only">{lo ? `ລໍຖ້າ ${item.badge}` : `${item.badge} pending`}</span>}
                </button>
              )
            })}
          </nav>
        </div>
        <p className="sr-only">{lo ? 'ເລື່ອນເພື່ອເລືອກ · ແຕະເພື່ອເປີດ' : 'Scroll or swipe to rotate the menu. Tap a destination to open it.'}</p>
      </div>
      <button ref={trigger} type="button" disabled={departing} aria-label={open ? (lo ? 'ປິດເມນູ' : 'Close menu') : (lo ? 'ເປີດເມນູ' : 'Open menu')} aria-expanded={open} aria-controls={panelId} onClick={() => open ? close() : setOpen(true)} className={cn('academy-menu-trigger', open && 'is-open')}>
        {open ? <X className="h-6 w-6" /> : desktop ? <Menu className="h-5 w-5" /> : <Grip className="h-6 w-6" />}
      </button>
    </div>, document.body,
  )
}
