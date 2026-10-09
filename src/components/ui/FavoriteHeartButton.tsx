import { Heart } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface FavoriteHeartButtonProps {
  favorite: boolean
  onClick: () => void
  size?: 'sm' | 'md'
  disabled?: boolean
  className?: string
}

const SIZES = {
  sm: { button: 'h-6 w-6', icon: 'h-3 w-3' },
  md: { button: 'h-8 w-8', icon: 'h-4 w-4' },
}

/** Round heart toggle laid over a book card's cover. */
export function FavoriteHeartButton({ favorite, onClick, size = 'md', disabled, className }: FavoriteHeartButtonProps) {
  const { t } = useTranslation()
  const label = t(favorite ? 'book.removeFromFavorites' : 'book.addToFavorites')

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={favorite}
      aria-label={label}
      title={label}
      className={cn(
        'z-10 flex items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm transition-transform hover:scale-110 active:scale-90 dark:bg-gray-900/90',
        SIZES[size].button,
        className,
      )}
    >
      <Heart className={cn(SIZES[size].icon, 'transition-colors', favorite ? 'fill-rose-500 text-rose-500' : 'text-gray-500 dark:text-gray-300')} />
    </button>
  )
}
