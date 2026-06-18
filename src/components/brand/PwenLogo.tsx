import { cn } from '@/lib/utils'
import { publicAsset } from '@/lib/assets'

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

export function PwenLogoMark({ className, title = 'Bitdoin' }: PwenLogoMarkProps) {
  return (
    <img
      src={publicAsset('icons/Bitdoin Logo H.png')}
      alt={title}
      className={cn('h-8 w-8 flex-shrink-0 object-contain', className)}
    />
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
        <p className={cn('truncate text-base font-bold tracking-normal', textClassName)}>Bitdoin</p>
        {showSubText && (
          <p className={cn('mt-1 truncate font-lao text-[10px] font-semibold leading-none tracking-normal', subTextClassName)}>
            ບິດດອຍ
          </p>
        )}
      </div>
    </div>
  )
}
