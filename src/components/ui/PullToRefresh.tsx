import { useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { isStandalone } from '@/lib/installPrompt'
import { cn } from '@/lib/utils'

// Pull down from the top of the page to reload, like a browser refresh. Only
// in the home-screen app: there is no address bar or native pull-to-refresh
// there (iOS especially). A reload also picks up a newly deployed version.

const THRESHOLD = 80 // px of (damped) pull needed to trigger a reload
const MAX_PULL = 120
const INDICATOR = 40

// True when the touch starts inside something that scrolls on its own and is
// not at its top, or that should keep the drag (sliders, maps, opt-outs).
function blocksPull(target: EventTarget | null) {
  for (let el = target instanceof Element ? target : null; el && el !== document.body; el = el.parentElement) {
    if (el.closest('[data-no-pull-refresh], input[type="range"]')) return true
    const overflowY = getComputedStyle(el).overflowY
    if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight && el.scrollTop > 0) return true
  }
  return false
}

export function PullToRefresh() {
  const [enabled] = useState(() => typeof window !== 'undefined' && isStandalone())
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const pullRef = useRef(0)

  useEffect(() => {
    if (!enabled) return
    let startY: number | null = null
    let startX = 0
    let tracking = false

    const set = (value: number) => {
      pullRef.current = value
      setPull(value)
    }

    const onStart = (event: TouchEvent) => {
      startY = null
      tracking = false
      if (event.touches.length !== 1) return
      // Modals lock the page with body overflow hidden.
      if (window.scrollY > 0 || document.body.style.overflow === 'hidden' || blocksPull(event.target)) return
      startY = event.touches[0].clientY
      startX = event.touches[0].clientX
    }

    const onMove = (event: TouchEvent) => {
      if (startY === null) return
      const dy = event.touches[0].clientY - startY
      const dx = event.touches[0].clientX - startX
      if (!tracking) {
        // Decide once: a downward, mostly vertical drag from the very top.
        if (Math.abs(dy) < 8 && Math.abs(dx) < 8) return
        if (dy <= 0 || Math.abs(dx) > Math.abs(dy) || window.scrollY > 0) {
          startY = null
          return
        }
        tracking = true
      }
      if (event.cancelable) event.preventDefault()
      set(Math.min(MAX_PULL, Math.max(0, dy) * 0.5))
    }

    const onEnd = () => {
      if (!tracking) {
        startY = null
        return
      }
      tracking = false
      startY = null
      if (pullRef.current >= THRESHOLD) {
        setRefreshing(true)
        set(THRESHOLD)
        window.location.reload()
      } else {
        set(0)
      }
    }

    window.addEventListener('touchstart', onStart, { passive: true })
    // Not passive: once a pull starts, stop the page from scrolling/bouncing.
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd, { passive: true })
    window.addEventListener('touchcancel', onEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('touchcancel', onEnd)
    }
  }, [enabled])

  if (!enabled || (pull === 0 && !refreshing)) return null

  const progress = Math.min(1, pull / THRESHOLD)
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex justify-center"
      style={{ transform: `translateY(calc(env(safe-area-inset-top) + ${pull - INDICATOR}px))` }}
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10"
        style={{ opacity: Math.max(0.3, progress) }}
      >
        <RefreshCw
          className={cn(
            'h-5 w-5',
            progress >= 1 ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400',
            refreshing && 'animate-spin',
          )}
          style={refreshing ? undefined : { transform: `rotate(${progress * 270}deg)` }}
        />
      </div>
    </div>
  )
}
