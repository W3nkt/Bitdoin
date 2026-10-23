import { useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { publicAsset } from '@/lib/assets'
import {
  AcademyPageSkeleton, AdminPageSkeleton, AuthPageSkeleton, ChatSkeleton, SelectorPageSkeleton, StorePageSkeleton,
} from '@/components/ui/Skeleton'

// A spinner is for when nobody can say what is about to be shown (a payment being looked up, a public link being
// resolved). Whenever the layout is known, show its Skeleton (components/ui/Skeleton.tsx) instead.

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center py-16', className)}>
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-700 dark:border-gray-700 dark:border-t-primary-400" />
    </div>
  )
}

/**
 * What fills the screen while a page's code or the sign-in check loads. The route says what is coming, so the
 * matching skeleton is shown; only an unrecognised route gets the spinner.
 */
export function PageLoader() {
  const { pathname } = useLocation()
  if (/^\/(admin|academy-admin)(\/|$)/.test(pathname)) return <AdminPageSkeleton />
  if (pathname === '/academy/coach') return <ChatSkeleton />
  if (/^\/academy(\/|$)/.test(pathname)) return <AcademyPageSkeleton />
  if (/^\/bookstore(\/|$)/.test(pathname)) return <StorePageSkeleton />
  if (pathname === '/auth') return <AuthPageSkeleton />
  if (pathname === '/' || pathname === '/welcome') return <SelectorPageSkeleton />
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-gray-900">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-700 dark:border-gray-700 dark:border-t-primary-400" />
        <img
          src={publicAsset('icons/Bitdoin-Logo.png')}
          alt="Bitdoin"
          className="h-12 w-28 object-contain dark:brightness-0 dark:invert"
        />
      </div>
    </div>
  )
}
