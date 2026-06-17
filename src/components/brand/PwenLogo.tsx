import { useId } from 'react'
import { cn } from '@/lib/utils'

interface PwenLogoMarkProps {
  className?: string
  title?: string
}

interface PwenLogoLockupProps {
  className?: string
  markClassName?: string
  textClassName?: string
  subTextClassName?: string
  showSubText?: boolean
}

export function PwenLogoMark({ className, title = 'Pwen Books' }: PwenLogoMarkProps) {
  const svgId = useId().replace(/:/g, '')
  const bgId = `${svgId}-pwen-mark-bg`
  const accentId = `${svgId}-pwen-mark-accent`

  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      className={cn('h-8 w-8 flex-shrink-0', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={bgId} x1="12" y1="6" x2="54" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#26547C" />
          <stop offset="1" stopColor="#12324F" />
        </linearGradient>
        <linearGradient id={accentId} x1="40" y1="12" x2="54" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F6B24A" />
          <stop offset="1" stopColor="#F97316" />
        </linearGradient>
      </defs>

      <rect width="64" height="64" rx="18" fill={`url(#${bgId})`} />
      <path
        d="M15.5 21.6c6.8-3.4 12.6-3.1 16.5.7v25.2c-3.9-3.7-9.7-4-16.5-.7V21.6Z"
        fill="#FFFFFF"
        opacity="0.96"
      />
      <path
        d="M48.5 21.6c-6.8-3.4-12.6-3.1-16.5.7v25.2c3.9-3.7 9.7-4 16.5-.7V21.6Z"
        fill="#FFFFFF"
        opacity="0.96"
      />
      <path d="M32 22.3v25.2" stroke="#D7E7F5" strokeWidth="2.25" strokeLinecap="round" />
      <path
        d="M20.3 27.6c3.1-.9 5.7-.7 7.8.6M20.3 33.2c3.1-.9 5.7-.7 7.8.6M43.7 27.6c-3.1-.9-5.7-.7-7.8.6M43.7 33.2c-3.1-.9-5.7-.7-7.8.6"
        stroke="#8EA9BF"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M43.4 12.8a7.7 7.7 0 1 1 0 15.4 7.7 7.7 0 0 1 0-15.4Zm0 3.6a4.1 4.1 0 1 0 0 8.2 4.1 4.1 0 0 0 0-8.2Z"
        fill={`url(#${accentId})`}
      />
      <path
        d="M46.7 26.4 52 31.7"
        stroke="#F97316"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function PwenLogoLockup({
  className,
  markClassName,
  textClassName,
  subTextClassName,
  showSubText = true,
}: PwenLogoLockupProps) {
  return (
    <div className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <PwenLogoMark className={markClassName} />
      <div className="min-w-0 leading-none">
        <p className={cn('truncate text-base font-bold tracking-normal', textClassName)}>Pwen Books</p>
        {showSubText && (
          <p className={cn('mt-1 truncate font-lao text-[10px] font-semibold leading-none tracking-normal', subTextClassName)}>
            ພີແຫວນ
          </p>
        )}
      </div>
    </div>
  )
}
