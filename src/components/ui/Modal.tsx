import { useEffect, type ReactNode } from 'react'
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
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!open) return null

  return (
    // On mobile: bottom-sheet (items-end). On md+: centered dialog.
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center md:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={cn(
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
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
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
