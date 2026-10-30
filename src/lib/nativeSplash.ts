import { SplashScreen } from '@capacitor/splash-screen'
import markUrl from '@/assets/native-splash-mark.png'
import './nativeSplash.css'

// How long the opening animation plays before the app is revealed, and how long the reveal takes.
const PLAY_MS = 1700
const CALM_MS = 700
const EXIT_MS = 500

const wait = (ms: number) => new Promise<void>(resolve => window.setTimeout(resolve, ms))
const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()))

/**
 * The apps' opening screen. The native launch image stays up while this loads; once it is painted
 * the native one is dropped (it is the same picture, so there is no jump) and the animation plays
 * over the app, which finishes starting behind it. If anything here fails, the native splash screen
 * hides itself after its safety timeout (capacitor.config.ts).
 */
export async function playNativeSplash() {
  const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

  const root = document.createElement('div')
  root.id = 'native-splash'
  root.setAttribute('aria-hidden', 'true')
  root.innerHTML = `
    <div class="ns-glow"></div>
    <div class="ns-ring ns-r1"></div><div class="ns-ring ns-r2"></div><div class="ns-ring ns-r3"></div>
    <div class="ns-medal"><img src="${markUrl}" alt="" /><span class="ns-shine"></span></div>
    <div class="ns-word"><strong>Bitdoin</strong></div>`
  document.body.appendChild(root)

  try {
    await root.querySelector('img')?.decode()
  } catch {
    // Show it anyway.
  }
  await frame()
  await frame()
  await SplashScreen.hide({ fadeOutDuration: 0 }).catch(() => undefined)

  root.classList.add(calm ? 'ns-calm' : 'ns-play')
  await wait(calm ? CALM_MS : PLAY_MS)
  root.classList.add('ns-exit')
  await wait(EXIT_MS)
  root.remove()
}
