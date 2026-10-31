import { startTransition } from 'react'

export type Flight = 'fade' | 'celebrate' | 'cover'

/** The name a book's cover carries on both pages while it flies (see `html[data-flight=cover]` in index.css). */
const COVER_NAME = 'book-cover'

/**
 * Navigates with a short animation between pages:
 * - `fade`: the page cross-fades into the next one (View Transitions API, see `html[data-flight]` in index.css).
 * - `cover`: like `fade`, and the book's cover (`from`) flies into its place on the next page (`landing`): from a list
 *   to the book page, or back again (src/lib/bookFlight.ts).
 * - `celebrate`: the clicked element pops and bursts into confetti, the page fades out and the next one fades in
 *   (celebrateThen).
 *
 * Only transform and opacity are animated, so the work runs on the GPU and nothing keeps running afterwards.
 * Reduced-motion users just navigate.
 *
 * `ready` is the next page's code loading (usually done already: it is preloaded on hover). `leftPage` reports
 * when the old page is gone. `landing` (`cover` only) finds the element the cover lands on once the next page is
 * on screen; by default the cover on the book page.
 */
export async function flyToPage({ flight, from, navigate, leftPage, ready = Promise.resolve(), landing = findDetailCover }: {
  flight: Flight
  from: HTMLElement
  navigate: () => void
  leftPage: () => boolean
  ready?: Promise<unknown>
  landing?: () => HTMLElement | null
}) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    navigate()
    return
  }
  if (flight === 'celebrate') return celebrateThen(from, navigate, ready)

  // fade: only once the next page's code is loaded, so the page swaps without the Suspense spinner (navigate runs
  // inside startTransition). If it takes longer than a moment, just open the page as usual.
  if (!document.startViewTransition) {
    navigate()
    return
  }
  const loaded = await Promise.race([ready.then(() => true, () => false), wait(350).then(() => false)])
  if (!loaded) {
    navigate()
    return
  }
  const root = document.documentElement
  root.dataset.flight = flight
  // The old page is captured when the transition starts, so the cover is named before it; the new page's cover
  // is named once it is on screen. Only one element may carry the name at a time.
  if (flight === 'cover') from.style.viewTransitionName = COVER_NAME
  let landed: HTMLElement | null = null
  const transition = document.startViewTransition(() => new Promise<void>(resolve => {
    startTransition(navigate)
    // Rendering is paused while this callback runs, so watch the DOM rather than waiting for animation frames.
    const observer = new MutationObserver(() => { if (leftPage()) done() })
    const timer = window.setTimeout(done, 800)
    function done() {
      observer.disconnect()
      window.clearTimeout(timer)
      if (flight === 'cover') {
        // The old page is already captured. Free the name first: a card that is still on the new page (a related
        // book clicked on a book page) must not share it with the landing cover.
        from.style.viewTransitionName = ''
        landed = landing()
        landed?.style.setProperty('view-transition-name', COVER_NAME)
      }
      resolve()
    }
    if (leftPage()) done()
    else observer.observe(document.body, { childList: true, subtree: true })
  }))
  await transition.finished.catch(() => undefined).finally(() => {
    delete root.dataset.flight
    if (flight === 'cover') {
      from.style.viewTransitionName = ''
      if (landed) landed.style.viewTransitionName = ''
    }
  })
}

/** The cover on the book page. */
function findDetailCover() {
  return document.querySelector<HTMLElement>('[data-detail-cover]')
}

let celebrating = 0

/** True while celebrateThen is playing, so automatic redirects (e.g. after sign-in) can wait for it. */
export function isCelebrating() {
  return celebrating > 0
}

/**
 * Keeps isCelebrating() true while `work` runs, for work that may trigger a redirect (signing in loads the
 * profile, which the sign-in page redirects on) when a celebrateThen should run first.
 */
export async function whileCelebrating<T>(work: () => Promise<T>): Promise<T> {
  celebrating++
  try {
    return await work()
  } finally {
    celebrating--
  }
}

/**
 * A congratulation on `anchor`: it pops and bursts into confetti (from the middle of the screen when there is no
 * anchor on screen). Stays on the page; drawn above everything, modals included.
 */
export function celebrate(anchor?: Element | null) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const target = anchor instanceof HTMLElement && anchor.isConnected ? anchor : null
  target?.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(.93)', offset: .3 }, { transform: 'scale(1.06)', offset: .7 }, { transform: 'scale(1)' }],
    { duration: 320, easing: 'ease-out' },
  )
  const box = target?.getBoundingClientRect()
  burstConfetti(box ? box.left + box.width / 2 : window.innerWidth / 2, box ? box.top + box.height / 2 : window.innerHeight / 2)
}

/**
 * celebrate(), then fade the page out, run `go` (navigate), and fade the next page in. Everything animates on the
 * live page (no snapshots), so a slow first render of the next page never freezes the effect.
 */
export async function celebrateThen(anchor: Element | null | undefined, go: () => void, ready: Promise<unknown> = Promise.resolve()) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    go()
    return
  }
  celebrating++
  try {
    celebrate(anchor)
    await wait(180)
    const page = document.getElementById('root')
    const fadeOut = page?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, easing: 'ease-in', fill: 'forwards' })
    await Promise.all([fadeOut?.finished, Promise.race([ready.catch(() => undefined), wait(600)])])
    go()
    // The next page renders on its own schedule; fading the app root in covers that first frame.
    fadeOut?.cancel()
    page?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease-out' })
  } finally {
    celebrating--
  }
}

const CONFETTI_COLORS = ['#ffc52f', '#ff8a1f', '#cc4908', '#ffffff', '#5eead4', '#f472b6', '#818cf8']

/** A one-off burst of confetti from (x, y), drawn above the page (outside #root) and then removed. */
function burstConfetti(x: number, y: number) {
  const burst = document.createElement('div')
  burst.className = 'page-confetti'
  burst.setAttribute('aria-hidden', 'true')
  burst.style.left = `${x}px`
  burst.style.top = `${y}px`
  document.body.append(burst)

  const ring = document.createElement('b')
  burst.append(ring)
  ring.animate([{ transform: 'scale(.2)', opacity: .9 }, { transform: 'scale(2.4)', opacity: 0 }], { duration: 420, easing: 'cubic-bezier(.2, .7, .3, 1)', fill: 'forwards' })

  let longest = 0
  for (let i = 0; i < 30; i++) {
    const piece = document.createElement('i')
    const size = 6 + Math.random() * 5
    piece.style.width = `${size}px`
    piece.style.height = `${i % 3 === 0 ? size : size * .45}px`
    piece.style.borderRadius = i % 3 === 0 ? '50%' : '1px'
    piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length]
    burst.append(piece)
    // Mostly upward, spreading out to both sides, then falling under "gravity" while it spins and fades.
    const angle = (-90 + (Math.random() - .5) * 150) * Math.PI / 180
    const distance = 70 + Math.random() * 110
    const dx = Math.cos(angle) * distance
    const dy = Math.sin(angle) * distance
    const spin = (Math.random() - .5) * 720
    const duration = 750 + Math.random() * 350
    longest = Math.max(longest, duration)
    piece.animate([
      { transform: 'translate(-50%, -50%) rotate(0deg)', opacity: 1 },
      { transform: `translate(calc(${dx}px - 50%), calc(${dy}px - 50%)) rotate(${spin * .6}deg)`, opacity: 1, offset: .45 },
      { transform: `translate(calc(${dx * 1.25}px - 50%), calc(${dy + 110}px - 50%)) rotate(${spin}deg)`, opacity: 0 },
    ], { duration, easing: 'cubic-bezier(.15, .75, .35, 1)', fill: 'forwards' })
  }
  window.setTimeout(() => burst.remove(), longest + 50)
}

function wait(ms: number) {
  return new Promise(resolve => window.setTimeout(resolve, ms))
}
