import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { trackEvent, trackPageView } from '@/lib/tracking'

// Logs a page_view (and the previous page's time-on-page) on every route
// change, plus a lightweight delegated click tracker for generic button/link
// clicks. Mount once inside CustomerLayout only — admin staff aren't visitors.
export function useVisitorTracking() {
  const location = useLocation()
  const pathRef = useRef(location.pathname)
  pathRef.current = location.pathname

  useEffect(() => {
    trackPageView(location.pathname)
  }, [location.pathname])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement)?.closest?.('button, a')
      if (!target) return
      const label = target.getAttribute('aria-label')
        || target.textContent?.trim().slice(0, 60)
        || target.tagName
      trackEvent('click', { path: pathRef.current, label })
    }
    document.addEventListener('click', handleClick, { capture: true })
    return () => document.removeEventListener('click', handleClick, { capture: true })
  }, [])
}
