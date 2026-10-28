import { Busy, Skeleton } from '@/components/ui/Skeleton'
import { CATALOG_LAYOUT, CARD_CHROME, type CatalogView } from './CatalogBookCard'
import { cn } from '@/lib/utils'

/** Placeholders shaped like the catalog's two views, so the page does not jump when the books arrive. */
export function CatalogSkeleton({ view, count = 6 }: { view: CatalogView; count?: number }) {
  return (
    <Busy className={CATALOG_LAYOUT[view]}>
      {Array.from({ length: count }, (_, i) => view === 'list' ? (
        <div key={i} className={cn('flex gap-3', CARD_CHROME)}>
          <Skeleton className="aspect-[2/3] w-24 shrink-0 rounded-xl" />
          <div className="flex min-w-0 flex-1 flex-col gap-2.5 py-1">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="mt-auto h-11 w-full rounded-xl" />
          </div>
        </div>
      ) : (
        <div key={i} className={CARD_CHROME}>
          <Skeleton className="aspect-[2/3] w-full rounded-xl" />
          <div className="mt-3 space-y-2 px-0.5">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <div className="flex items-center justify-between pt-1">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </Busy>
  )
}
