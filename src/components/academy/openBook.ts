// Flights between a book on the closet and the summary dialog (BookCloset.tsx, BookModal.tsx; styles are `.bc-fly*` in
// bookcloset.css). Both draw a throwaway copy of the cover above the app and animate only transform and opacity.
//
// openBookThen: the book lifts off its ledge, flies to where the dialog's book will sit and grows to its size, then fades
// into the real cover underneath. The route changes at the start, so the dialog is already mounting behind the flight;
// while the flight runs, <html data-book-flight> keeps the dialog's book hidden.
// dropBookBack: the reverse. The cover shrinks back to its slot, hovers over the ledge and drops onto it.
// Reduced-motion users just navigate.

let flying = false

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const wait = (ms: number) => new Promise<void>(resolve => window.setTimeout(resolve, ms))
const frames = (n: number) => new Promise<void>(resolve => {
  const step = (left: number) => requestAnimationFrame(() => (left <= 1 ? resolve() : step(left - 1)))
  step(n)
})

/** Transform that makes the stage box `box` look like `target`. */
function fitTo(box: DOMRect, target: DOMRect) {
  const dx = target.left + target.width / 2 - (box.left + box.width / 2)
  const dy = target.top + target.height / 2 - (box.top + box.height / 2)
  return `translate(${dx}px, ${dy}px) scale(${target.width / box.width}, ${target.height / box.height})`
}

function makeLayer(cover: HTMLElement, box: DOMRect) {
  const layer = document.createElement('div')
  layer.className = 'bc-fly'
  layer.setAttribute('aria-hidden', 'true')
  layer.innerHTML = `<div class="bc-fly-stage" style="left:${box.left}px;top:${box.top}px;width:${box.width}px;height:${box.height}px"><div class="bc-fly-book"></div></div>`
  const book = layer.querySelector<HTMLElement>('.bc-fly-book')!
  book.append(cover.cloneNode(true))
  document.body.append(layer)
  return { layer, book }
}

const play = (el: Element, keyframes: Keyframe[], duration: number, easing: string, delay = 0) =>
  el.animate(keyframes, { duration, easing, delay, fill: 'both' }).finished

export async function openBookThen(link: HTMLElement, go: () => void) {
  const cover = link.querySelector<HTMLElement>('.bc-cover')
  if (flying || !cover || reduceMotion()) {
    if (!flying) go()
    return
  }
  flying = true

  const box = link.getBoundingClientRect()
  const { layer, book } = makeLayer(cover, box)
  const root = document.documentElement
  let went = false
  const navigateOnce = () => { if (!went) { went = true; go() } }

  try {
    root.dataset.bookFlight = 'open'
    navigateOnce()

    // Off the ledge first, while the dialog mounts and finds its place.
    const lift = play(book, [
      { transform: 'translate(0, 0) scale(1) rotate(0deg)' },
      { transform: 'translate(0, -16px) scale(1.07) rotate(-3deg)' },
    ], 200, 'ease-out')

    let target: DOMRect | null = null
    const deadline = Date.now() + 1500
    while (!target && Date.now() < deadline) {
      const rect = document.querySelector<HTMLElement>('[data-reader-book]')?.getBoundingClientRect()
      if (rect && rect.width > 40) target = rect
      else await wait(30)
    }
    await lift

    if (target) {
      await play(book, [
        { transform: 'translate(0, -16px) scale(1.07) rotate(-3deg)' },
        { transform: `${fitTo(box, target)} rotate(0deg)` },
      ], 760, 'cubic-bezier(.3, .7, .2, 1)')
    }

    // Hand over to the real cover: the dialog's book fades in while the copy fades out.
    delete root.dataset.bookFlight
    await play(layer, [{ opacity: 1 }, { opacity: 0 }], 320, 'ease-out')
  } finally {
    delete root.dataset.bookFlight
    layer.remove()
    flying = false
  }
}

/**
 * The close button's flight. `from` is the dialog's book, `bookId` the slot on the closet (`.bc-book[data-book-id]`).
 * `go` navigates back; it runs once the book is down, and the copy stays until the closet has repainted.
 */
export async function dropBookBack({ bookId, from, go }: { bookId: string; from: HTMLElement | null; go: () => void }) {
  const slot = document.querySelector<HTMLElement>(`.bc-book[data-book-id="${CSS.escape(bookId)}"]`)
  const cover = slot?.querySelector<HTMLElement>('.bc-cover')
  if (flying || !slot || !cover || !from || reduceMotion()) {
    if (!flying) go()
    return
  }
  flying = true

  // The slot must be on screen for the book to land in it.
  const near = slot.getBoundingClientRect()
  if (near.top < 0 || near.bottom > window.innerHeight) slot.scrollIntoView({ block: 'center' })

  const end = slot.getBoundingClientRect()
  const start = from.getBoundingClientRect()
  const { layer, book } = makeLayer(cover, end)
  let went = false
  const navigateOnce = () => { if (!went) { went = true; go() } }

  try {
    const away = fitTo(end, start)
    const hover = 'translate(0, -30px) scale(1.05, 1.05)'
    await play(book, [
      { transform: away, opacity: 0, offset: 0 },
      { transform: away, opacity: 1, offset: 0.1, easing: 'cubic-bezier(.4, 0, .2, 1)' },
      { transform: hover, opacity: 1, offset: 0.62, easing: 'cubic-bezier(.5, 0, .9, .6)' },
      { transform: 'translate(0, 4px) scale(1.02, .975)', opacity: 1, offset: 0.82, easing: 'ease-out' },
      { transform: 'translate(0, -3px) scale(1, 1)', opacity: 1, offset: 0.92, easing: 'ease-in-out' },
      { transform: 'translate(0, 0) scale(1, 1)', opacity: 1, offset: 1 },
    ], 1000, 'linear')
    navigateOnce()
    await frames(3)
  } finally {
    navigateOnce()
    layer.remove()
    flying = false
  }
}
