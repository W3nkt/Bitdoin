import type { ReactNode } from 'react'
import { ArrowLeft, ClipboardList } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AcademyHeaderActions } from '@/components/academy/AcademyHeaderActions'
import { useAcademicCopy } from '@/lib/academic/copy'
import { cn } from '@/lib/utils'

/** Page frame for every My Scores screen, matching the other Academy pages. */
export function MyScoresShell({ subtitle, backTo = '/academy/home', children }: {
  subtitle?: string
  backTo?: string
  children: ReactNode
}) {
  const { t, lo } = useAcademicCopy()
  const navigate = useNavigate()
  return (
    <main className="min-h-screen bg-[#f7f8fb] text-slate-950 dark:bg-gray-950 dark:text-slate-100">
      <header className="sticky top-[var(--academy-banner-h,0px)] z-30 border-b border-slate-900/10 bg-white/90 backdrop-blur-xl dark:border-white/10 dark:bg-gray-950/90">
        <div className="mx-auto flex h-20 max-w-4xl items-center gap-3 px-4">
          <button
            type="button"
            onClick={() => navigate(backTo)}
            aria-label={t('shell.back')}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-slate-900/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="hidden h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-600 text-white sm:grid">
            <ClipboardList className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-black">{t('shell.title')}</h1>
            {/* Letter-spacing suits Latin caps but breaks up Lao script. */}
            <p className={cn('truncate font-bold text-indigo-700 dark:text-indigo-300', lo ? 'text-xs' : 'text-[10px] uppercase tracking-[0.18em]')}>
              {subtitle ?? t('shell.subtitle')}
            </p>
          </div>
          <AcademyHeaderActions />
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:py-10">{children}</div>
    </main>
  )
}

/** A centred message card for empty, unavailable and error states. */
export function MyScoresNotice({ icon, title, body, action }: {
  icon?: ReactNode
  title: string
  body?: string
  action?: ReactNode
}) {
  return (
    <section className="mx-auto max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-800">
      {icon && <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">{icon}</div>}
      <h2 className="text-xl font-black">{title}</h2>
      {body && <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </section>
  )
}
