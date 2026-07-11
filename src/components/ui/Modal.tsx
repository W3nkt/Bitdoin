import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  footer?: ReactNode
}

const sizes = {
  sm: 'md:max-w-sm',
  md: 'md:max-w-md',
  lg: 'md:max-w-lg',
  xl: 'md:max-w-2xl',
}

export function Modal({ open, onClose, title, children, size = 'md', footer }: ModalProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    if (!open) return

    previousFocusRef.current = document.activeElement as HTMLElement | null
    const focusable = dialogRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    focusable?.focus()

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key !== 'Tab' || !dialogRef.current) return

      const focusables = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ))
      if (focusables.length === 0) return

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
      previousFocusRef.current?.focus?.()
    }
  }, [onClose, open])

  if (!open) return null

  return (
    // On mobile: bottom-sheet (items-end). On md+: centered dialog.
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center md:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={cn(
        'relative w-full bg-white shadow-xl animate-slide-up',
        // Mobile: full width, rounded top corners, no max-height limit issues
        'rounded-t-2xl md:rounded-2xl',
        sizes[size],
      )}>
        {/* Drag indicator on mobile */}
        <div className="flex justify-center pt-3 pb-0 md:hidden">
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>

        {title && (
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h2 id={titleId} className="text-base font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        )}
        <div className="px-5 py-4 overflow-y-auto max-h-[80vh] md:max-h-[75vh]">
          {children}
        </div>
        {footer && (
          <div className="border-t border-gray-100 px-5 py-4 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
