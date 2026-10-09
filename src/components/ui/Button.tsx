import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'success' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
  fullWidth?: boolean
}

const variants: Record<Variant, string> = {
  primary:   'bg-primary-700 text-white hover:bg-primary-800 active:scale-95 shadow-sm',
  secondary: 'bg-accent-500 text-white hover:bg-accent-600 active:scale-95 shadow-sm',
  outline:   'border-2 border-primary-700 dark:border-primary-400 text-primary-700 dark:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/40',
  ghost:     'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
  success:   'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 shadow-sm focus:ring-emerald-400',
  danger:    'bg-red-600 text-white hover:bg-red-700 active:scale-95',
}

const sizes: Record<Size, string> = {
  sm: 'px-3.5 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, fullWidth, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-all duration-150',
        'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        // Keep short labels on one line: in a tight flex row the button would
        // otherwise shrink and wrap (Lao text breaks mid-word, e.g. "ແກ້ / ໄຂ").
        fullWidth ? 'w-full' : 'shrink-0 whitespace-nowrap',
        className,
      )}
      {...props}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  )
)
Button.displayName = 'Button'

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
