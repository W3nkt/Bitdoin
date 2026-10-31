import { SplashScreen } from '@capacitor/splash-screen'
import markUrl from '@/assets/native-splash-mark.png'
import { publicAsset } from '@/lib/assets'
import { supabase } from '@/lib/supabase'
import './nativeSplash.css'

// The timeline, in ms from the start of the animation. Keep in step with nativeSplash.css.
const EXIT_AT = 7300
const EXIT_MS = 500
const CALM_MS = 1400

const BOOKS = 12
const SPARKS = 16
/** How long the opening waits for cover images before using the ones it has. */
const COVER_WAIT_MS = 1500
const CACHE_KEY = 'bitdoin_splash_covers'
const PLAYED_KEY = 'bitdoin_splash_played'
/** Used when the bookstore's covers cannot be loaded (first launch offline). */
const FALLBACK_COVERS = ['bitcoin', 'richdad', 'pm', 'action', 'focus', 'language']
  .map(name => publicAsset(`images/landing/book-${name}.webp`))
const SPINE_COLOURS = ['#c0392b', '#1e3a5f', '#2e7d32', '#e08a1e', '#5b3a8c', '#00796b']

const wait = (ms: number) => new Promise<void>(resolve => window.setTimeout(resolve, ms))
const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()))

/** Small seeded generator, so a layout can be reproduced. */
function random(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Session storage lives as long as the app's WebView: it survives a page reload but not a fresh launch.
 * So the opening plays once per launch, and never again when something reloads the page inside the app.
 */
function claimLaunch(): boolean {
  try {
    if (sessionStorage.getItem(PLAYED_KEY) === '1') return false
    sessionStorage.setItem(PLAYED_KEY, '1')
  } catch {
    // Storage blocked: play it, as before.
  }
  return true
}

function readCachedCovers(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '[]')
    return Array.isArray(value) ? value.filter((url): url is string => typeof url === 'string') : []
  } catch {
    return []
  }
}

/** The newest active books' covers, remembered for the next launch (which then needs no waiting). */
async function fetchCovers(): Promise<string[]> {
  try {
    const { data, error } = await supabase.from('books')
      .select('cover_image_url')
      .eq('is_active', true)
      .not('cover_image_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(18)
    if (error) return []
    const urls = (data ?? [])
      .map((row: { cover_image_url?: unknown }) => row.cover_image_url)
      .filter((url): url is string => typeof url === 'string' && /^https?:\/\//.test(url))
    if (urls.length) localStorage.setItem(CACHE_KEY, JSON.stringify(urls))
    return urls
  } catch {
    return []
  }
}

function preload(url: string): Promise<string | null> {
  return new Promise(resolve => {
    const image = new Image()
    const timer = window.setTimeout(() => resolve(null), COVER_WAIT_MS)
    image.onload = () => { window.clearTimeout(timer); resolve(url) }
    image.onerror = () => { window.clearTimeout(timer); resolve(null) }
    image.src = url
  })
}

/** Covers that are loaded and ready to show: the remembered ones at once, otherwise a short wait for fresh ones. */
async function loadCovers(): Promise<string[]> {
  const cached = readCachedCovers()
  const sources = cached.length
    ? (void fetchCovers(), cached)
    : await Promise.race([fetchCovers(), wait(COVER_WAIT_MS).then(() => [] as string[])])
  const loaded = (await Promise.all(sources.slice(0, 16).map(preload))).filter((url): url is string => url !== null)
  // Fewer than a handful would look empty: top up with the covers that ship with the app.
  return loaded.length >= 5 ? loaded : [...loaded, ...FALLBACK_COVERS]
}

function buildBooks(layer: HTMLElement, covers: string[], width: number, height: number, rand: () => number) {
  const base = Math.min(width, height)
  const between = (low: number, high: number) => low + rand() * (high - low)
  // Successive books are spread over the width by the golden ratio, so any moment looks evenly filled.
  const GOLDEN = 0.6180339887

  const books = Array.from({ length: BOOKS }, (_, i) => {
    const depth = i % 3 // 0 far and small, 2 near and large
    const w = base * [0.24, 0.32, 0.42][depth] * between(0.92, 1.08)
    const h = w * 1.5
    const x0 = (((i * GOLDEN) % 1) - 0.5) * width * 1.05 + between(-0.04, 0.04) * width
    const sway = between(-0.2, 0.2) * width
    const flip = rand() < 0.3 ? (rand() < 0.5 ? -360 : 360) : 0
    return {
      depth,
      vars: {
        '--w': `${w}px`, '--h': `${h}px`, '--t': `${w * 0.14}px`,
        '--c': SPINE_COLOURS[i % SPINE_COLOURS.length],
        '--o': String([0.7, 0.9, 1][depth]),
        '--x0': `${x0}px`, '--xm': `${x0 + sway * 0.6}px`, '--x1': `${x0 + sway}px`,
        '--y0': `${height / 2 + h * 0.9}px`, '--ym': `${between(-0.17, 0.17) * height}px`, '--y1': `${-(height / 2 + h * 0.9)}px`,
        '--rx0': `${between(-20, 20)}deg`, '--rxm': `${between(-15, 15)}deg`, '--rx1': `${between(-20, 20)}deg`,
        '--ry0': `${between(-55, 55)}deg`, '--rym': `${between(-45, 45)}deg`, '--ry1': `${between(-65, 65) + flip}deg`,
        '--rz0': `${between(-25, 25)}deg`, '--rzm': `${between(-18, 18)}deg`, '--rz1': `${between(-25, 25)}deg`,
        '--dur': `${[5.2, 4.4, 3.8][depth] * between(0.9, 1.15)}s`,
        // The first books start already part-way through their flight, so the screen is full from the first moment.
        '--delay': `${-2.4 + (i / (BOOKS - 1)) * 4.6 + between(-0.15, 0.15)}s`,
      } as Record<string, string>,
      cover: covers[i % covers.length],
    }
  })

  // Far books first in the page, so near ones are drawn over them.
  books.sort((a, b) => a.depth - b.depth).forEach(({ vars, cover }) => {
    const book = document.createElement('div')
    book.className = 'ns-book'
    for (const [name, value] of Object.entries(vars)) book.style.setProperty(name, value)
    book.innerHTML = `
      <div class="ns-book-in">
        <div class="ns-face ns-front"><img src="${cover}" alt="" draggable="false" /></div>
        <div class="ns-face ns-back"></div>
        <div class="ns-face ns-spine"></div>
        <div class="ns-face ns-pages-r"></div>
        <div class="ns-face ns-pages-t"></div>
        <div class="ns-face ns-pages-b"></div>
      </div>`
    layer.appendChild(book)
  })
}

function buildSparks(layer: HTMLElement, rand: () => number) {
  for (let i = 0; i < SPARKS; i++) {
    const spark = document.createElement('span')
    spark.className = 'ns-spark'
    spark.style.setProperty('--sx', `${rand() * 100}%`)
    spark.style.setProperty('--ss', `${2 + rand() * 3}px`)
    spark.style.setProperty('--sd', `${3 + rand() * 2.5}s`)
    spark.style.setProperty('--sl', `${rand() * 3.5}s`)
    layer.appendChild(spark)
  }
}

/**
 * The apps' opening screen: the bookstore's books fly for about five seconds, then gather into the
 * Bitdoin logo, which fades in at the centre (see nativeSplash.css for the timeline). The native
 * launch image (the same navy gradient) stays up while this loads; once this is painted the native
 * one is dropped, with no visible change. If anything here fails, the native splash screen hides
 * itself after its safety timeout (capacitor.config.ts).
 * It plays only when the app is opened; a reload while the app is running goes straight to the app.
 */
export async function playNativeSplash(seed = Date.now()) {
  if (!claimLaunch()) {
    await SplashScreen.hide({ fadeOutDuration: 0 }).catch(() => undefined)
    return
  }

  const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  const rand = random(seed)

  const root = document.createElement('div')
  root.id = 'native-splash'
  root.setAttribute('aria-hidden', 'true')
  root.innerHTML = `
    <div class="ns-layer ns-ambient"><div class="ns-glow"></div></div>
    <div class="ns-layer ns-books"></div>
    <div class="ns-layer ns-logo">
      <div class="ns-halo"></div>
      <div class="ns-ring"></div>
      <div class="ns-medal"><img src="${markUrl}" alt="" /><span class="ns-shine"></span></div>
      <div class="ns-word"><strong>Bitdoin</strong></div>
    </div>`
  document.body.appendChild(root)

  const covers = calm ? Promise.resolve<string[]>([]) : loadCovers()
  try {
    await root.querySelector('img')?.decode()
  } catch {
    // Show it anyway.
  }
  await frame()
  await frame()
  await SplashScreen.hide({ fadeOutDuration: 0 }).catch(() => undefined)

  if (!calm) {
    buildSparks(root.querySelector<HTMLElement>('.ns-ambient')!, rand)
    buildBooks(root.querySelector<HTMLElement>('.ns-books')!, await covers, window.innerWidth, window.innerHeight, rand)
  }
  root.classList.add(calm ? 'ns-calm' : 'ns-play')
  await wait(calm ? CALM_MS : EXIT_AT)
  root.classList.add('ns-exit')
  await wait(EXIT_MS)
  root.remove()
}
