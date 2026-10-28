import type { ReactNode } from 'react'
import { AcademyPageHeader, AcademyPageTitle } from '@/components/academy/AcademyPageHeader'
import { academyNavigation } from '@/components/academy/academyMenuItems'
import { useAcademicCopy } from '@/lib/academic/copy'
import { InboxButton } from './Inbox'
import { ReportProblem } from './ReportProblem'

const schooling = academyNavigation.find(item => item.id === 'scores')!

/** Page frame for every My Scores screen, using the Academy Home header. */
export function MyScoresShell({ subtitle, backTo, inbox = false, children }: {
  subtitle?: string
  backTo?: string
  /** Show the reminders bell (students with a profile). */
  inbox?: boolean
  children: ReactNode
}) {
  const { t } = useAcademicCopy()
  const title = t('shell.title')
  const detail = subtitle ?? t('shell.subtitle')
  return (
    <main className="min-h-screen bg-[#f7f8fb] text-slate-950 dark:bg-gray-950 dark:text-slate-100">
      <AcademyPageHeader title={title} detail={detail}
        back={backTo ? { to: backTo, label: t('common.back') } : undefined}
        actions={inbox && <InboxButton />} />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
        <div className="mb-6 md:hidden">
          <AcademyPageTitle icon={schooling.icon} color={schooling.color} title={title} detail={detail} />
        </div>
        {children}
        <ReportProblem />
      </div>
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
