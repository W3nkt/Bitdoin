// "Fly to cart" feedback: a copy of the book cover arcs from where the
// customer clicked into the cart icon, then the icon bumps. This shows the
// customer where the book went without leaving the page.

const CART_TARGET_SELECTOR = '[data-cart-target]'

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

// The layout renders a cart icon in the desktop header and in the mobile
// bottom bar; only one of them is visible at a time.
function findVisibleCartTarget(): HTMLElement | null {
  const targets = document.querySelectorAll<HTMLElement>(CART_TARGET_SELECTOR)
  for (const el of targets) {
    const rect = el.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) return el
  }
  return null
}

export function bumpCartIcon(target = findVisibleCartTarget()) {
  if (!target) return
  target.classList.remove('cart-bump')
  // Force a reflow so the animation restarts on rapid repeat clicks.
  void target.offsetWidth
  target.classList.add('cart-bump')
  window.setTimeout(() => target.classList.remove('cart-bump'), 600)
}

export function flyToCart(source: Element | null | undefined, imageUrl?: string | null): Promise<void> {
  const target = findVisibleCartTarget()
  if (!source || !target || prefersReducedMotion() || !('animate' in Element.prototype)) {
    bumpCartIcon(target)
    return Promise.resolve()
  }

  const from = source.getBoundingClientRect()
  const to = target.getBoundingClientRect()

  // Keep the flying copy book-shaped and reasonably small, even when the
  // source is a large cover, and big enough to read when it's a small icon.
  const height = Math.min(Math.max(from.height, 72), 120)
  const width = Math.min(from.width, height * (2 / 3))
  const startX = from.left + from.width / 2 - width / 2
  const startY = from.top + from.height / 2 - height / 2

  const flyer = document.createElement('div')
  flyer.setAttribute('aria-hidden', 'true')
  flyer.className = 'fly-to-cart'
  Object.assign(flyer.style, {
    left: `${startX}px`,
    top: `${startY}px`,
    width: `${width}px`,
    height: `${height}px`,
    backgroundImage: imageUrl ? `url("${imageUrl.replace(/"/g, '%22')}")` : '',
  })
  document.body.appendChild(flyer)

  const dx = to.left + to.width / 2 - (startX + width / 2)
  const dy = to.top + to.height / 2 - (startY + height / 2)
  // Lift the midpoint so the book travels in an arc rather than a straight line.
  const lift = Math.min(160, Math.abs(dx) * 0.35 + 60)
  const endScale = Math.max(0.12, 18 / height)

  const animation = flyer.animate(
    [
      { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1 },
      { transform: `translate(${dx * 0.1}px, ${dy * 0.1 - 24}px) scale(1.08) rotate(-6deg)`, opacity: 1, offset: 0.15 },
      { transform: `translate(${dx * 0.55}px, ${Math.min(dy * 0.55, 0) - lift}px) scale(0.6) rotate(-14deg)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(${endScale}) rotate(-20deg)`, opacity: 0.4 },
    ],
    { duration: 750, easing: 'cubic-bezier(0.45, 0, 0.25, 1)', fill: 'forwards' },
  )

  return animation.finished
    .catch(() => undefined)
    .then(() => {
      flyer.remove()
      bumpCartIcon(target)
    })
}
