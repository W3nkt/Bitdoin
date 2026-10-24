import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase'
import { AUDIT_PAGE, adminKey, auditExportRows, useAuditEvents, type AuditFilters } from '@/lib/academic/adminApi'
import { toCsv } from '@/lib/academic/exportZip'
import { Empty, Field, Panel, Pill, adminErrorText, formatDateTime } from './AdminKit'

const ACTIONS = [
  ['', 'All actions'],
  ['support.', 'Support (lookup, emergency access)'],
  ['admin.', 'Role changes'],
  ['config.', 'Configuration changes'],
  ['access_denied', 'Denied access'],
  ['privacy.', 'Export and deletion'],
  ['consent.', 'Permissions'],
  ['profile.', 'Profiles'],
  ['enrolment.', 'School years'],
  ['score', 'Scores and corrections'],
] as const

const COLUMNS = ['occurred_at', 'actor_user_id', 'actor_role', 'action', 'target_type', 'target_id', 'student_profile_id', 'outcome', 'reason']
const short = (id: string | null) => (id ? id.slice(0, 8) : '—')

/** Append-only audit log, filterable; CSV export for admins (ADMIN-006). */
export function AuditAdmin({ canExport }: { canExport: boolean }) {
  const toast = useToast()
  const [filters, setFilters] = useState<AuditFilters>({ actor: '', student: '', action: '', outcome: '' })
  const [applied, setApplied] = useState(filters)
  const [page, setPage] = useState(0)
  const [exporting, setExporting] = useState(false)
  const events = useAuditEvents(applied, page)

  const actorIds = [...new Set((events.data?.events ?? []).map(event => event.actor_user_id).filter((id): id is string => !!id))]
  const actors = useQuery({
    queryKey: [...adminKey, 'audit-actors', actorIds],
    enabled: actorIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from('users').select('id,name,member_code').in('id', actorIds)
      return new Map((data ?? []).map(user => [user.id as string, `${user.name}${user.member_code ? ` · ${user.member_code}` : ''}`]))
    },
  })

  async function exportCsv() {
    setExporting(true)
    try {
      const { events: rows } = await auditExportRows(applied)
      const blob = new Blob([toCsv(rows as unknown as Record<string, unknown>[], COLUMNS)], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = Object.assign(document.createElement('a'), { href: url, download: `my-scores-audit-${new Date().toISOString().slice(0, 10)}.csv` })
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error(adminErrorText(error))
    } finally {
      setExporting(false)
    }
  }

  const total = events.data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / AUDIT_PAGE))

  return (
    <Panel
      title="Audit log"
      description="Every access, change and denial in My Scores. Entries cannot be edited or removed. Operations staff see only their own entries."
      actions={canExport && <Button size="sm" variant="outline" loading={exporting} icon={<Download className="h-4 w-4" />} onClick={() => void exportCsv()}>Export CSV</Button>}
    >
      <form className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_10rem_auto] lg:items-end"
        onSubmit={event => { event.preventDefault(); setApplied(filters); setPage(0) }}>
        <Field label="Actor (member code or user ID)"><input value={filters.actor} onChange={event => setFilters({ ...filters, actor: event.target.value })} spellCheck={false} /></Field>
        <Field label="Student profile ID"><input value={filters.student} onChange={event => setFilters({ ...filters, student: event.target.value })} spellCheck={false} /></Field>
        <Field label="Action">
          <select value={filters.action} onChange={event => setFilters({ ...filters, action: event.target.value })}>
            {ACTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <Field label="Outcome">
          <select value={filters.outcome} onChange={event => setFilters({ ...filters, outcome: event.target.value as AuditFilters['outcome'] })}>
            <option value="">Any</option><option value="success">Success</option><option value="denied">Denied</option><option value="error">Error</option>
          </select>
        </Field>
        <Button type="submit">Apply</Button>
      </form>

      {events.isPending ? <Skeleton className="h-64 w-full rounded-xl" />
        : events.isError ? <Empty>{adminErrorText(events.error)}</Empty>
        : events.data.events.length === 0 ? <Empty>No entries match.</Empty>
        : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <tr><th className="py-2 pr-4">When (Laos)</th><th className="py-2 pr-4">Actor</th><th className="py-2 pr-4">Action</th><th className="py-2 pr-4">Target</th><th className="py-2 pr-4">Student</th><th className="py-2 pr-4">Outcome</th><th className="py-2">Reason</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {events.data.events.map(event => (
                    <tr key={event.id} className="align-top">
                      <td className="whitespace-nowrap py-2 pr-4 tabular-nums">{formatDateTime(event.occurred_at)}</td>
                      <td className="py-2 pr-4"><span className="font-bold">{event.actor_role}</span><span className="block text-xs text-slate-600 dark:text-slate-400">{(event.actor_user_id && actors.data?.get(event.actor_user_id)) ?? short(event.actor_user_id)}</span></td>
                      <td className="py-2 pr-4 font-mono text-xs">{event.action}</td>
                      <td className="py-2 pr-4 text-xs">{event.target_type} <span className="font-mono text-slate-600 dark:text-slate-400" title={event.target_id ?? ''}>{short(event.target_id)}</span></td>
                      <td className="py-2 pr-4 font-mono text-xs" title={event.student_profile_id ?? ''}>{short(event.student_profile_id)}</td>
                      <td className="py-2 pr-4"><Pill tone={event.outcome === 'success' ? 'green' : event.outcome === 'denied' ? 'amber' : 'red'}>{event.outcome}</Pill></td>
                      <td className="py-2 text-xs text-slate-700 dark:text-slate-300">{event.reason ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-600 dark:text-slate-400">{total.toLocaleString('en')} entries · page {page + 1} of {pages}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" disabled={page === 0} icon={<ChevronLeft className="h-4 w-4" />} onClick={() => setPage(page - 1)}>Newer</Button>
                <Button size="sm" variant="ghost" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Older <ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </>
        )}
    </Panel>
  )
}
