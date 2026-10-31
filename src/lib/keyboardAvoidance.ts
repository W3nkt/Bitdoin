/**
 * Keeps the field a person is typing in above the on-screen keyboard, so they can see what they type.
 *
 * Phones draw the keyboard over the bottom of the page instead of shrinking it, and the page does not
 * know. `visualViewport` reports what is left. While the keyboard is up this
 *  - sets --keyboard-inset and --visual-height on <html> and adds the keyboard-open class, which the
 *    overlays and bottom bars use (see `.above-keyboard` in index.css), and
 *  - scrolls the focused field into view if the keyboard would hide it.
 * Where the browser or WebView already shrinks the page for the keyboard (most Android builds) the two
 * heights agree, so none of this does anything.
 */

// Anything shorter than this is a browser bar moving, not a keyboard.
const MIN_KEYBOARD_PX = 100
// Space kept between a field and the edge of what is visible.
const EDGE_GAP = 16
// The keyboard slides in over about this long; the page is only settled after it.
const SLIDE_MS = 350

const NOT_TEXT = new Set(['checkbox', 'radio', 'range', 'file', 'color', 'button', 'submit', 'reset', 'image', 'hidden'])

/** A field that opens the keyboard. (A <select> opens a picker instead.) */
function isTextField(target: Element | null): target is HTMLElement {
  if (target instanceof HTMLTextAreaElement) return true
  if (target instanceof HTMLInputElement) return !NOT_TEXT.has(target.type)
  return target instanceof HTMLElement && target.isContentEditable
}

let installed = false

export function installKeyboardAvoidance() {
  const viewport = window.visualViewport
  if (installed || !viewport) return
  installed = true

  const root = document.documentElement
  let frame = 0
  let revealTimer = 0

  /** Scrolls the focused field into the middle of what the keyboard leaves visible, if it is not already there. */
  function reveal() {
    const field = document.activeElement
    if (!viewport || !isTextField(field)) return
    const rect = field.getBoundingClientRect()
    const top = viewport.offsetTop + EDGE_GAP
    const bottom = viewport.offsetTop + viewport.height - EDGE_GAP
    if (rect.top >= top && rect.bottom <= bottom) return
    field.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' })
  }

  function revealSoon(delay: number) {
    window.clearTimeout(revealTimer)
    revealTimer = window.setTimeout(reveal, delay)
  }

  function update() {
    if (!viewport) return
    // A pinch-zoomed page (the website) has a smaller visual viewport too; that is not a keyboard.
    const hidden = viewport.scale > 1.01 ? 0 : Math.round(window.innerHeight - viewport.height)
    const open = hidden >= MIN_KEYBOARD_PX
    if (open) {
      // How far the keyboard reaches up from the bottom of the page. This is smaller than its height when
      // iOS has already panned the page up, and then bars at the bottom are above it without help.
      const inset = Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop))
      root.style.setProperty('--keyboard-inset', `${inset}px`)
      root.style.setProperty('--visual-height', `${Math.round(viewport.height)}px`)
    } else {
      root.style.removeProperty('--keyboard-inset')
      root.style.removeProperty('--visual-height')
    }
    root.classList.toggle('keyboard-open', open)
    if (open) revealSoon(120)
  }

  const schedule = () => {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(update)
  }

  viewport.addEventListener('resize', schedule)
  viewport.addEventListener('scroll', schedule)
  document.addEventListener('focusin', event => {
    if (isTextField(event.target as Element | null)) revealSoon(SLIDE_MS)
  })
  update()
}
