import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Brain, FileText, Loader2 } from 'lucide-react'
import { useAcademicCopy } from '@/lib/academic/copy'
import { fetchMonthlySummary, useCoachStatus } from '@/lib/academic/api'

const button = 'inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-black focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500'

/**
 * The Coach in Schooling (P3-AI #53): ask about your own scores (AI-001) and
 * a monthly summary checked against the snapshot (AI-009). Hidden until the
 * academic mode is switched on.
 */
export function CoachCard() {
  const { t, language } = useAcademicCopy()
  const status = useCoachStatus()
  const [summary, setSummary] = useState<{ text: string; source: 'ai' | 'template' } | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  if (!status.data?.available) return null
  const quota = status.data.quota

  const showSummary = async () => {
    setLoading(true)
    setFailed(false)
    try {
      const result = await fetchMonthlySummary(language === 'lo' ? 'lo' : 'en')
      setSummary({ text: result.summary, source: result.source })
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-800 sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-black"><Brain aria-hidden className="h-5 w-5" />{t('coach.title')}</h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('coach.body')}</p>
      {status.data.busy && <p role="status" className="mt-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">{t('coach.busy')}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Link to="/academy/coach?mode=academic" className={`${button} bg-indigo-600 text-white hover:bg-indigo-700`}>
          <Brain aria-hidden className="h-4 w-4" />{t('coach.open')}
        </Link>
        <button type="button" onClick={() => void showSummary()} disabled={loading}
          className={`${button} text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-60 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-gray-800`}>
          {loading ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <FileText aria-hidden className="h-4 w-4" />}{t('coach.summary.show')}
        </button>
      </div>
      {quota && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t('coach.remaining', { remaining: quota.remaining, limit: quota.limit })}</p>}
      {failed && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{t('coach.summary.error')}</p>}
      {summary && (
        <div className="mt-3 rounded-2xl bg-slate-50 p-4 dark:bg-gray-800/60">
          <h3 className="text-sm font-black">{t('coach.summary')}</h3>
          <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-800 dark:text-slate-200">{summary.text}</p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t(summary.source === 'ai' ? 'coach.summary.ai' : 'coach.summary.template')}</p>
        </div>
      )}
    </section>
  )
}

/** On a subject page: ask the Coach about that subject. */
export function AskCoachLink({ subject }: { subject: string }) {
  const { t } = useAcademicCopy()
  const status = useCoachStatus()
  if (!status.data?.available) return null
  return (
    <Link to={`/academy/coach?mode=academic&ask=${encodeURIComponent(t('coach.askSubjectQuestion', { subject }))}`}
      className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-black text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300 dark:ring-indigo-500/40">
      <Brain aria-hidden className="h-4 w-4" />{t('coach.askSubject', { subject })}
    </Link>
  )
}
