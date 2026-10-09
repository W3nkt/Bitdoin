// "Throw to trash" feedback for removing a cart item: a trash bin pops up at
// the bottom of the content area, the book cover is tossed into it, the lid
// shuts and the bin goes away. The counterpart of flyToCart.

const BIN_SIZE = 56
const BIN_GAP = 16

// Lid and body are separate so the lid can swing open around its left hinge.
const LID_SVG = '<svg viewBox="0 0 24 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h18"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>'
const BODY_SVG = '<svg viewBox="0 0 24 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 1l1 13a2 2 0 0 0 2 1.5h8a2 2 0 0 0 2-1.5l1-13"/><path d="M10 5v6"/><path d="M14 5v6"/></svg>'

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/**
 * Bottom edge of the visible content: just above the highest fixed bar
 * marked [data-bitty-avoid] (cart summary, mobile tab bar), else the viewport bottom.
 */
function contentBottom() {
  const viewportHeight = window.innerHeight
  let top = viewportHeight
  document.querySelectorAll<HTMLElement>('[data-bitty-avoid]').forEach(el => {
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    if (rect.top >= viewportHeight || rect.bottom <= 0) return
    top = Math.min(top, rect.top)
  })
  return top - BIN_GAP
}

function createBin(centerX: number, bottom: number) {
  const bin = document.createElement('div')
  bin.setAttribute('aria-hidden', 'true')
  bin.className = 'trash-bin'
  Object.assign(bin.style, {
    left: `${centerX - BIN_SIZE / 2}px`,
    top: `${bottom - BIN_SIZE}px`,
    width: `${BIN_SIZE}px`,
    height: `${BIN_SIZE}px`,
  })
  const lid = document.createElement('div')
  lid.className = 'trash-bin-lid'
  lid.innerHTML = LID_SVG
  const body = document.createElement('div')
  body.className = 'trash-bin-body'
  body.innerHTML = BODY_SVG
  bin.append(lid, body)
  document.body.appendChild(bin)
  return { bin, lid }
}

/**
 * Tosses a copy of `source` (the cover) into a trash bin. Resolves when the
 * book lands, which is when the caller should remove the item; the bin then
 * closes and disappears by itself.
 */
export function throwToTrash(
  source: Element | null | undefined,
  imageUrl: string | null | undefined,
  area: Element | null | undefined,
): Promise<void> {
  if (!source || prefersReducedMotion() || !('animate' in Element.prototype)) return Promise.resolve()

  const from = source.getBoundingClientRect()
  const areaRect = area?.getBoundingClientRect()
  const binCenterX = areaRect ? areaRect.left + areaRect.width / 2 : window.innerWidth / 2
  const binBottom = contentBottom()
  const { bin, lid } = createBin(binCenterX, binBottom)

  bin.animate(
    [
      { transform: 'translateY(24px) scale(0.3)', opacity: 0 },
      { transform: 'translateY(-4px) scale(1.08)', opacity: 1, offset: 0.7 },
      { transform: 'translateY(0) scale(1)', opacity: 1 },
    ],
    { duration: 280, easing: 'cubic-bezier(0.3, 1.4, 0.5, 1)', fill: 'forwards' },
  )
  lid.animate(
    [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-38deg) translateY(-2px)' }],
    { duration: 220, delay: 180, easing: 'ease-out', fill: 'forwards' },
  )

  // Book-shaped copy of the cover, like the fly-to-cart flyer.
  const height = Math.min(from.height, 96)
  const width = height * (2 / 3)
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

  // Aim just above the bin's mouth so the book drops in.
  const dx = binCenterX - (startX + width / 2)
  const dy = binBottom - BIN_SIZE * 0.55 - (startY + height / 2)
  const lift = Math.min(140, Math.max(70, Math.abs(dy) * 0.3))
  const endScale = Math.max(0.12, 16 / height)

  const throwAnimation = flyer.animate(
    [
      { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1 },
      { transform: `translate(${dx * 0.15}px, ${-lift * 0.6}px) scale(1.05) rotate(-25deg)`, opacity: 1, offset: 0.2 },
      { transform: `translate(${dx * 0.55}px, ${Math.min(dy * 0.35, 0) - lift}px) scale(0.75) rotate(-200deg)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy - 10}px) scale(${endScale * 1.6}) rotate(-340deg)`, opacity: 1, offset: 0.88 },
      { transform: `translate(${dx}px, ${dy + 8}px) scale(${endScale}) rotate(-360deg)`, opacity: 0 },
    ],
    { duration: 850, delay: 120, easing: 'cubic-bezier(0.45, 0, 0.3, 1)', fill: 'forwards' },
  )

  return throwAnimation.finished
    .catch(() => undefined)
    .then(() => {
      flyer.remove()
      lid.animate(
        [{ transform: 'rotate(-38deg) translateY(-2px)' }, { transform: 'rotate(6deg)' }, { transform: 'rotate(0deg)' }],
        { duration: 220, easing: 'ease-in', fill: 'forwards' },
      )
      const close = bin.animate(
        [
          { transform: 'scale(1) rotate(0deg)', opacity: 1 },
          { transform: 'scale(1.12, 0.9) rotate(0deg)', opacity: 1, offset: 0.15 },
          { transform: 'scale(1) rotate(-8deg)', opacity: 1, offset: 0.3 },
          { transform: 'scale(1) rotate(6deg)', opacity: 1, offset: 0.45 },
          { transform: 'scale(1) rotate(0deg)', opacity: 1, offset: 0.6 },
          { transform: 'translateY(24px) scale(0.3)', opacity: 0 },
        ],
        { duration: 750, delay: 120, easing: 'ease-in-out', fill: 'forwards' },
      )
      close.finished.catch(() => undefined).then(() => bin.remove())
    })
}

/** Folds a list row away (height, padding and gap to zero) before it is removed. */
export function collapseRow(row: HTMLElement | null | undefined) {
  if (!row || prefersReducedMotion() || !('animate' in Element.prototype)) return
  const style = getComputedStyle(row)
  row.style.overflow = 'hidden'
  row.animate(
    [
      {
        height: `${row.offsetHeight}px`,
        paddingTop: style.paddingTop,
        paddingBottom: style.paddingBottom,
        marginTop: style.marginTop,
        borderTopWidth: style.borderTopWidth,
        borderBottomWidth: style.borderBottomWidth,
        opacity: 1,
        transform: 'scale(1)',
      },
      { opacity: 0.4, transform: 'scale(0.97)', offset: 0.4 },
      {
        height: '0px',
        paddingTop: '0px',
        paddingBottom: '0px',
        marginTop: '0px',
        borderTopWidth: '0px',
        borderBottomWidth: '0px',
        opacity: 0,
        transform: 'scale(0.95)',
      },
    ],
    { duration: 420, delay: 250, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' },
  )
}
