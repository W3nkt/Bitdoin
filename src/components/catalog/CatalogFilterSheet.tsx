import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useLanguage } from '@/context/LanguageContext'
import { countCatalogBooks } from '@/lib/catalogSearch'
import { cn } from '@/lib/utils'
import type { Category } from '@/types'
import { languageLabel } from './languageLabel'
import type { Sort } from './catalogSorts'

export interface AppliedFilters {
  language: string
  categoryIds: string[]
}

interface CatalogFilterSheetProps {
  open: boolean
  onClose: () => void
  categories?: Category[]
  languages: string[]
  /** What the page is filtered by right now; the sheet starts from this each time it opens. */
  applied: AppliedFilters
  /** The rest of the search, so "Show N books" counts what the page would really show. */
  query: string
  sort: Sort
  onApply: (next: AppliedFilters) => void
}

const label = 'text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400'

export function CatalogFilterSheet({ open, onClose, categories, languages, applied, query, sort, onApply }: CatalogFilterSheetProps) {
  const { t } = useTranslation()
  const { language: uiLanguage } = useLanguage()
  const [language, setLanguage] = useState(applied.language)
  const [categoryIds, setCategoryIds] = useState(applied.categoryIds)

  // Each opening starts from what the page is showing, so closing without applying discards the draft.
  useEffect(() => {
    if (!open) return
    setLanguage(applied.language)
    setCategoryIds(applied.categoryIds)
  }, [open])

  const { data: count } = useQuery({
    queryKey: ['books', 'catalog-count', query, sort, language, categoryIds],
    queryFn: () => countCatalogBooks({ query, language, category_ids: categoryIds }, sort),
    enabled: open,
    placeholderData: keepPreviousData,
  })

  function toggleCategory(id: string) {
    setCategoryIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function apply() {
    onApply({ language, categoryIds })
    onClose()
  }

  const languageOptions = [{ label: t('common.all'), value: '' }, ...languages.map(value => ({ label: languageLabel(t, value), value }))]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('catalog.filters')}
      footer={
        <>
          <button
            type="button"
            onClick={() => { setLanguage(''); setCategoryIds([]) }}
            className="h-12 rounded-xl px-3 text-sm font-bold text-primary-700 hover:bg-primary-50 dark:text-primary-300 dark:hover:bg-gray-800"
          >
            {t('catalog.clearFilters')}
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={count === 0}
            className="h-12 flex-1 rounded-xl bg-primary-700 px-4 text-base font-bold text-white transition-colors hover:bg-primary-800 disabled:opacity-50 dark:bg-primary-600 dark:hover:bg-primary-500"
          >
            {count === undefined ? t('common.search') : t('catalog.showBooks', { count })}
          </button>
        </>
      }
    >
      <p className={label}>{t('sidebar.language')}</p>
      <div className="mt-2 flex gap-1 rounded-2xl bg-gray-100 p-1 dark:bg-gray-800">
        {languageOptions.map(option => (
          <button
            key={option.value || 'all'}
            type="button"
            aria-pressed={language === option.value}
            onClick={() => setLanguage(option.value)}
            className={cn(
              'h-10 min-w-0 flex-1 truncate rounded-xl px-2 text-sm font-semibold transition-colors',
              language === option.value
                ? 'bg-primary-700 text-white dark:bg-primary-600'
                : 'text-gray-600 hover:bg-white/70 dark:text-gray-300 dark:hover:bg-gray-700',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-6 flex items-baseline justify-between">
        <p className={label}>{t('sidebar.category')}</p>
        {categoryIds.length > 0 && (
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('catalog.selectedCount', { count: categoryIds.length })}</span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1.5">
        {categories?.map(category => {
          const selected = categoryIds.includes(category.id)
          return (
            <button
              key={category.id}
              type="button"
              aria-pressed={selected}
              onClick={() => toggleCategory(category.id)}
              className={cn(
                'inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-colors',
                selected
                  ? 'border-primary-700 bg-primary-700 text-white dark:border-primary-600 dark:bg-primary-600'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200',
              )}
            >
              {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              {uiLanguage === 'lo' ? category.name_lo : category.name_en}
            </button>
          )
        })}
      </div>
    </Modal>
  )
}
