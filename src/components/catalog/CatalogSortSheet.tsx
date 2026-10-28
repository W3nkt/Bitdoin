import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'
import { SORT_OPTIONS, type Sort } from './catalogSorts'

interface CatalogSortSheetProps {
  open: boolean
  onClose: () => void
  sort: Sort
  onSelect: (sort: Sort) => void
}

/** One tap picks the order and closes the sheet. */
export function CatalogSortSheet({ open, onClose, sort, onSelect }: CatalogSortSheetProps) {
  const { t } = useTranslation()

  return (
    <Modal open={open} onClose={onClose} title={t('catalog.sortBy')} size="sm">
      <div role="radiogroup" aria-label={t('catalog.sortBy')} className="flex flex-col gap-1.5">
        {SORT_OPTIONS.map(({ value, labelKey, hintKey, icon: Icon }) => {
          const selected = sort === value
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => { onSelect(value); onClose() }}
              className={cn(
                'flex min-h-16 w-full items-center gap-3.5 rounded-2xl border px-3 text-left transition-colors',
                selected
                  ? 'border-primary-700 bg-primary-100 dark:border-primary-300 dark:bg-primary-500/15'
                  : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800',
              )}
            >
              <span className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                selected ? 'bg-primary-700 text-white dark:bg-primary-600' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
              )}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold text-gray-900 dark:text-gray-100">{t(labelKey)}</span>
                <span className="block text-[13px] text-gray-500 dark:text-gray-400">{t(hintKey)}</span>
              </span>
              <span className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2',
                selected ? 'border-primary-700 bg-primary-700 text-white dark:border-primary-600 dark:bg-primary-600' : 'border-gray-300 dark:border-gray-600',
              )}>
                {selected && <Check className="h-3.5 w-3.5" strokeWidth={3.2} />}
              </span>
            </button>
          )
        })}
      </div>
    </Modal>
  )
}
