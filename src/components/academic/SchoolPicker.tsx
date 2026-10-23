import { useEffect, useId, useState } from 'react'
import { Check, School, Search } from 'lucide-react'
import { useAcademicCopy } from '@/lib/academic/copy'
import { useSchoolSearch } from '@/lib/academic/api'
import { cn } from '@/lib/utils'

export type SchoolChoice = { school_id: string; name: string } | { school_free_text: string }

function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), ms)
    return () => window.clearTimeout(timer)
  }, [value, ms])
  return debounced
}

/**
 * Searchable school list with a "not listed" fallback, so no student is
 * blocked (PROFILE-002). Search covers Lao and romanised names.
 */
export function SchoolPicker({ value, onChange, provinceCode, error }: {
  value: SchoolChoice | null
  onChange: (choice: SchoolChoice | null) => void
  provinceCode: string | null
  error?: string
}) {
  const { t, lo } = useAcademicCopy()
  const [query, setQuery] = useState('')
  const debounced = useDebounced(query, 300)
  const search = useSchoolSearch(debounced, provinceCode)
  const inputId = useId()
  const errorId = `${inputId}-error`

  if (value) {
    const name = 'school_id' in value ? value.name : value.school_free_text
    return (
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{t('school.label')}</p>
        <div className="mt-1 flex items-center gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-3 dark:border-indigo-500/30 dark:bg-indigo-500/10">
          <School className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-300" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{name}</p>
            {'school_free_text' in value && <p className="text-xs text-slate-600 dark:text-slate-400">{t('school.unverified')}</p>}
          </div>
          <button type="button" onClick={() => onChange(null)} className="shrink-0 rounded-full px-3 py-1.5 text-sm font-black text-indigo-700 hover:bg-indigo-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300 dark:hover:bg-indigo-500/20">
            {t('school.change')}
          </button>
        </div>
      </div>
    )
  }

  const typed = query.trim()
  const results = search.data ?? []
  return (
    <div>
      <label htmlFor={inputId} className="text-sm font-medium text-gray-700 dark:text-gray-200">
        {t('school.label')}<span className="ml-0.5 text-red-500">*</span>
      </label>
      <div className="relative mt-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder={t('school.placeholder')}
          autoComplete="off"
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-3 text-base placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-900 dark:focus:ring-primary-800 sm:text-sm',
            error && 'border-red-400',
          )}
        />
      </div>
      {error && <p id={errorId} className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}

      {typed.length >= 2 && (
        <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700" role="listbox" aria-label={t('school.label')}>
          {search.isFetching && results.length === 0 && <p className="p-3 text-sm text-slate-500">{t('school.searching')}</p>}
          {!search.isFetching && debounced.trim() === typed && results.length === 0 && <p className="p-3 text-sm text-slate-500">{t('school.noResults')}</p>}
          {results.map(school => {
            const name = lo ? school.name_lo : school.name_en || school.name_lo
            return (
              <button
                key={school.id}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => onChange({ school_id: school.id, name })}
                className="flex w-full items-center gap-3 border-b border-slate-100 p-3 text-left last:border-b-0 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none dark:border-slate-800 dark:hover:bg-gray-800 dark:focus:bg-gray-800"
              >
                <School className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="min-w-0">
                  <span className="block truncate font-bold">{name}</span>
                  {school.romanised_name && <span className="block truncate text-xs text-slate-500">{school.romanised_name}</span>}
                </span>
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => onChange({ school_free_text: typed.slice(0, 80) })}
            className="flex w-full items-center gap-3 bg-slate-50 p-3 text-left text-sm font-black text-indigo-700 hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 dark:bg-gray-800/60 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
          >
            <Check className="h-4 w-4 shrink-0" />
            {t('school.useTyped', { name: typed.slice(0, 80) })}
          </button>
        </div>
      )}
    </div>
  )
}
