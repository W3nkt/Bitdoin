import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  hover?: boolean
  padding?: boolean
  ariaLabel?: string
}

export function Card({ children, className, onClick, hover, padding = true, ariaLabel }: CardProps) {
  const cardClassName = cn(
    'bg-white rounded-3xl border border-gray-100/80 shadow-card',
    padding && 'p-5',
    hover && 'cursor-pointer transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5',
    onClick && 'cursor-pointer',
    className,
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className={cn(
          'w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
          cardClassName,
        )}
      >
        {children}
      </button>
    )
  }

  return (
    <div className={cardClassName}>
      {children}
    </div>
  )
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  color = 'blue',
  onClick,
}: {
  label: string
  value: string | number
  sub?: string
  icon: ReactNode
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'red'
  onClick?: () => void
}) {
  const colors = {
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
    red:    'bg-red-50 text-red-600',
  }
  return (
    <Card
      onClick={onClick}
      hover={!!onClick}
      ariaLabel={onClick ? `${label}: ${value}` : undefined}
      className="min-w-0 overflow-hidden p-3.5 sm:p-5"
    >
      <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-3">
        <p className="min-w-0 text-xs leading-4 text-gray-500 sm:text-sm sm:leading-5">{label}</p>
        <div className={cn('shrink-0 rounded-lg p-1.5 sm:rounded-xl sm:p-2.5 [&_svg]:h-3.5 [&_svg]:w-3.5 sm:[&_svg]:h-5 sm:[&_svg]:w-5', colors[color])}>{icon}</div>
      </div>
      <p className="mt-2 truncate text-base font-bold tracking-tight text-gray-900 sm:mt-3 sm:text-xl" title={String(value)}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-gray-400 sm:text-xs">{sub}</p>}
    </Card>
  )
}
