import { useEffect, useState } from 'react'
import { Search, ShieldAlert, Timer } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import type { HistoryEnrolment } from '@/lib/academic/api'
import {
  reinstateGuardianLink, startBreakGlass, supportGuardianLinks, supportLookup, suspendGuardianLink, viewStudentScores, type SupportGuardianLink, type SupportLookup,
} from '@/lib/academic/adminApi'
import { AcademicError } from '@/lib/academic/errors'
import { plainNumber } from '@/lib/academic/scoreInput'
import { Empty, Field, Panel, Pill, ReasonDialog, adminErrorText, formatDateTime } from './AdminKit'

/**
 * Support lookup without scores; scores only through a 30-minute,
 * reason-logged emergency window (ADMIN-005).
 */
export function SupportAdmin({ isAdmin = false }: { isAdmin?: boolean }) {
  const toast = useToast()
  const [ref, setRef] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<SupportLookup | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [asking, setAsking] = useState(false)
  const [scores, setScores] = useState<{ expires_at: string; enrolments: HistoryEnrolment[] } | null>(null)
  const now = useNow(scores ? 1000 : null)
  const expired = scores ? new Date(scores.expires_at).getTime() <= now : false

  async function lookup(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setNotFound(false)
    setResult(null)
    setScores(null)
    try {
      setResult(await supportLookup(ref))
    } catch (error) {
      if (error instanceof AcademicError && error.code === 'NOT_FOUND') setNotFound(true)
      else toast.error(adminErrorText(error))
    } finally {
      setBusy(false)
    }
  }

  async function openScores(reason: string) {
    if (!result) return
    setBusy(true)
    try {
      await startBreakGlass(result.profile.id, reason)
      setScores(await viewStudentScores(result.profile.id))
      setAsking(false)
    } catch (error) {
      toast.error(adminErrorText(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-6">
      <Panel title="Support lookup" description="Find a student's Schooling account by Bitdoin member code (e.g. BA-ACA-DAN9XY) or user ID. Scores are not shown. Every lookup is audit-logged.">
        <form onSubmit={lookup} className="flex flex-wrap items-end gap-3">
          <Field label="Member code or user ID" className="min-w-[16rem] flex-1">
            <input value={ref} onChange={event => setRef(event.target.value)} autoComplete="off" spellCheck={false} />
          </Field>
          <Button type="submit" loading={busy && !asking} disabled={!ref.trim()} icon={<Search className="h-4 w-4" />}>Look up</Button>
        </form>
        {notFound && <div className="mt-4"><Empty>No Schooling account for that reference.</Empty></div>}
      </Panel>

      {result && (
        <Panel
          title={`Member ${result.user.member_code ?? result.user.id}`}
          description={`Profile ${result.profile.id}`}
          actions={!scores && <Button size="sm" variant="danger" icon={<ShieldAlert className="h-4 w-4" />} onClick={() => setAsking(true)}>Emergency access to scores</Button>}
        >
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            <Item label="Status"><Pill tone={result.profile.status === 'active' ? 'green' : 'amber'}>{result.profile.status.replace('_', ' ')}</Pill></Item>
            <Item label="Consent">{result.profile.consent_state}</Item>
            <Item label="Age band">{result.profile.age_band.replace('_', '–').replace('–plus', '+')}</Item>
            <Item label="Joined">{formatDateTime(result.profile.created_at)}</Item>
            <Item label="Deletion">{result.profile.deletion_requested_at ? `${result.profile.deletion_scope} · requested ${formatDateTime(result.profile.deletion_requested_at)}` : 'None'}</Item>
            <Item label="Account role">{result.user.role}</Item>
          </dl>

          <h3 className="mt-6 text-sm font-black">School years</h3>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <tr><th className="py-2 pr-4">Year</th><th className="py-2 pr-4">Grade</th><th className="py-2 pr-4">State</th><th className="py-2 pr-4">School</th><th className="py-2 pr-4">Months saved</th><th className="py-2">Drafts</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {result.enrolments.map(enrolment => (
                  <tr key={enrolment.id}>
                    <td className="py-2 pr-4 font-bold">{enrolment.academic_year}</td>
                    <td className="py-2 pr-4">{enrolment.grade}</td>
                    <td className="py-2 pr-4">{enrolment.state}{enrolment.closed_reason ? ` (${enrolment.closed_reason})` : ''}</td>
                    <td className="py-2 pr-4">{enrolment.school_verification === 'verified' ? 'Catalogue' : 'Typed by student'}</td>
                    <td className="py-2 pr-4 tabular-nums">{enrolment.submitted_periods}</td>
                    <td className="py-2 tabular-nums">{enrolment.draft_periods}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="mt-6 text-sm font-black">Permissions</h3>
          <ul className="mt-2 grid gap-1 text-sm">
            {result.consents.map((consent, index) => (
              <li key={index}>
                <span className="font-bold">{consent.purpose}</span> · notice {consent.notice_version} · given {formatDateTime(consent.granted_at)}
                {consent.withdrawn_at && <span className="text-amber-800 dark:text-amber-300"> · withdrawn {formatDateTime(consent.withdrawn_at)}</span>}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {result && <GuardianLinksPanel key={result.profile.id} profileId={result.profile.id} isAdmin={isAdmin} />}

      {scores && (
        <Panel
          title="Scores (emergency access)"
          description="Shown because you gave a reason. Closes automatically; reopening needs a new reason."
          actions={<Pill tone={expired ? 'gray' : 'red'}><Timer className="mr-1 h-3.5 w-3.5" />{expired ? 'Closed' : `Closes in ${countdown(scores.expires_at, now)}`}</Pill>}
        >
          {expired ? <Empty>The 30-minute window has closed.</Empty> : <ScoresView enrolments={scores.enrolments} />}
          {expired && <Button className="mt-3" size="sm" variant="ghost" onClick={() => setScores(null)}>Hide</Button>}
        </Panel>
      )}

      <ReasonDialog open={asking} title="Emergency access to scores" minLength={10} danger busy={busy} confirmLabel="Open for 30 minutes"
        body={<p>Only open scores when a ticket cannot be solved without them. Your name, the student and your reason are saved in the audit log, and admins review these.</p>}
        onCancel={() => setAsking(false)} onConfirm={reason => void openScores(reason)} />
    </div>
  )
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><dt className="text-xs font-black text-slate-500 dark:text-slate-400">{label}</dt><dd className="mt-0.5">{children}</dd></div>
}

function ScoresView({ enrolments }: { enrolments: HistoryEnrolment[] }) {
  if (!enrolments.length) return <Empty>No scores recorded.</Empty>
  return (
    <div className="grid gap-5">
      {enrolments.map(enrolment => (
        <section key={enrolment.enrolment_id}>
          <h3 className="text-sm font-black">{enrolment.academic_year} · {enrolment.grade.label_en}</h3>
          {(enrolment.terms ?? []).flatMap(term => term.periods).map(period => (
            <div key={period.id} className="mt-2 overflow-x-auto">
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">{period.label_en} · {period.entry.state}</p>
              <table className="mt-1 w-full min-w-[360px] text-left text-sm">
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {period.lines.map(line => (
                    <tr key={line.subject_enrolment_id}>
                      <td className="py-1 pr-4">{line.name_en}</td>
                      <td className="py-1 pr-4 tabular-nums">{line.line?.value !== null && line.line?.value !== undefined ? plainNumber(line.line.value) : '—'}</td>
                      <td className="py-1 text-xs text-slate-600 dark:text-slate-400">{line.line?.status ?? 'not entered'}{line.line?.edited ? ' · edited' : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}

function useNow(intervalMs: number | null) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!intervalMs) return
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

function countdown(expiresAt: string, now: number) {
  const seconds = Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

const LINK_REASONS: Record<string, string> = { not_guardian: 'Not the parent or guardian', safety: 'Safety concern', student_request: 'The student asked', other: 'Something else' }

/** PARENT-008: support suspends a disputed link at once; only an admin reinstates it after review. */
function GuardianLinksPanel({ profileId, isAdmin }: { profileId: string; isAdmin: boolean }) {
  const toast = useToast()
  const [links, setLinks] = useState<SupportGuardianLink[] | null>(null)
  const [acting, setActing] = useState<{ link: SupportGuardianLink; action: 'suspend' | 'reinstate' } | null>(null)
  const [reason, setReason] = useState('not_guardian')
  const [busy, setBusy] = useState(false)
  const load = () => supportGuardianLinks(profileId).then(result => setLinks(result ?? []), error => toast.error(adminErrorText(error)))
  useEffect(() => { void load() }, [profileId])

  async function act(note: string) {
    if (!acting) return
    setBusy(true)
    try {
      if (acting.action === 'suspend') await suspendGuardianLink(acting.link.id, reason, note)
      else await reinstateGuardianLink(acting.link.id, note)
      toast.success(acting.action === 'suspend' ? 'Link suspended. The guardian has lost access.' : 'Link reinstated.')
      setActing(null)
      await load()
    } catch (error) {
      toast.error(adminErrorText(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel title="Guardian links" description="Suspending stops the guardian's access at once. Only an admin can reinstate a link, after review. Every action is audit-logged.">
      {links === null ? <Empty>Loading…</Empty> : links.length === 0 ? <Empty>No guardian links.</Empty> : (
        <ul className="grid gap-3">
          {links.map(link => (
            <li key={link.id} className="rounded-2xl border border-slate-200 p-4 text-sm dark:border-slate-700">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold">{link.guardian_name ?? 'Unknown'}</span>
                <span className="text-slate-600 dark:text-slate-400">{link.relationship}{link.purpose === 'consent' ? ' · gave consent' : ''}</span>
                <Pill tone={link.status === 'active' ? 'green' : link.status === 'suspended' ? 'red' : 'gray'}>{link.status.replace('_', ' ')}</Pill>
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Linked {formatDateTime(link.declared_at)}{link.confirmed_at ? ` · confirmed ${formatDateTime(link.confirmed_at)}` : ''}{link.removed_at ? ` · removed by ${link.removed_by} ${formatDateTime(link.removed_at)}` : ''}</p>
              {link.cases.map((c, index) => <p key={index} className="mt-1 text-xs">{c.action === 'suspend' ? 'Suspended' : 'Reinstated'} · {LINK_REASONS[c.reason] ?? c.reason} · {c.note} · {c.by ?? '—'}, {formatDateTime(c.at)}</p>)}
              <div className="mt-2 flex gap-2">
                {['pending_student', 'active', 'paused'].includes(link.status) && <Button size="sm" variant="danger" onClick={() => setActing({ link, action: 'suspend' })}>Suspend</Button>}
                {link.status === 'suspended' && isAdmin && <Button size="sm" variant="outline" onClick={() => setActing({ link, action: 'reinstate' })}>Reinstate</Button>}
              </div>
            </li>
          ))}
        </ul>
      )}
      <ReasonDialog open={acting !== null} busy={busy} danger={acting?.action === 'suspend'}
        title={acting?.action === 'suspend' ? 'Suspend this guardian link?' : 'Reinstate this link?'}
        body={acting?.action === 'suspend' ? (
          <Field label="Reason">
            <select value={reason} onChange={event => setReason(event.target.value)}>
              {Object.entries(LINK_REASONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
        ) : <p>Only reinstate after reviewing the case with the student.</p>}
        confirmLabel={acting?.action === 'suspend' ? 'Suspend' : 'Reinstate'}
        onCancel={() => setActing(null)} onConfirm={note => void act(note)} />
    </Panel>
  )
}
