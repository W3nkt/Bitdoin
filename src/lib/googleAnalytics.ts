const measurementId = (import.meta.env.VITE_GA_MEASUREMENT_ID ?? '').trim()
const validMeasurementId = /^G-[A-Z0-9]+$/i.test(measurementId)

type GtagCommand = 'config' | 'event' | 'js' | 'set'
type Gtag = (command: GtagCommand, target: string | Date, params?: Record<string, unknown>) => void

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag: Gtag
  }
}

let initialized = false

function initializeGoogleAnalytics() {
  if (initialized || !validMeasurementId || typeof window === 'undefined') return validMeasurementId
  initialized = true

  window.dataLayer = window.dataLayer || []
  window.gtag = window.gtag || function gtag(...args: unknown[]) {
    window.dataLayer.push(args)
  } as Gtag

  window.gtag('js', new Date())
  window.gtag('config', measurementId, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  })

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`
  script.dataset.googleAnalytics = measurementId
  document.head.appendChild(script)
  return true
}

export function trackPageView(path: string) {
  if (!initializeGoogleAnalytics()) return
  const pagePath = path.startsWith('/') ? path : `/${path}`
  window.gtag('event', 'page_view', {
    page_title: document.title,
    page_location: `${window.location.origin}${window.location.pathname}#${pagePath}`,
    page_path: pagePath,
  })
}

export function trackGoogleEvent(name: string, parameters: Record<string, unknown> = {}) {
  if (!initializeGoogleAnalytics()) return
  window.gtag('event', name, parameters)
}

