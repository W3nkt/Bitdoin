import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Flag } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useReportProblem, type ProblemCategory } from '@/lib/academic/api'
import { useAcademicCopy } from '@/lib/academic/copy'
import { AcademicError } from '@/lib/academic/errors'
import { formatDate } from '@/lib/academic/format'
import { cn } from '@/lib/utils'
import { academicErrorText } from './errorText'

const CATEGORIES: ProblemCategory[] = ['guardian_link', 'ai_answer', 'account_misuse', 'other']

/**
 * "Report a problem" on every Schooling screen (PRIV-008). Safety categories
 * reach support as priority reports with a 1-business-day reply target.
 */
export function ReportProblem() {
  const { t, language } = useAcademicCopy()
  const toast = useToast()
  const location = useLocation()
  const send = useReportProblem()
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<ProblemCategory | null>(null)
  const [description, setDescription] = useState('')
  const close = () => { setOpen(false); setCategory(null); setDescription('') }
  const valid = category !== null && description.trim().length >= 5

  return (
    <>
      <div className="mt-8 flex justify-center">
        <button type="button" onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-900/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-slate-400 dark:hover:bg-white/10">
          <Flag aria-hidden className="h-3.5 w-3.5" />{t('report.link')}
        </button>
      </div>
      <Modal open={open} onClose={close} title={t('report.title')} size="md">
        <form className="grid gap-4" onSubmit={event => {
          event.preventDefault()
          if (!valid) return
          send.mutate({ category: category!, description: description.trim(), screen: location.pathname }, {
            onSuccess: result => { toast.success(t('report.done', { date: formatDate(result.first_response_due, language) })); close() },
            onError: error => toast.error(error instanceof AcademicError && error.code === 'RATE_LIMITED' ? t('report.error.limit') : academicErrorText(t, error)),
          })
        }}>
          <p className="text-sm text-slate-600 dark:text-slate-400">{t('report.body')}</p>
          <fieldset>
            <legend className="mb-2 text-sm font-black">{t('report.category')}</legend>
            <div className="grid gap-2">
              {CATEGORIES.map(value => (
                <label key={value} className={cn('flex cursor-pointer items-start gap-3 rounded-2xl px-4 py-3 text-sm ring-1 focus-within:ring-2 focus-within:ring-amber-500',
                  category === value ? 'bg-indigo-50 font-bold ring-indigo-500 dark:bg-indigo-500/10' : 'ring-slate-200 dark:ring-slate-700')}>
                  <input type="radio" name="report-category" checked={category === value} onChange={() => setCategory(value)} className="mt-0.5 h-4 w-4 shrink-0 accent-indigo-600" />
                  {t(`report.category.${value}`)}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="grid gap-1.5 text-sm font-black">
            {t('report.description')}
            <textarea rows={4} maxLength={2000} value={description} onChange={event => setDescription(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-gray-900" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{t('report.descriptionHint')}</span>
          </label>
          {/* Right padding on phones keeps Send clear of the site's floating menu button. */}
          <div className="flex justify-end gap-2 pr-16 sm:pr-0">
            <button type="button" onClick={close}
              className="rounded-full px-4 py-2.5 text-sm font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-gray-800">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={!valid || send.isPending}
              className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-black text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-50">
              {t('report.send')}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
