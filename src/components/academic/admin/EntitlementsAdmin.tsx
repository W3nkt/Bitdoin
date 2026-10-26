import { useState } from 'react'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { grantEntitlement, lookupMemberEntitlements, revokeEntitlement, type EntitlementGrant, type GrantInput, type MemberEntitlements } from '@/lib/academic/adminApi'
import { AcademicError, toAcademicError } from '@/lib/academic/errors'
import { Empty, Field, Panel, Pill, ReasonDialog, adminErrorText, formatDateTime } from './AdminKit'

// Entitlements (BILLING-007, migration 141): Financial Administrators and
// admins look a member up by code, see their Academy plan and what it gives in
// Schooling, and grant or revoke Premium or a single feature with a reason
// code. A confirmed transfer needs its payment reference. All audited.

const FEATURES: Array<[string, string]> = [
  ['premium', 'Academy Premium (every premium feature and quota)'],
  ['advanced_analysis', 'Full analysis and all suggestions'],
  ['diagnostic_unlimited', 'Unlimited diagnostic re-tests'],
  ['ocr_upload', 'Score-book scans (premium quota)'],
  ['coach_academic', 'AI Coach academic mode (premium quota)'],
  ['ai_monthly_summary', 'AI monthly summary'],
  ['planner_full', 'Full study planner'],
  ['parent_reports', 'Monthly parent reports'],
  ['career_report', 'Detailed career report'],
  ['mock_exams', 'Mock exams'],
]
const REASONS: Array<[string, string]> = [
  ['bank_transfer_confirmed', 'Bank transfer confirmed'], ['trial', 'Trial'], ['one_time_purchase', 'One-time purchase'], ['pilot', 'Pilot'],
  ['school_partnership', 'School partnership'], ['support_goodwill', 'Support goodwill'], ['correction', 'Correction'], ['other', 'Other'],
]
const SOURCES: Array<[GrantInput['source'], string]> = [['manual_grant', 'Manual grant'], ['trial', 'Trial'], ['one_time_purchase', 'One-time purchase']]
const label = (list: Array<[string, string]>, code: string) => list.find(([value]) => value === code)?.[1] ?? code
const inDays = (days: number) => new Date(Date.now() + days * 86400_000).toISOString().slice(0, 10)

export function EntitlementsAdmin() {
  const toast = useToast()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [member, setMember] = useState<MemberEntitlements | null>(null)
  const [notFound, setNotFound] = useState(false)

  async function lookup(memberCode = code) {
    setBusy(true)
    setNotFound(false)
    try {
      setMember(await lookupMemberEntitlements(memberCode))
    } catch (error) {
      setMember(null)
      if (error instanceof AcademicError && error.code === 'NOT_FOUND') setNotFound(true)
      else toast.error(adminErrorText(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-6">
      <Panel title="Entitlements" description="Find a member by Bitdoin member code to see their Academy plan and what it gives in Schooling, and to grant or revoke access. Every lookup and change is audit-logged.">
        <form onSubmit={event => { event.preventDefault(); void lookup() }} className="flex flex-wrap items-end gap-3">
          <Field label="Member code" className="min-w-[14rem] flex-1">
            <input value={code} onChange={event => setCode(event.target.value)} placeholder="DAN9XY" autoComplete="off" />
          </Field>
          <Button type="submit" icon={<Search className="h-4 w-4" />} loading={busy} disabled={!code.trim()}>Find</Button>
        </form>
        {notFound && <p role="alert" className="mt-3 text-sm font-bold text-red-700 dark:text-red-300">No member with that code.</p>}
      </Panel>
      {member && <MemberView member={member} onChanged={() => void lookup(member.user.member_code ?? code)} />}
    </div>
  )
}

function MemberView({ member, onChanged }: { member: MemberEntitlements; onChanged: () => void }) {
  const toast = useToast()
  const [revoking, setRevoking] = useState<EntitlementGrant | null>(null)
  const [busy, setBusy] = useState(false)
  const plan = member.entitlements
  const features = Object.entries(plan.features)

  async function revoke(reason: string) {
    if (!revoking) return
    setBusy(true)
    try {
      await revokeEntitlement(revoking.id, reason)
      toast.success('Grant revoked.')
      setRevoking(null)
      onChanged()
    } catch (error) {
      toast.error(adminErrorText(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Panel title={`${member.user.name} · ${member.user.member_code ?? ''}`}
        description={plan.premium.active ? `Premium (${plan.premium.source === 'manual_grant' ? 'manual grant' : 'Academy membership'})${plan.premium.until ? ` until ${formatDateTime(plan.premium.until)}` : ''}` : 'Free'}
        actions={<Pill tone={plan.enforced ? 'amber' : 'gray'}>{plan.enforced ? 'Locks on' : 'Locks off: all features open'}</Pill>}>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-black">Academy memberships</h3>
            {member.subscriptions.length === 0 ? <Empty>No memberships.</Empty> : (
              <ul className="mt-2 divide-y divide-slate-100 text-sm dark:divide-slate-800">
                {member.subscriptions.map((s, i) => (
                  <li key={i} className="flex flex-wrap justify-between gap-2 py-2">
                    <span className="font-bold">{s.plan}{s.price_lak > 0 ? ` · ${s.price_lak.toLocaleString('en')} LAK` : ''}</span>
                    <span className="text-slate-600 dark:text-slate-400">{s.status}{s.ends_at ? ` · ends ${formatDateTime(s.ends_at)}` : ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="text-sm font-black">In Schooling now</h3>
            <ul className="mt-2 divide-y divide-slate-100 text-sm dark:divide-slate-800">
              {features.map(([feature, value]) => (
                <li key={feature} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>{label(FEATURES, feature).replace(/ \(.*\)$/, '')}</span>
                  <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    {value?.quota && <span className="tabular-nums">{value.quota.used}/{value.quota.limit} this month</span>}
                    <Pill tone={value?.enabled ? 'green' : 'gray'}>{value?.enabled ? (value.source ?? 'on') : 'locked'}</Pill>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Panel>

      <GrantForm userId={member.user.id} onGranted={onChanged} />

      <Panel title="Grants" description="Newest first. Revoking ends access at once; the record stays.">
        {member.grants.length === 0 ? <Empty>No grants yet.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <tr>{['Feature', 'Reason', 'Reference', 'Period', 'By', 'Status', ''].map(h => <th key={h} className="py-2 pr-4">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {member.grants.map(g => (
                  <tr key={g.id}>
                    <td className="py-2 pr-4 font-bold">{label(FEATURES, g.feature_code)}<span className="block text-xs font-normal text-slate-500">{label(SOURCES, g.source)}</span></td>
                    <td className="py-2 pr-4">{label(REASONS, g.reason_code)}{g.note && <span className="block text-xs text-slate-500">{g.note}</span>}</td>
                    <td className="py-2 pr-4 tabular-nums">{g.reference ?? '—'}{g.amount_lak !== null && <span className="block text-xs text-slate-500">{g.amount_lak.toLocaleString('en')} LAK</span>}</td>
                    <td className="py-2 pr-4">{formatDateTime(g.starts_at)} – {formatDateTime(g.ends_at)}</td>
                    <td className="py-2 pr-4">{g.granted_by ?? '—'}</td>
                    <td className="py-2 pr-4">
                      {g.revoked_at ? <><Pill tone="red">Revoked</Pill><span className="block text-xs text-slate-500">{g.revoked_by}: {g.revoke_reason}</span></>
                        : <Pill tone={g.active ? 'green' : 'gray'}>{g.active ? 'Active' : 'Ended'}</Pill>}
                    </td>
                    <td className="py-2">{!g.revoked_at && g.active && <Button size="sm" variant="ghost" onClick={() => setRevoking(g)}>Revoke</Button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <ReasonDialog open={!!revoking} title="Revoke grant" danger busy={busy} confirmLabel="Revoke"
        body={revoking ? `${label(FEATURES, revoking.feature_code)} for ${member.user.name} ends now.` : ''}
        onCancel={() => setRevoking(null)} onConfirm={reason => void revoke(reason)} />
    </>
  )
}

function GrantForm({ userId, onGranted }: { userId: string; onGranted: () => void }) {
  const toast = useToast()
  const [feature, setFeature] = useState('premium')
  const [source, setSource] = useState<GrantInput['source']>('manual_grant')
  const [reason, setReason] = useState('bank_transfer_confirmed')
  const [ends, setEnds] = useState(inDays(30))
  const [reference, setReference] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const needsReference = reason === 'bank_transfer_confirmed'

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setFieldError(null)
    try {
      // The end is the end of the chosen day, Vientiane time.
      await grantEntitlement(userId, {
        feature_code: feature, source, reason_code: reason, ends_at: `${ends}T23:59:59+07:00`,
        reference: reference.trim() || undefined, amount_lak: amount ? Number(amount) : undefined, note: note.trim() || undefined,
      })
      toast.success('Granted. It starts now.')
      setReference('')
      setAmount('')
      setNote('')
      onGranted()
    } catch (error) {
      const failure = toAcademicError(error)
      const field = (failure.details as { field?: string } | undefined)?.field
      if (field) setFieldError(field)
      toast.error(adminErrorText(error))
    } finally {
      setBusy(false)
    }
  }

  const hint = (field: string, text?: string) => (fieldError === field ? 'Check this field.' : text)
  return (
    <Panel title="Grant access" description="Starts at confirmation time. A confirmed bank transfer needs its payment reference.">
      <form onSubmit={event => void submit(event)} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="What" hint={hint('feature_code')}>
          <select value={feature} onChange={event => setFeature(event.target.value)}>{FEATURES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </Field>
        <Field label="Source">
          <select value={source} onChange={event => setSource(event.target.value as GrantInput['source'])}>{SOURCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </Field>
        <Field label="Reason" hint={hint('reason_code')}>
          <select value={reason} onChange={event => setReason(event.target.value)}>{REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </Field>
        <Field label="Ends on" hint={hint('ends_at', 'At most two years from now.')}>
          <input type="date" value={ends} min={inDays(1)} max={inDays(730)} onChange={event => setEnds(event.target.value)} required />
        </Field>
        <Field label={needsReference ? 'Payment reference (required)' : 'Payment or order reference'} hint={hint('reference')}>
          <input value={reference} maxLength={80} onChange={event => setReference(event.target.value)} required={needsReference} />
        </Field>
        <Field label="Amount (LAK)">
          <input type="number" min={0} step={1000} value={amount} onChange={event => setAmount(event.target.value)} />
        </Field>
        <Field label="Note" className="sm:col-span-2">
          <input value={note} maxLength={200} onChange={event => setNote(event.target.value)} />
        </Field>
        <div className="flex items-end">
          <Button type="submit" loading={busy} fullWidth>Grant</Button>
        </div>
      </form>
    </Panel>
  )
}
