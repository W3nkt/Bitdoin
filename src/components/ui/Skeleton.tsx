import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'

// Loading placeholders for pages whose layout is known before the data arrives. They are the same shape as what will
// replace them, so the page does not jump when it loads. Use <LoadingSpinner /> only where nobody can say what will be
// shown (see components/ui/LoadingSpinner.tsx). The shimmer is `.sk` in index.css.

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div aria-hidden="true" className={cn('sk rounded-lg', className)} style={style} />
}

/** Wraps a placeholder so assistive tech hears one "Loading" instead of a pile of empty boxes. */
export function Busy({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">Loading…</span>
      {children}
    </div>
  )
}

const widths = ['w-3/4', 'w-1/2', 'w-2/3', 'w-5/6', 'w-1/3', 'w-3/5']
const surface = 'bg-white dark:bg-gray-900 shadow-card'

/** Lines of text, the last one shorter. */
export function TextSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2.5', className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn('h-3.5', i === lines - 1 && lines > 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  )
}

/** The admin tables: a card with a header row and body rows. */
export function TableSkeleton({ rows = 8, cols = 5, className }: { rows?: number; cols?: number; className?: string }) {
  return (
    <Busy className={cn('overflow-hidden rounded-2xl', surface, className)}>
      <div className="flex gap-4 border-b border-gray-100 bg-gray-50/80 px-4 py-3.5 dark:border-gray-800 dark:bg-gray-800/50">
        {Array.from({ length: cols }, (_, c) => <Skeleton key={c} className={cn('h-3', c === 0 ? 'w-1/4' : 'flex-1')} />)}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-gray-50 px-4 py-4 last:border-0 dark:border-gray-800/60">
          {Array.from({ length: cols }, (_, c) => (
            c === 0
              ? <div key={c} className="flex w-1/4 items-center gap-3"><Skeleton className="h-9 w-9 shrink-0 rounded-lg" /><Skeleton className="h-3.5 flex-1" /></div>
              : <Skeleton key={c} className={cn('h-3.5 flex-1', widths[(r + c) % widths.length])} />
          ))}
        </div>
      ))}
    </Busy>
  )
}

/** Cards in a responsive grid (bookstore cards and the like). */
export function CardGridSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <Busy className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={cn('flex flex-col gap-3 rounded-2xl p-5', surface)}>
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/3" /></div>
            <Skeleton className="h-6 w-14 rounded-full" />
          </div>
          <TextSkeleton lines={2} />
          <div className="flex gap-2 pt-1"><Skeleton className="h-8 w-20 rounded-xl" /><Skeleton className="h-8 w-20 rounded-xl" /></div>
        </div>
      ))}
    </Busy>
  )
}

/** Rows of avatar + two lines, for lists of orders, deliveries, prompts. */
export function ListSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <Busy className={cn('space-y-3', className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={cn('flex items-center gap-4 rounded-2xl p-4', surface)}>
          <Skeleton className="h-14 w-14 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2.5"><Skeleton className="h-4 w-1/2" /><Skeleton className={cn('h-3', widths[i % widths.length])} /></div>
          <Skeleton className="hidden h-7 w-20 rounded-full sm:block" />
        </div>
      ))}
    </Busy>
  )
}

/** Order cards: a cover on the left and several lines (customer orders). */
export function OrderListSkeleton({ rows = 3, withTitle = true }: { rows?: number; withTitle?: boolean }) {
  return (
    <Busy className="space-y-4">
      {withTitle && <Skeleton className="h-6 w-32" />}
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex min-h-36 overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
          <Skeleton className="w-24 shrink-0 rounded-none sm:w-28" />
          <div className="flex flex-1 flex-col justify-center gap-3 px-4 py-4">
            <Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-1/3" /><Skeleton className="h-3 w-2/3" />
            <div className="flex items-center justify-between"><Skeleton className="h-6 w-20 rounded-full" /><Skeleton className="h-4 w-16" /></div>
          </div>
        </div>
      ))}
    </Busy>
  )
}

/** Same grid as the bookstore's book grids, with the book card's cover ratio. */
export function BookGridSkeleton({ count = 12, className }: { count?: number; className?: string }) {
  return (
    <Busy className={cn('grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6', className)}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={cn('rounded-xl p-2', surface)}>
          <Skeleton className="aspect-[2/3] w-full rounded-lg" />
          <div className="mt-2 space-y-2"><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-2/3" /><Skeleton className="h-3.5 w-1/3" /></div>
          <Skeleton className="mt-2 h-7 w-full rounded-md" />
        </div>
      ))}
    </Busy>
  )
}

/** The Favorites page: the header with its numbers, then small covers three across. */
export function FavoritesSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <Busy className={cn('space-y-5', className)}>
      <div className="rounded-3xl bg-gray-200/80 p-4 dark:bg-gray-800/70">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="mt-4 h-3 w-24" />
        <Skeleton className="mt-2 h-7 w-2/3" />
        <div className="mt-5 grid grid-cols-[1fr_1fr_1.5fr] gap-2">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-12 rounded-2xl" />)}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {Array.from({ length: count }, (_, i) => (
          <div key={i}>
            <Skeleton className="aspect-[2/3] w-full rounded-xl" />
            <Skeleton className="mt-2 h-3 w-full" />
            <Skeleton className="mt-1.5 h-3 w-2/3" />
            <Skeleton className="mt-2 h-3.5 w-1/2" />
          </div>
        ))}
      </div>
    </Busy>
  )
}

/** A few cards that read as a stat row. */
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={cn('rounded-2xl p-5', surface)}>
          <div className="flex items-center justify-between"><Skeleton className="h-3 w-20" /><Skeleton className="h-9 w-9 rounded-xl" /></div>
          <Skeleton className="mt-4 h-8 w-24" />
          <Skeleton className="mt-3 h-3 w-1/2" />
        </div>
      ))}
    </div>
  )
}

/** A card with a title and a chart-shaped block. */
export function ChartCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-2xl p-5', surface, className)} aria-hidden="true">
      <Skeleton className="h-4 w-40" />
      <div className="mt-5 flex h-56 items-end gap-3">
        {[40, 62, 48, 80, 58, 90, 70, 52].map((h, i) => <Skeleton key={i} className="flex-1 rounded-md" style={{ height: `${h}%` }} />)}
      </div>
    </div>
  )
}

/** Dashboards: heading, stat cards and a couple of chart panels. */
export function DashboardSkeleton({ className }: { className?: string }) {
  return (
    <Busy className={cn('space-y-6', className)}>
      <div className="space-y-2"><Skeleton className="h-7 w-56" /><Skeleton className="h-3.5 w-72 max-w-full" /></div>
      <StatCardsSkeleton />
      <div className="grid gap-4 lg:grid-cols-2"><ChartCardSkeleton /><ChartCardSkeleton /></div>
    </Busy>
  )
}

/** A product-style page: big image on one side, details on the other. */
/** A book page: the backdrop, the cover overlapping the white sheet, then title, chips, price and text. Keep the sizes
 *  in step with BookDetail (pages/customer/BookDetail.tsx). */
export function DetailSkeleton({ className }: { className?: string }) {
  return (
    <Busy className={cn('-mx-4 -mt-4 [--cover-w:10.5rem] sm:[--cover-w:12rem] md:mx-auto md:mt-0 md:max-w-3xl', className)}>
      <div className="relative pt-[4.5rem]">
        <div className="absolute inset-x-0 top-0 h-[17rem] overflow-hidden md:rounded-3xl">
          <Skeleton className="h-full w-full rounded-none" />
        </div>
        <div className="relative z-10 mx-auto w-[var(--cover-w)]">
          <Skeleton className="aspect-[2/3] w-full rounded-2xl" />
        </div>
        <div className="relative -mt-[calc(var(--cover-w)*0.825)] space-y-4 rounded-[2rem] bg-white px-5 pb-6 pt-[calc(var(--cover-w)*0.825+1.25rem)] dark:bg-gray-900 md:rounded-3xl">
          <Skeleton className="mx-auto h-6 w-3/4" />
          <Skeleton className="mx-auto h-4 w-1/3" />
          <div className="flex justify-center gap-2"><Skeleton className="h-7 w-20 rounded-full" /><Skeleton className="h-7 w-16 rounded-full" /></div>
          <Skeleton className="h-16 w-full rounded-2xl" />
          <TextSkeleton lines={5} />
        </div>
      </div>
    </Busy>
  )
}

/** An article: title, byline, hero image and paragraphs. */
export function ArticleSkeleton({ className }: { className?: string }) {
  return (
    <Busy className={cn('mx-auto max-w-3xl space-y-6 py-4', className)}>
      <Skeleton className="h-4 w-24 rounded-full" />
      <Skeleton className="h-9 w-5/6" />
      <div className="flex items-center gap-3"><Skeleton className="h-9 w-9 rounded-full" /><Skeleton className="h-3.5 w-40" /></div>
      <Skeleton className="aspect-[16/9] w-full rounded-2xl" />
      <TextSkeleton lines={4} /><TextSkeleton lines={5} /><TextSkeleton lines={3} />
    </Busy>
  )
}

/** A bordered panel of lines: modal bodies, small cards. */
export function PanelSkeleton({ lines = 4, className }: { lines?: number; className?: string }) {
  return (
    <Busy className={cn('space-y-4 rounded-2xl p-5', surface, className)}>
      <Skeleton className="h-5 w-1/3" />
      <TextSkeleton lines={lines} />
      <Skeleton className="h-10 w-32 rounded-xl" />
    </Busy>
  )
}

/** A receipt or order summary: header, label/value rows and a total. */
export function ReceiptSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Busy className="space-y-4 p-1">
      <div className="mx-auto h-12 w-12 sk rounded-full" aria-hidden="true" />
      <Skeleton className="mx-auto h-5 w-40" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex justify-between gap-6"><Skeleton className="h-3.5 w-24" /><Skeleton className={cn('h-3.5', widths[i % widths.length])} style={{ maxWidth: '45%' }} /></div>
      ))}
      <Skeleton className="h-9 w-full" />
    </Busy>
  )
}

/** The chat page: a few bubbles and the message box. */
export function ChatSkeleton() {
  return (
    <Busy className="flex min-h-screen flex-col bg-[#f5f6f1] pt-16 dark:bg-gray-950">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-6">
        <div className="flex gap-3"><Skeleton className="h-9 w-9 shrink-0 rounded-full" /><Skeleton className="h-20 w-3/4 rounded-3xl" /></div>
        <div className="flex justify-end"><Skeleton className="h-12 w-1/2 rounded-3xl" /></div>
        <div className="flex gap-3"><Skeleton className="h-9 w-9 shrink-0 rounded-full" /><Skeleton className="h-28 w-4/5 rounded-3xl" /></div>
        <div className="mt-auto flex gap-2"><Skeleton className="h-12 flex-1 rounded-2xl" /><Skeleton className="h-12 w-12 rounded-2xl" /></div>
      </div>
    </Busy>
  )
}

/** A sticky top bar plus a stack of cards: used before a page knows which of the academy screens it is. */
export function AcademyPageSkeleton() {
  return (
    <Busy className="min-h-screen bg-[#f7f8fb] dark:bg-gray-950">
      <div className="flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 dark:border-slate-700/80 dark:bg-gray-950/90">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2"><Skeleton className="h-2.5 w-24" /><Skeleton className="h-4 w-40" /></div>
        <Skeleton className="ml-auto h-9 w-24 rounded-full" />
      </div>
      <div className="mx-auto max-w-5xl space-y-5 px-4 py-6">
        <Skeleton className="h-52 w-full rounded-[2rem] sm:h-64" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-44 rounded-[1.6rem] sm:h-56" />)}
        </div>
      </div>
    </Busy>
  )
}

/** The admin screens: sidebar, header and a table. */
export function AdminPageSkeleton() {
  return (
    <Busy className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="hidden w-60 shrink-0 space-y-3 border-r border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 lg:block">
        <Skeleton className="mb-6 h-9 w-32" />
        {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-9 w-full rounded-xl" />)}
      </div>
      <div className="flex-1 space-y-6 p-4 sm:p-6">
        <div className="flex items-center justify-between"><Skeleton className="h-7 w-48" /><Skeleton className="h-10 w-28 rounded-xl" /></div>
        <TableSkeleton rows={8} cols={5} />
      </div>
    </Busy>
  )
}

/** The bookstore screens: a bar across the top and a book grid. */
export function StorePageSkeleton() {
  return (
    <Busy className="min-h-screen bg-white dark:bg-gray-950">
      <div className="flex h-16 items-center gap-4 border-b border-gray-100 px-4 dark:border-gray-800">
        <Skeleton className="h-9 w-28" /><Skeleton className="hidden h-10 max-w-md flex-1 rounded-full sm:block" />
        <Skeleton className="ml-auto h-9 w-9 rounded-full" /><Skeleton className="h-9 w-9 rounded-full" />
      </div>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <Skeleton className="h-40 w-full rounded-3xl sm:h-56" />
        <BookGridSkeleton count={12} />
      </div>
    </Busy>
  )
}

/** A form-in-a-card page: sign in. */
export function AuthPageSkeleton() {
  return (
    <Busy className="grid min-h-screen place-items-center bg-[#fbf6ec] px-4 dark:bg-gray-950">
      <div className="w-full max-w-sm space-y-4 rounded-3xl bg-white p-6 shadow-card dark:bg-gray-900">
        <Skeleton className="mx-auto h-10 w-32" />
        <Skeleton className="h-11 w-full rounded-xl" /><Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </Busy>
  )
}

/** The landing and platform picker: a heading and two big cards on the page's own background. */
export function SelectorPageSkeleton() {
  return (
    <Busy className="grid min-h-screen place-items-center bg-[#fbf6ec] px-4 dark:bg-gray-950">
      <div className="w-full max-w-3xl space-y-8 text-center">
        <Skeleton className="mx-auto h-10 w-64 max-w-full" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-56 rounded-3xl" /><Skeleton className="h-56 rounded-3xl" />
        </div>
      </div>
    </Busy>
  )
}
