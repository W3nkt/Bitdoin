import { publicAsset } from '@/lib/assets'
import { cn } from '@/lib/utils'

export function BittyAvatar({ className }: { className?: string }) {
  return (
    <img
      src={publicAsset('brand/bitty-avatar.webp')}
      alt=""
      aria-hidden="true"
      width={192}
      height={192}
      className={cn('flex-shrink-0 rounded-full bg-[#f3eee6] object-cover', className)}
    />
  )
}
