// Swipe in from the left edge to go back, as in a native app. The iOS web view has no back gesture
// of its own, and Android only has one with gesture navigation (three-button navigation does not),
// so the app provides it. Android's own gesture is consumed by the system before it reaches here,
// so the two never both fire.

/** Where the swipe may start, measured from the left edge (px). */
const EDGE = 24
/** How far it must travel to count (px). */
const TRIGGER = 72
/** How far the arrow follows the finger (px). */
const REACH = 64

/** React Router keeps the position in the history stack in history.state.idx; 0 is where the app started. */
function canGoBack() {
  const idx = (window.history.state as { idx?: number } | null)?.idx
  return typeof idx === 'number' && idx > 0
}

function createArrow() {
  const arrow = document.createElement('div')
  arrow.setAttribute('aria-hidden', 'true')
  arrow.style.cssText = [
    'position:fixed', 'left:0', 'top:50%', 'z-index:2147482000', 'pointer-events:none',
    'width:40px', 'height:40px', 'margin:-20px 0 0 -44px', 'border-radius:50%',
    'display:grid', 'place-items:center', 'color:#fff', 'background:rgba(15,31,53,.88)',
    'box-shadow:0 4px 16px rgba(0,0,0,.28)', 'opacity:0', 'will-change:transform,opacity',
  ].join(';')
  arrow.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>'
  document.body.appendChild(arrow)
  return arrow
}

export function installBackSwipe() {
  let startX = 0
  let startY = 0
  let arrow: HTMLElement | null = null
  let tracking = false

  function finish() {
    const done = arrow
    arrow = null
    tracking = false
    if (!done) return
    done.style.transition = 'transform .2s ease, opacity .2s ease'
    done.style.opacity = '0'
    done.style.transform = 'translateX(0)'
    window.setTimeout(() => done.remove(), 220)
  }

  document.addEventListener('touchstart', event => {
    if (event.touches.length !== 1 || !canGoBack()) return
    const touch = event.touches[0]
    if (touch.clientX > EDGE) return
    startX = touch.clientX
    startY = touch.clientY
    tracking = true
  }, { passive: true })

  document.addEventListener('touchmove', event => {
    if (!tracking) return
    const touch = event.touches[0]
    const dx = touch.clientX - startX
    const dy = Math.abs(touch.clientY - startY)
    // Mostly vertical: the person is scrolling, not going back.
    if (dy > 16 && dy > dx) {
      finish()
      return
    }
    if (dx <= 8) return
    arrow ??= createArrow()
    const progress = Math.min(1, dx / TRIGGER)
    arrow.style.opacity = String(progress)
    // It starts 44px off screen (see createArrow) and comes in to REACH px from the edge.
    arrow.style.transform = `translateX(${Math.round(progress * (REACH + 44))}px)`
  }, { passive: true })

  document.addEventListener('touchend', event => {
    if (!tracking) return
    const touch = event.changedTouches[0]
    const dx = touch.clientX - startX
    const dy = Math.abs(touch.clientY - startY)
    const go = dx >= TRIGGER && dy < dx * 0.6
    finish()
    if (go && canGoBack()) window.history.back()
  }, { passive: true })

  document.addEventListener('touchcancel', finish, { passive: true })
}
