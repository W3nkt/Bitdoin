import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SortDirection = 'asc' | 'desc'

/**
 * Table header cell that doubles as a sort toggle. Generic over the page's own
 * sort-key union so each table keeps its keys type-checked.
 */
export function SortableHeader<Key extends string>({
  label,
  sortValue,
  activeKey,
  direction,
  onSort,
  align = 'left',
  className = '',
}: {
  label: string
  sortValue: Key
  activeKey: Key
  direction: SortDirection
  onSort: (key: Key) => void
  align?: 'left' | 'right'
  className?: string
}) {
  const active = activeKey === sortValue
  const Icon = active ? direction === 'asc' ? ArrowUp : ArrowDown : ArrowUpDown

  return (
    <th
      // The inset shadow draws the divider instead of `border-b`: collapsed table
      // borders are unreliable on a sticky <thead>, a box-shadow always paints.
      className={cn(
        'bg-gray-50 px-4 py-3 shadow-[inset_0_-1px_0_0_#f3f4f6]',
        className,
      )}
      aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort(sortValue)}
        className={cn(
          'flex w-full items-center gap-1.5 text-xs font-semibold uppercase tracking-wide transition-colors hover:text-primary-700',
          active ? 'text-primary-700' : 'text-gray-500',
          align === 'right' ? 'justify-end text-right' : 'justify-start text-left',
        )}
        aria-label={`Sort by ${label}`}
      >
        <span>{label}</span>
        <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      </button>
    </th>
  )
}
