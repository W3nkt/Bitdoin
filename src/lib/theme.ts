import { useEffect } from 'react'
import { create } from 'zustand'

// Dark mode is currently rolled out to the Bookstore only. The preference is
// global, but only layouts that call useApplyTheme() put `.dark` on <html>;
// every other platform keeps rendering light.
//
// The key and the system-preference fallback are mirrored in the inline script
// in index.html that applies the theme before React loads (avoids a flash).

export type Theme = 'light' | 'dark'

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

/** Applies the current theme to <html> while the calling layout is mounted. */
export function useApplyTheme() {
  const theme = useTheme(state => state.theme)
  const explicit = useTheme(state => state.explicit)

  // Follow live OS theme changes until the customer chooses one themselves.
  useEffect(() => {
    if (explicit) return
    const query = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!query) return
    const onChange = (e: MediaQueryListEvent) => useTheme.setState({ theme: e.matches ? 'dark' : 'light' })
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [explicit])

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.style.colorScheme = theme
    const meta = document.querySelector('meta[name="theme-color"]')
    const previousColor = meta?.getAttribute('content')
    meta?.setAttribute('content', theme === 'dark' ? '#111827' : '#1e3a5f')
    return () => {
      root.classList.remove('dark')
      root.style.colorScheme = ''
      if (meta && previousColor) meta.setAttribute('content', previousColor)
    }
  }, [theme])
}
