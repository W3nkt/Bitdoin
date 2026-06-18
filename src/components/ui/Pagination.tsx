import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onChange: (page: number) => void
}

export function Pagination({ page, pageSize, total, onChange }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-1 py-4">
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
          page <= 1 ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-600 active:bg-gray-200',
        )}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={cn(
            'h-10 w-10 rounded-xl text-sm font-medium transition-colors',
            p === page
              ? 'bg-primary-700 text-white'
              : 'text-gray-600 hover:bg-gray-100 active:bg-gray-200',
          )}
        >
          {p}
        </button>
      ))}

      <button
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
          page >= totalPages ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-600 active:bg-gray-200',
        )}
        aria-label="Next page"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  )
}
