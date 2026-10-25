import { useState } from 'react'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useProblemReports, useUpdateProblemReport, type ProblemReport } from '@/lib/academic/adminApi'
import { cn } from '@/lib/utils'
import { Empty, Panel, Pill, ReasonDialog, adminErrorText, formatDateTime } from './AdminKit'

const CATEGORY: Record<ProblemReport['category'], string> = {
  guardian_link: 'Wrong guardian link',
  ai_answer: 'AI answer',
  account_misuse: 'Account misuse or impersonation',
  other: 'Something else',
}
const STATUS: Record<ProblemReport['status'], { label: string; tone: 'amber' | 'blue' | 'green' }> = {
  open: { label: 'Open', tone: 'amber' },
  in_progress: { label: 'In progress', tone: 'blue' },
  resolved: { label: 'Resolved', tone: 'green' },
}
type Filter = 'active' | 'resolved' | 'all'

/**
 * "Report a problem" queue (PRIV-008, migration 133). Safety reports are
 * priority with a first response due within 1 business day; each also sends
 * an alert e-mail. Contact the reporter through their member code (Support tab).
 */
export function ReportsAdmin() {
  const toast = useToast()
  const [filter, setFilter] = useState<Filter>('active')
  const reports = useProblemReports(filter === 'active' ? undefined : filter)
  const update = useUpdateProblemReport()
  const [resolving, setResolving] = useState<ProblemReport | null>(null)
  const onError = (error: unknown) => toast.error(adminErrorText(error))

  return (
    <Panel title="Problem reports"
      description="Reports students send from any Schooling screen. Priority reports (guardian link, AI answer, account misuse) need a first response within 1 business day, others within 3. Moving a report to In progress records the first response.">
      <div className="mb-4 flex flex-wrap gap-2">
        {(['active', 'resolved', 'all'] as const).map(value => (
          <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}
            className={cn('rounded-full px-3 py-1.5 text-xs font-black focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
              filter === value ? 'bg-slate-950 text-white dark:bg-primary-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300')}>
            {value === 'active' ? 'Open and in progress' : value === 'resolved' ? 'Resolved' : 'All'}
          </button>
        ))}
      </div>
      {reports.isPending ? <Skeleton className="h-32 w-full rounded-2xl" /> : reports.isError ? <Empty>{adminErrorText(reports.error)}</Empty>
        : reports.data.length === 0 ? <Empty>No reports here.</Empty> : (
          <ul className="grid gap-3">
            {reports.data.map(report => (
              <li key={report.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {report.priority === 'priority' ? <Pill tone="red">Priority</Pill> : <Pill>Normal</Pill>}
                  <Pill tone={STATUS[report.status].tone}>{STATUS[report.status].label}</Pill>
                  {report.overdue && <Pill tone="red">Overdue</Pill>}
                  <span className="font-bold">{CATEGORY[report.category]}</span>
                  <span className="text-slate-600 dark:text-slate-400">from {report.reporter_member_code ?? 'unknown'} · {formatDateTime(report.created_at)}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm">{report.description}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {report.screen && <>Screen: <code>{report.screen}</code> · </>}
                  First response due {formatDateTime(report.first_response_due)}
                  {report.responded_at && <> · answered {formatDateTime(report.responded_at)}{report.handled_by_name && ` by ${report.handled_by_name}`}</>}
                </p>
                {report.resolution_note && <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200">Resolved: {report.resolution_note}</p>}
                {report.status !== 'resolved' && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {report.status === 'open' && (
                      <Button size="sm" variant="outline" loading={update.isPending && update.variables?.id === report.id}
                        onClick={() => update.mutate({ id: report.id, status: 'in_progress' }, { onSuccess: () => toast.success('Marked in progress.'), onError })}>Start</Button>
                    )}
                    <Button size="sm" onClick={() => setResolving(report)}>Resolve</Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      <ReasonDialog open={resolving !== null} busy={update.isPending} title="Resolve this report?"
        body="Say what was done. The note is kept with the report and in the audit log."
        confirmLabel="Resolve" onCancel={() => setResolving(null)}
        onConfirm={note => resolving && update.mutate({ id: resolving.id, status: 'resolved', note }, {
          onSuccess: () => { setResolving(null); toast.success('Report resolved.') },
          onError,
        })} />
    </Panel>
  )
}
