import type { MouseEvent } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import { flyToPage } from '@/lib/pageTransition'

/**
 * What the book page can show before its own data arrives. It is passed along with the navigation so that the
 * cover has somewhere real to land: without it the page would be a skeleton while the cover is flying.
 */
export interface BookPreview {
  id: string
  title: string
  author?: string | null
  cover_image_url?: string | null
}

// The book page's code. It is the same module the router loads, so this only warms the cache.
const loadBookPage = () => import('@/pages/customer/BookDetail')

/** Call when a book link is about to be used (hover, touch), so the page is ready when the cover takes off. */
export function preloadBookPage() {
  void loadBookPage().catch(() => undefined)
}

/**
 * Click handler for a link to a book page: the book's cover flies from the list to its place on the page
 * (flyToPage, `cover`). Anything that is not a plain click (new tab, a book without a cover) keeps the link's own
 * behaviour, and so does a browser without View Transitions.
 */
export function openBookWithFlight(
  event: MouseEvent<HTMLElement>,
  { book, cover, navigate }: { book: BookPreview; cover: HTMLElement | null; navigate: NavigateFunction },
) {
  const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
  if (event.defaultPrevented || event.button !== 0 || modified || !cover || !book.cover_image_url) return
  event.preventDefault()
  const preview: BookPreview = { id: book.id, title: book.title, author: book.author, cover_image_url: book.cover_image_url }
  void flyToPage({
    flight: 'cover',
    from: cover,
    navigate: () => navigate(`/bookstore/books/${book.id}`, { state: { bookPreview: preview } }),
    leftPage: () => document.querySelector<HTMLElement>('[data-detail-cover]')?.dataset.detailCover === book.id,
    ready: loadBookPage(),
  })
}

const inView = (element: HTMLElement) => {
  const box = element.getBoundingClientRect()
  return box.bottom > 0 && box.top < window.innerHeight && box.right > 0 && box.left < window.innerWidth
}

/**
 * The book's cover on the page behind this one, the card the closing cover flies to. The list is not scrolled
 * where the book was (it opens at the top), so if the card is out of sight it is brought to the middle first.
 */
function findListCover(bookId: string) {
  const covers = [...document.querySelectorAll<HTMLElement>(`[data-book-cover="${CSS.escape(bookId)}"]`)]
  const target = covers.find(inView) ?? covers[0] ?? null
  if (target && !inView(target)) target.scrollIntoView({ block: 'center', behavior: 'instant' })
  return target
}

/**
 * The book page's back button: the cover flies back and shrinks into the book's card on the page before (the
 * opening flight in reverse). Without that page (the link was opened directly) or a card to land on, it is the
 * plain `navigate(-1)` with a fade.
 */
export async function closeBookWithFlight({ bookId, cover, navigate }: { bookId: string; cover: HTMLElement | null; navigate: NavigateFunction }) {
  if (cover && !inView(cover)) {
    // Scrolled down the page: take the cover back into view so it has somewhere to take off from.
    window.scrollTo({ top: 0, behavior: 'instant' })
    await new Promise(resolve => requestAnimationFrame(resolve))
  }
  if (!cover) {
    navigate(-1)
    return
  }
  await flyToPage({
    flight: 'cover',
    from: cover,
    navigate: () => navigate(-1),
    // Gone once the page shows another book (or none); the card is what the cover lands on.
    leftPage: () => document.querySelector<HTMLElement>('[data-detail-cover]')?.dataset.detailCover !== bookId,
    landing: () => findListCover(bookId),
  })
}
