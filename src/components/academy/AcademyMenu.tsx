import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal, flushSync } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { Grip, Menu, PanelRightClose, PanelRightOpen, X, type LucideIcon } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { cn } from '@/lib/utils'
import { flyToPage } from '@/lib/pageTransition'
import { unreadCount, useNotifications } from '@/lib/academic/api'
import { academyNavigation } from './academyMenuItems'
import './academyNavigation.css'

function preloadDestination(path: string) {
  if (path === '/academy/coach') return import('@/pages/premium/Coach').catch(() => undefined)
  if (path === '/academy/learn') return import('@/pages/premium/LearningHub').catch(() => undefined)
  if (path === '/academy/scores') return import('@/pages/academy/MyScores').catch(() => undefined)
  return import('@/pages/premium/Subscription').catch(() => undefined)
}

const SIDEBAR_HIDDEN_KEY = 'academy_sidebar_hidden'

// The docked sidebar is shown unless the member chose to hide it.
function sidebarPreferred() {
  try { return localStorage.getItem(SIDEBAR_HIDDEN_KEY) !== '1' } catch { return true }
}

function rememberSidebar(shown: boolean) {
  try {
    if (shown) localStorage.removeItem(SIDEBAR_HIDDEN_KEY)
    else localStorage.setItem(SIDEBAR_HIDDEN_KEY, '1')
  } catch { /* Preference is a convenience only. */ }
  // Animate the page only for a toggle, not when a page mounts with the sidebar.
  const root = document.documentElement
  root.classList.add('academy-sidebar-moving')
  window.setTimeout(() => root.classList.remove('academy-sidebar-moving'), 450)
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
    title={{ en: 'Academy menu', lo: 'ເມນູ Academy' }} brand="BITDOIN ACADEMY" preload={preloadDestination} docked memberNotifications />
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

export function ResponsiveAcademyMenu({ pathname, items: destinations, title, brand, preload, compact = false, docked = false, memberNotifications = false }: {
  pathname: string
  items: readonly AcademyMenuItem[]
  title: { en: string; lo: string }
  brand: string
  preload?: (path: string) => Promise<unknown>
  compact?: boolean
  /** On desktop, dock as a narrow right sidebar that is shown by default and can be hidden. */
  docked?: boolean
  memberNotifications?: boolean
}) {
  const navigate = useNavigate()
  const { language } = useLanguage()
  const lo = language === 'lo'
  const id = useId().replace(/:/g, '')
  const panelId = `academy-navigation-panel-${id}`
  const titleId = `academy-navigation-title-${id}`
  const [desktop, setDesktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches)
  const unread = unreadCount(useNotifications(!desktop && memberNotifications, 60_000).data)
  const items = !desktop && memberNotifications
    ? destinations.map(item => item.id === 'scores' ? { ...item, badge: unread } : item)
    : destinations
  const pending = items.reduce((total, item) => total + Math.max(0, item.badge ?? 0), 0)
  const sidebar = docked && desktop
  const [open, setOpen] = useState(() => docked && window.matchMedia('(min-width: 1024px)').matches && sidebarPreferred())
  const [departing, setDeparting] = useState(false)
  const activeIndex = items.findIndex(item => item.active)
  const [selected, setSelected] = useState(Math.max(0, activeIndex))
  const trigger = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const links = useRef<Array<HTMLButtonElement | null>>([])
  const scroll = useRef<HTMLElement>(null)
  const [scrollEdges, setScrollEdges] = useState({ above: false, below: false })
  const navigationPending = useRef(false)
  const mounted = useRef(true)
  const fadeOut = useRef<Animation | null>(null)
  const count = items.length

  useLayoutEffect(() => {
    if (desktop || !open) return
    const element = scroll.current
    if (!element) return
    const update = () => setScrollEdges({
      above: element.scrollTop > 4,
      below: element.scrollHeight - element.clientHeight - element.scrollTop > 4,
    })
    // Always open at the first card; focusing a destination must not hide the heading.
    element.scrollTop = 0
    update()
    const resize = new ResizeObserver(update)
    resize.observe(element)
    if (element.firstElementChild) resize.observe(element.firstElementChild)
    element.addEventListener('scroll', update, { passive: true })
    return () => { resize.disconnect(); element.removeEventListener('scroll', update) }
  }, [desktop, open, count])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      fadeOut.current?.cancel()
    }
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)')
    const update = () => {
      setDesktop(media.matches)
      if (docked) setOpen(media.matches && sidebarPreferred())
    }
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [docked])

  // The docked sidebar pushes the page aside instead of covering it.
  useLayoutEffect(() => {
    if (!sidebar) return
    const root = document.documentElement
    root.classList.add('academy-sidebar-docked')
    root.classList.toggle('academy-sidebar-shown', open)
    return () => root.classList.remove('academy-sidebar-docked', 'academy-sidebar-shown')
  }, [sidebar, open])

  // Match the sidebar heading to the page header, whose height differs between pages.
  useLayoutEffect(() => {
    if (!sidebar) return
    const root = document.documentElement
    let header: Element | null = null
    const resize = new ResizeObserver(([entry]) => root.style.setProperty('--academy-header-h', `${entry.borderBoxSize[0].blockSize}px`))
    const track = () => {
      const next = document.querySelector('#root header')
      if (next === header) return
      if (header) resize.unobserve(header)
      header = next
      if (header) resize.observe(header)
      else root.style.removeProperty('--academy-header-h')
    }
    track()
    // Lazy pages render their header after the menu.
    const pages = new MutationObserver(track)
    pages.observe(document.getElementById('root') ?? document.body, { childList: true, subtree: true })
    return () => {
      pages.disconnect()
      resize.disconnect()
      root.style.removeProperty('--academy-header-h')
    }
  }, [sidebar])

  useEffect(() => {
    if (!open || sidebar) return
    if (!desktop) {
      setSelected(0)
      links.current[0]?.focus({ preventScroll: true })
      const outside = (target: EventTarget | null) => target instanceof Node
        && !panel.current?.contains(target) && !trigger.current?.contains(target)
      const dismissOutside = (event: Event) => {
        // Let the page receive the same tap or focus change that dismisses the popup.
        if (outside(event.target)) setOpen(false)
      }
      const onEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') { event.preventDefault(); close() }
      }
      document.addEventListener('pointerdown', dismissOutside, true)
      document.addEventListener('focusin', dismissOutside)
      document.addEventListener('keydown', onEscape)
      return () => {
        document.removeEventListener('pointerdown', dismissOutside, true)
        document.removeEventListener('focusin', dismissOutside)
        document.removeEventListener('keydown', onEscape)
      }
    }
    setSelected(Math.max(0, activeIndex))
    links.current[Math.max(0, activeIndex)]?.focus({ preventScroll: true })
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close() }
      if (event.key !== 'Tab') return
      const focusable = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]') ?? [])
        .filter(element => getComputedStyle(element).visibility !== 'hidden' && element.getClientRects().length > 0)
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
  }, [open, desktop, sidebar, activeIndex])

  function close() {
    if (navigationPending.current) return
    if (sidebar) {
      rememberSidebar(false)
      // Render the edge tab before moving focus to it.
      flushSync(() => setOpen(false))
    } else setOpen(false)
    trigger.current?.focus()
  }

  function show() {
    if (!sidebar) { setOpen(true); return }
    rememberSidebar(true)
    // The edge tab disappears, so keep focus on the toggle's replacement.
    flushSync(() => setOpen(true))
    panel.current?.querySelector<HTMLElement>('.academy-menu-close')?.focus()
  }

  async function selectDestination(item: AcademyMenuItem) {
    if (navigationPending.current) return
    if (item.onSelect) { if (!sidebar) close(); item.onSelect(); return }
    const path = item.path
    if (!path) return
    if (path === pathname) { if (!sidebar) close(); return }
    if (desktop || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (!sidebar) close()
      navigate(path)
      return
    }

    navigationPending.current = true
    const oldPanel = panel.current
    // Load the destination while the card completes its slide-down motion.
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

  function focusItem(index: number) {
    setSelected(index)
    links.current[index]?.focus({ preventScroll: true })
    if (!desktop) links.current[index]?.scrollIntoView({ block: 'nearest', behavior: 'instant' })
  }

  const tiles = items.map((item, index) => {
    const isCurrent = index === activeIndex
    const Icon = item.icon
    const style = {
      '--item-color': item.color,
    } as CSSProperties
    return (
      <button key={item.id} ref={element => { links.current[index] = element }} type="button" disabled={departing} aria-label={lo ? item.lo : item.en} aria-describedby={item.badge && item.badge > 0 ? `academy-pending-${id}-${item.id}` : undefined} aria-current={isCurrent ? 'page' : undefined}
        onClick={() => { void selectDestination(item) }}
        className={cn('academy-wheel-item', (desktop ? isCurrent : index === selected) && 'is-selected')}
        style={style}
      >
        <span className="academy-wheel-label">
          <span className="academy-wheel-name">{lo ? item.lo : item.en}</span>
          <span className="academy-wheel-detail">{lo ? item.detailLo : item.detail}</span>
        </span>
        <span className="academy-wheel-icon"><Icon aria-hidden className="h-6 w-6" strokeWidth={1.8} />
          {!!item.badge && item.badge > 0 && <span className="academy-menu-badge">{item.badge > 99 ? '99+' : item.badge}</span>}
        </span>
        {!!item.badge && item.badge > 0 && <span id={`academy-pending-${id}-${item.id}`} className="sr-only">{lo ? `ລໍຖ້າ ${item.badge}` : `${item.badge} pending`}</span>}
      </button>
    )
  })

  return createPortal(
    <div data-no-premium-translate aria-busy={departing || undefined} className={cn('academy-navigation', desktop ? 'is-desktop' : 'is-mobile', sidebar && 'is-sidebar', compact && 'is-compact', departing && 'is-navigating')}>
      {!desktop && <div aria-hidden className={cn('academy-menu-page-blur', open && 'is-open')} />}
      {desktop && !sidebar && <div aria-hidden onClick={close} className={cn('academy-menu-backdrop', open && 'is-open')} />}
      <div ref={panel} id={panelId} role={desktop && !sidebar ? 'dialog' : undefined} aria-modal={open && desktop && !sidebar ? true : undefined} aria-labelledby={desktop && !sidebar ? titleId : undefined} aria-hidden={!open} {...(!open ? { inert: '' } : {})} className={cn('academy-menu-panel', open && 'is-open')}>
        <div className="academy-menu-heading">
          {sidebar
            ? <h2 id={titleId} className="font-black text-slate-900 dark:text-white">{lo ? 'ເມນູ' : 'Menu'}</h2>
            : <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{brand}</p>
              <h2 id={titleId} className="mt-1 text-xl font-black text-slate-900 dark:text-white">{lo ? title.lo : title.en}
                {!desktop && pending > 0 && <span aria-hidden className="academy-menu-total">{pending > 99 ? '99+' : pending}</span>}
              </h2>
            </div>}
          {sidebar
            ? <button type="button" aria-label={lo ? 'ເຊື່ອງເມນູ' : 'Hide menu'} title={lo ? 'ເຊື່ອງເມນູ' : 'Hide menu'} aria-expanded aria-controls={panelId} onClick={close} className="academy-menu-close"><PanelRightClose className="h-5 w-5" /></button>
            : <button type="button" aria-label={lo ? 'ປິດເມນູ' : 'Close navigation'} onClick={close} className="academy-menu-close"><X className="h-5 w-5" /></button>}
        </div>
        <div className="academy-wheel-track">
          <nav ref={scroll} aria-label={lo ? title.lo : title.en} className={cn('academy-wheel-scroll', !desktop && scrollEdges.above && 'has-more-above', !desktop && scrollEdges.below && 'has-more-below')}
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
            {desktop ? tiles : <div className="academy-menu-grid">{tiles}</div>}
          </nav>
        </div>
        {!desktop && <p className="academy-menu-scroll-hint">{scrollEdges.below
          ? (lo ? 'ເລື່ອນຂຶ້ນເພື່ອເບິ່ງເມນູເພີ່ມເຕີມ' : 'Swipe up for more menus')
          : (lo ? 'ແຕະເພື່ອເປີດ' : 'Tap a card to explore')}</p>}
      </div>
      {sidebar
        ? <button ref={trigger} type="button" aria-label={lo ? 'ສະແດງເມນູ' : 'Show menu'} title={lo ? 'ສະແດງເມນູ' : 'Show menu'} aria-expanded={open} aria-controls={panelId} aria-hidden={open || undefined} tabIndex={open ? -1 : 0} onClick={show} className={cn('academy-menu-trigger', open && 'is-open')}>
          <PanelRightOpen className="h-5 w-5" />
        </button>
        : <button ref={trigger} type="button" disabled={departing} aria-label={open ? (lo ? 'ປິດເມນູ' : 'Close menu') : (lo ? 'ເປີດເມນູ' : 'Open menu')} aria-describedby={!desktop && pending > 0 ? `academy-updates-${id}` : undefined} aria-expanded={open} aria-controls={panelId} onClick={() => open ? close() : show()} className={cn('academy-menu-trigger', open && 'is-open')}>
          {open ? <X className="h-6 w-6" /> : desktop ? <Menu className="h-5 w-5" /> : <Grip className="h-6 w-6" />}
          {!desktop && pending > 0 && <><span aria-hidden className="academy-menu-badge">{pending > 99 ? '99+' : pending}</span><span id={`academy-updates-${id}`} className="sr-only">{lo ? `ການແຈ້ງເຕືອນ ${pending}` : `${pending} pending updates`}</span></>}
        </button>}
    </div>, document.body,
  )
}
