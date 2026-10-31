import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RatingStarsProps {
  /** 0 to 5; halves and other fractions fill part of a star. */
  value: number
  /** Size and spacing of one star. */
  starClassName?: string
  className?: string
  /** Read out by screen readers, e.g. "Rated 4.5 out of 5". Without it the stars are decorative. */
  label?: string
}

/** Five stars filled up to `value`. */
export function RatingStars({ value, starClassName = 'h-4 w-4', className, label }: RatingStarsProps) {
  const filled = (Math.min(5, Math.max(0, value)) / 5) * 100
  const row = (colour: string) => (
    <span className="flex">
      {Array.from({ length: 5 }, (_, index) => <Star key={index} className={cn(starClassName, 'shrink-0', colour)} />)}
    </span>
  )
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('relative inline-flex', className)}
    >
      {row('fill-gray-200 text-gray-300 dark:fill-gray-700 dark:text-gray-600')}
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${filled}%` }}>
        {row('fill-amber-400 text-amber-400')}
      </span>
    </span>
  )
}
