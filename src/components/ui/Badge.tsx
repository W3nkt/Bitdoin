import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  className?: string
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
}

const variants = {
  default: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200',
  success: 'bg-green-100 dark:bg-green-500/15 text-green-800 dark:text-green-300',
  warning: 'bg-yellow-100 dark:bg-yellow-500/15 text-yellow-800 dark:text-yellow-300',
  error:   'bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-300',
  info:    'bg-blue-100 dark:bg-blue-500/15 text-blue-800 dark:text-blue-300',
}

export function Badge({ children, className, variant = 'default' }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
      variants[variant],
      className,
    )}>
      {children}
    </span>
  )
}
