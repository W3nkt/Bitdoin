import { ChevronLeft } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface BackButtonProps {
  /** Where to go when this page was the first of the visit (a link opened directly), so there is nothing to go back to. */
  fallback: string
  /** `light` on the page itself, `dark` over a dark or coloured header. */
  tone?: 'light' | 'dark'
  className?: string
}

/** The round back arrow at the top of a page: one step back in the history. */
export function BackButton({ fallback, tone = 'light', className }: BackButtonProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { key } = useLocation()

  return (
    <button
      type="button"
      // 'default' is the key of the first entry of the visit.
      onClick={() => (key === 'default' ? navigate(fallback) : navigate(-1))}
      aria-label={t('common.back')}
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all active:scale-95',
        tone === 'dark'
          ? 'bg-white/15 text-white backdrop-blur-sm hover:bg-white/25'
          : 'bg-white text-gray-700 shadow-sm ring-1 ring-black/5 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-200 dark:ring-white/10 dark:hover:bg-gray-800',
        className,
      )}
    >
      <ChevronLeft className="h-5 w-5" />
    </button>
  )
}
