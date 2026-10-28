import { useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAcademicCopy } from '@/lib/academic/copy'
import type { AcademicSubject, SubjectItem } from '@/lib/academic/api'
import { cn } from '@/lib/utils'
import { SubjectBadge } from './visuals'

/**
 * Subject list for an enrolment (PROFILE-003): grade defaults pre-selected,
 * any catalogue subject can be toggled, custom subjects can be added.
 */
export function SubjectPicker({ catalogue, value, onChange, max, error }: {
  catalogue: AcademicSubject[]
  value: SubjectItem[]
  onChange: (items: SubjectItem[]) => void
  max: number
  error?: string
}) {
  const { t, lo } = useAcademicCopy()
  const [custom, setCustom] = useState('')
  const selectedIds = new Set(value.flatMap(item => ('subject_id' in item ? [item.subject_id] : [])))
  const customItems = value.filter((item): item is { custom_name: string } => 'custom_name' in item)
  const full = value.length >= max

  const toggle = (subject: AcademicSubject) => {
    if (selectedIds.has(subject.id)) onChange(value.filter(item => !('subject_id' in item) || item.subject_id !== subject.id))
    else if (!full) onChange([...value, { subject_id: subject.id }])
  }
  const addCustom = () => {
    const name = custom.trim().slice(0, 60)
    if (!name || full) return
    const exists = customItems.some(item => item.custom_name.toLowerCase() === name.toLowerCase())
      || catalogue.some(subject => [subject.name_en, subject.name_lo].some(n => n.toLowerCase() === name.toLowerCase()))
    if (!exists) onChange([...value, { custom_name: name }])
    setCustom('')
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label={t('subjects.title')}>
        {catalogue.map(subject => {
          const on = selectedIds.has(subject.id)
          return (
            <button
              key={subject.id}
              type="button"
              aria-pressed={on}
              disabled={!on && full}
              onClick={() => toggle(subject)}
              className={cn(
                'relative flex items-center gap-2.5 rounded-2xl p-2.5 text-left text-sm font-bold ring-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-40',
                on
                  ? 'bg-indigo-50 text-indigo-950 ring-2 ring-indigo-500 dark:bg-indigo-500/15 dark:text-indigo-50'
                  : 'bg-white text-slate-700 ring-slate-200 hover:ring-indigo-300 dark:bg-gray-900 dark:text-slate-200 dark:ring-slate-700',
              )}
            >
              <SubjectBadge code={subject.code} name={subject.name_en} size="sm" />
              <span className="min-w-0 flex-1 break-words">{lo ? subject.name_lo : subject.name_en}</span>
              {on && <span aria-hidden className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-indigo-600 text-white"><Check className="h-3.5 w-3.5" /></span>}
            </button>
          )
        })}
        {customItems.map(item => (
          <span key={item.custom_name} className="flex items-center gap-2.5 rounded-2xl bg-indigo-50 p-2.5 text-sm font-bold text-indigo-950 ring-2 ring-indigo-500 dark:bg-indigo-500/15 dark:text-indigo-50">
            <SubjectBadge code={null} name={item.custom_name} size="sm" />
            <span className="min-w-0 flex-1 break-words">{item.custom_name}</span>
            <button
              type="button"
              aria-label={t('subjects.remove', { name: item.custom_name })}
              onClick={() => onChange(value.filter(other => other !== item))}
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full hover:bg-indigo-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-indigo-500/30"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={custom}
          onChange={event => setCustom(event.target.value)}
          onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addCustom() } }}
          maxLength={60}
          disabled={full}
          aria-label={t('subjects.custom')}
          placeholder={t('subjects.custom')}
          className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-3 text-base placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 sm:text-sm"
        />
        <Button type="button" variant="outline" icon={<Plus className="h-4 w-4" />} onClick={addCustom} disabled={!custom.trim() || full}>
          {t('subjects.add')}
        </Button>
      </div>
      <p className={cn('mt-2 text-xs', error ? 'text-red-600 dark:text-red-400' : 'text-slate-500')}>
        {error ?? t('subjects.count', { count: value.length, max })}
      </p>
    </div>
  )
}
