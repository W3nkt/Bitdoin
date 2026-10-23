import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { dropBookBack } from './openBook'

/**
 * A book summary as a dialog over the closet. The reader's Close button, Esc and a click on the dimmed room all put the book
 * back: it drops onto its ledge (dropBookBack) and only then does `onExit` leave the route. `bookId` is the closet slot.
 */
export function BookModal({ bookId, onExit, children }: {
  bookId: string
  onExit: () => void
  /** Gets `close`, so the reader can put its Close button in its own toolbar. */
  children: (close: () => void) => ReactNode
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [closing, setClosing] = useState(false)

  const close = useCallback(() => {
    if (closing) return
    setClosing(true)
    void dropBookBack({
      bookId,
      from: rootRef.current?.querySelector<HTMLElement>('[data-reader-book]') ?? null,
      go: onExit,
    })
  }, [bookId, closing, onExit])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  // The closet behind must not scroll while the dialog is open.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [])

  return (
    <div ref={rootRef} className="bc-modal" role="dialog" aria-modal="true" data-closing={closing}>
      <div className="bc-modal-dim" onClick={close} />
      <div className="bc-modal-body" onClick={event => { if (event.target === event.currentTarget) close() }}>{children(close)}</div>
    </div>
  )
}
