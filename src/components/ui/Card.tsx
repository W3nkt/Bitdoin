import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  hover?: boolean
  padding?: boolean
}

export function Card({ children, className, onClick, hover, padding = true }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-3xl border border-gray-100/80 shadow-card',
        padding && 'p-5',
        hover && 'cursor-pointer transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5',
        onClick && 'cursor-pointer',
        className,
      )}
    >
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
}: {
  label: string
  value: string | number
  sub?: string
  icon: ReactNode
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'red'
}) {
  const colors = {
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
    red:    'bg-red-50 text-red-600',
  }
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
        </div>
        <div className={cn('rounded-xl p-2.5', colors[color])}>{icon}</div>
      </div>
    </Card>
  )
}
