import { useEffect, useId, useState } from 'react'
import { Check, School, Search } from 'lucide-react'
import { useAcademicCopy } from '@/lib/academic/copy'
import { useSchoolSearch } from '@/lib/academic/api'
import { cn } from '@/lib/utils'
import { Select } from '@/components/ui/Input'
import { LAOS_ADMIN_DIVISIONS } from '@/data/laosAdministrativeDivisions'

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
export function SchoolPicker({ value, onChange, provinceCode, districtCode = null, showLocationFilters = false, error }: {
  value: SchoolChoice | null
  onChange: (choice: SchoolChoice | null) => void
  provinceCode: string | null
  districtCode?: string | null
  showLocationFilters?: boolean
  error?: string
}) {
  const { t, lo } = useAcademicCopy()
  const [query, setQuery] = useState('')
  const [localProvince, setLocalProvince] = useState('')
  const [localDistrict, setLocalDistrict] = useState('')
  const effectiveProvince = showLocationFilters ? localProvince || null : provinceCode
  const effectiveDistrict = showLocationFilters ? localDistrict || null : districtCode
  const province = LAOS_ADMIN_DIVISIONS.find(item => item.id === effectiveProvince)
  const debounced = useDebounced(query, 300)
  const search = useSchoolSearch(debounced, effectiveProvince, effectiveDistrict)
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
            <p className="break-words font-bold">{name}</p>
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
  const results = debounced.trim() === typed ? search.data ?? [] : []
  const showResults = typed.length >= 2 || (typed.length === 0 && !!effectiveProvince)
  return (
    <div className="space-y-3">
      {showLocationFilters && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label={t('details.province')} value={localProvince} placeholder={t('details.choose')}
            onChange={event => { setLocalProvince(event.target.value); setLocalDistrict(''); setQuery(''); onChange(null) }}
            options={LAOS_ADMIN_DIVISIONS.map(item => ({ value: item.id, label: lo ? item.name_lo : item.name_en }))} />
          <Select label={`${t('details.district')} (${t('common.optional')})`} value={localDistrict} disabled={!province} placeholder={t('details.choose')}
            onChange={event => { setLocalDistrict(event.target.value); setQuery(''); onChange(null) }}
            options={(province?.districts ?? []).map(item => ({ value: item.code, label: lo ? item.name_lo : item.name_en }))} />
        </div>
      )}
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
            placeholder={t(effectiveProvince ? 'school.searchOrSelect' : 'school.placeholder')}
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

        {showResults && (
          <div className="mt-2 max-h-80 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700" role="listbox" aria-label={t('school.label')}>
            {search.isFetching && results.length === 0 && <p className="p-3 text-sm text-slate-500 dark:text-slate-400">{t('school.searching')}</p>}
            {search.isError && <p className="p-3 text-sm text-red-600 dark:text-red-400" role="alert">{t('school.searchError')}</p>}
            {!search.isFetching && !search.isError && debounced.trim() === typed && results.length === 0 && <p className="p-3 text-sm text-slate-500 dark:text-slate-400">{t('school.noResults')}</p>}
            {results.map(school => {
              const name = lo ? school.name_lo : school.name_en || school.name_lo
              const area = LAOS_ADMIN_DIVISIONS.find(item => item.id === school.province_code)
              const district = area?.districts.find(item => item.code === school.district_code)
              const locationLabel = [district && (lo ? district.name_lo : district.name_en), area && (lo ? area.name_lo : area.name_en)].filter(Boolean).join(' · ')
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
                    <span className="block break-words font-bold">{name}</span>
                    {school.romanised_name && <span className="block break-words text-xs text-slate-500 dark:text-slate-400">{school.romanised_name}</span>}
                    <span className="block text-xs text-slate-500 dark:text-slate-400">{locationLabel}</span>
                  </span>
                </button>
              )
            })}
            {results.length >= 20 && <p className="p-3 text-xs text-slate-500 dark:text-slate-400">{t('school.refine')}</p>}
            {typed.length >= 2 && <button
              type="button"
              onClick={() => onChange({ school_free_text: typed.slice(0, 80) })}
              className="flex w-full items-center gap-3 bg-slate-50 p-3 text-left text-sm font-black text-indigo-700 hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 dark:bg-gray-800/60 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
            >
              <Check className="h-4 w-4 shrink-0" />
              {t('school.useTyped', { name: typed.slice(0, 80) })}
            </button>}
          </div>
        )}
      </div>
    </div>
  )
}
