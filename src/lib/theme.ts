import { useEffect } from 'react'
import { create } from 'zustand'

// Dark mode covers the sections listed in isThemedPath(); everywhere else
// (platform selector, landing, the public bookstore price-entry page) stays
// light. <ThemeController> in App.tsx applies it from the current route.
//
// The key, the system-preference fallback and the path rule are mirrored in
// the inline script in index.html that applies the theme before React loads
// (avoids a flash). Keep them in sync.

export type Theme = 'light' | 'dark'

/** Sections that support dark mode. Exact segments, so `/bookstore-pricing` is not one. */
export function isThemedPath(pathname: string) {
  return /^\/(bookstore|admin|academy|academy-admin)(\/|$)/.test(pathname) || pathname === '/auth'
}

const THEME_KEY = 'bitdoin_theme'

function readStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

function systemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

interface ThemeState {
  theme: Theme
  /** True once the customer picked a theme; until then we follow the system. */
  explicit: boolean
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

export const useTheme = create<ThemeState>((set, get) => {
  const stored = readStoredTheme()
  return {
    theme: stored ?? systemTheme(),
    explicit: stored !== null,
    setTheme: theme => {
      try {
        localStorage.setItem(THEME_KEY, theme)
      } catch {
        // Ignore blocked storage; the choice just won't survive a reload.
      }
      set({ theme, explicit: true })
    },
    toggleTheme: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
  }
})

/**
 * Colors for recharts, which takes plain color values rather than classes.
 * The navy brand color nearly vanishes on dark cards, so dark mode uses a
 * lighter brand blue and dark tooltips.
 */
export function useChartTheme() {
  const dark = useTheme(state => state.theme) === 'dark'
  return {
    brand: dark ? '#6b8aff' : '#1e3a5f',
    surface: dark ? '#111827' : '#ffffff',
    tick: { fill: dark ? '#9ca3af' : '#6b7280' },
    axisLine: dark ? '#374151' : '#d1d5db',
    tooltip: {
      contentStyle: dark
        ? { background: '#1f2937', border: '1px solid #374151', borderRadius: 12, color: '#f3f4f6' }
        : { borderRadius: 12 },
      itemStyle: dark ? { color: '#f3f4f6' } : undefined,
      labelStyle: dark ? { color: '#d1d5db' } : undefined,
      cursor: { fill: dark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)' },
    },
  }
}

/** Puts the current theme on <html> while `enabled`; light otherwise. */
export function useApplyTheme(enabled = true) {
  const theme = useTheme(state => state.theme)
  const explicit = useTheme(state => state.explicit)

  // Follow live OS theme changes until the customer chooses one themselves.
  useEffect(() => {
    if (explicit || !enabled) return
    const query = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!query) return
    const onChange = (e: MediaQueryListEvent) => useTheme.setState({ theme: e.matches ? 'dark' : 'light' })
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [explicit, enabled])

  useEffect(() => {
    const dark = enabled && theme === 'dark'
    const root = document.documentElement
    root.classList.toggle('dark', dark)
    root.style.colorScheme = dark ? 'dark' : ''
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#111827' : '#1e3a5f')
  }, [theme, enabled])
}
