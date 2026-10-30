import { SystemBars, SystemBarsStyle } from '@capacitor/core'

// Screens whose top bar is dark navy even in the light theme.
const DARK_TOP = /^\/(academy-admin|premium-admin)(\/|$)/

/**
 * Colours the status bar's clock and icons for the page behind them. The app has its own light/dark
 * switch, so this follows the page, not the phone's setting (the default would put dark icons on a
 * dark page whenever the two disagree). Call after the theme class on <html> has been applied.
 */
export function syncStatusBar(pathname: string) {
  const dark = document.documentElement.classList.contains('dark') || DARK_TOP.test(pathname)
  SystemBars.setStyle({ style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => undefined)
}
