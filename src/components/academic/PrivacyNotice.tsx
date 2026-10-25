import { useId, useState } from 'react'
import { ChevronDown, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAcademicCopy, type AcademicCopyKey } from '@/lib/academic/copy'
import { cn } from '@/lib/utils'

const SUMMARY: AcademicCopyKey[] = ['notice.what', 'notice.why', 'notice.stats', 'notice.who', 'notice.choices', 'notice.selfReported']

/**
 * Layered privacy notice (PRIV-001): a short summary, the full text on
 * demand, and an explicit agreement before anything is stored.
 */
export function PrivacyNotice({ version, title, intro, busy, onAccept }: {
  version: string
  title?: string
  intro?: string
  busy?: boolean
  onAccept: () => void
}) {
  const { t } = useAcademicCopy()
  const [agreed, setAgreed] = useState(false)
  const [open, setOpen] = useState(false)
  const checkboxId = useId()

  return (
    <section className="mx-auto max-w-2xl rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-800 sm:p-8">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
          <ShieldCheck className="h-6 w-6" />
        </span>
        <h2 className="text-xl font-black sm:text-2xl">{title ?? t('notice.title')}</h2>
      </div>
      {intro && <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm leading-relaxed text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">{intro}</p>}

      <ul className="mt-5 space-y-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        {SUMMARY.map(key => <li key={key}>{t(key)}</li>)}
      </ul>

      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        className="mt-4 inline-flex items-center gap-1 text-sm font-black text-indigo-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300"
      >
        {t('notice.more')}
        <ChevronDown className={cn('h-4 w-4 transition', open && 'rotate-180')} />
      </button>
      {open && <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{t('notice.full')}</p>}
      <p className="mt-4 text-xs text-slate-500 dark:text-slate-500">{t('notice.version', { version })}</p>

      <label htmlFor={checkboxId} className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
        <input
          id={checkboxId}
          type="checkbox"
          checked={agreed}
          onChange={event => setAgreed(event.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span className="text-sm font-bold">{t('notice.agree')}</span>
      </label>

      <Button className="mt-6" fullWidth size="lg" disabled={!agreed} loading={busy} onClick={onAccept}>
        {t('notice.continue')}
      </Button>
    </section>
  )
}
