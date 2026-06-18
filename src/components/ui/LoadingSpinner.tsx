import { cn } from '@/lib/utils'

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center py-16', className)}>
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-700" />
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-700" />
        <img
          src="/icons/Bitdoin-Logo.png"
          alt="Bitdoin"
          className="h-12 w-28 object-contain"
        />
      </div>
    </div>
  )
}
