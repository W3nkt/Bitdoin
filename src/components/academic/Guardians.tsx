import { useEffect, useState } from 'react'
import { Copy, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useAcademicCopy, type AcademicCopyKey } from '@/lib/academic/copy'
import {
  useConfirmGuardianLink, useCreateGuardianInvite, useGuardianLinks, useKeepGuardianLink, useRemoveGuardianLink, useRevokeGuardianInvite, useSetGuardianScopes,
  type GuardianLink, type GuardianScope, type GuardianScopes, type NewGuardianInvite,
} from '@/lib/academic/api'
import { useAcademicSession } from '@/lib/academic/session'
import { formatDate } from '@/lib/academic/format'
import { PrivacyCard } from './Privacy'
import { academicErrorText } from './errorText'
import { CardTitle } from './visuals'

// Parents and guardians (P3-PAR #52: PARENT-001..004, PARENT-007, PARENT-009).
// The student invites with a one-time code, confirms the guardian's name and
// chooses what they see. Coach chats and photos are never a choice.

const SCOPES: GuardianScope[] = ['scores', 'plan', 'careers', 'goals_text']
const familyLink = (code: string) => `${window.location.origin}/academy/family?code=${code}`

function NewCode({ invite }: { invite: NewGuardianInvite }) {
  const { t, language } = useAcademicCopy()
  const toast = useToast()
  return (
    <div role="status" className="mt-3 rounded-2xl bg-indigo-50 p-4 dark:bg-indigo-500/10">
      <p className="text-sm font-black">{t('guardians.codeLabel')}</p>
      <p className="font-mono text-3xl font-black tracking-[0.2em]" aria-label={t('guardians.code', { code: invite.code.split('').join(' ') })}>{invite.code}</p>
      <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{t('guardians.codeHelp', { date: formatDate(invite.expires_at, language) })}</p>
      <Button className="mt-2" size="sm" variant="outline" icon={<Copy className="h-4 w-4" />}
        onClick={() => navigator.clipboard?.writeText(familyLink(invite.code)).then(() => toast.success(t('guardians.linkCopied')), () => undefined)}>
        {t('guardians.copyLink')}
      </Button>
    </div>
  )
}

function ScopeSwitches({ value, onChange, disabled }: { value: GuardianScopes; onChange: (scope: GuardianScope, on: boolean) => void; disabled?: boolean }) {
  const { t } = useAcademicCopy()
  return (
    <fieldset className="mt-2" disabled={disabled}>
      <legend className="text-sm font-black">{t('guardians.sees')}</legend>
      <div className="mt-1 grid gap-1.5 text-sm">
        {SCOPES.map(scope => (
          <label key={scope} className="flex items-center gap-2">
            <input type="checkbox" checked={value[scope]} onChange={event => onChange(scope, event.target.checked)} />
            {t(`guardians.scope.${scope}` as AcademicCopyKey)}
          </label>
        ))}
      </div>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{t('guardians.neverShared')}</p>
    </fieldset>
  )
}

function LinkRow({ link }: { link: GuardianLink }) {
  const { t, language } = useAcademicCopy()
  const toast = useToast()
  const confirm = useConfirmGuardianLink()
  const scopes = useSetGuardianScopes()
  const remove = useRemoveGuardianLink()
  const keep = useKeepGuardianLink()
  const [removing, setRemoving] = useState(false)
  // Switches move at once; the server's answer replaces them (and a failure puts them back).
  const [shown, setShown] = useState(link.scopes)
  useEffect(() => setShown(link.scopes), [link.scopes])
  const onError = (error: unknown) => toast.error(academicErrorText(t, error))
  const name = link.guardian_name ?? '—'
  const relationship = t(`guardians.relationship.${link.relationship}` as AcademicCopyKey)

  if (link.status === 'pending_student') {
    return (
      <li className="py-3">
        <p className="font-bold">{t('guardians.confirmTitle', { name, relationship })}</p>
        <p className="text-sm text-slate-600 dark:text-slate-400">{t('guardians.confirmBody', { date: formatDate(link.confirm_by, language) })}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button size="sm" loading={confirm.isPending && confirm.variables?.confirm} onClick={() => confirm.mutate({ id: link.id, confirm: true }, { onError })}>{t('guardians.confirm')}</Button>
          <Button size="sm" variant="ghost" loading={confirm.isPending && !confirm.variables?.confirm} onClick={() => confirm.mutate({ id: link.id, confirm: false }, { onError })}>{t('guardians.decline')}</Button>
        </div>
      </li>
    )
  }
  return (
    <li className="py-3">
      <p className="flex flex-wrap items-center gap-2 font-bold">
        {t('guardians.linked', { name, relationship })}
        {(link.status === 'paused' || link.status === 'suspended') && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">{t(`guardians.status.${link.status}` as AcademicCopyKey)}</span>
        )}
      </p>
      {(link.reconfirm_by || link.status === 'paused') && (
        <div className="mt-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-500/10 dark:text-amber-100">
          <p>{t('guardians.reconfirm', { name, date: formatDate(link.reconfirm_by ?? link.confirm_by, language) })}</p>
          <Button className="mt-2" size="sm" variant="outline" loading={keep.isPending} onClick={() => keep.mutate(link.id, { onError })}>{t('guardians.keep')}</Button>
        </div>
      )}
      <ScopeSwitches value={shown} disabled={link.status === 'suspended'}
        onChange={(scope, on) => {
          setShown({ ...shown, [scope]: on })
          scopes.mutate({ id: link.id, scopes: { [scope]: on } }, { onSuccess: () => toast.success(t('guardians.saved')), onError: error => { setShown(link.scopes); onError(error) } })
        }} />
      {removing ? (
        <div role="alertdialog" aria-labelledby={`remove-${link.id}`} className="mt-3 rounded-2xl bg-amber-50 p-3 dark:bg-amber-500/10">
          <p id={`remove-${link.id}`} className="font-black">{t('guardians.removeTitle', { name })}</p>
          <p className="mt-1 text-sm">{t('guardians.removeBody')}</p>
          <div className="mt-2 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setRemoving(false)}>{t('common.cancel')}</Button>
            <Button size="sm" variant="danger" loading={remove.isPending}
              onClick={() => remove.mutate(link.id, { onSuccess: () => toast.success(t('guardians.removed')), onError })}>{t('guardians.remove')}</Button>
          </div>
        </div>
      ) : <Button className="mt-2" size="sm" variant="ghost" onClick={() => setRemoving(true)}>{t('guardians.remove')}</Button>}
    </li>
  )
}

/** My data: who can see the student's progress (PARENT-001/002/004/007/009). */
export function GuardiansCard() {
  const { t, language } = useAcademicCopy()
  const toast = useToast()
  const view = useGuardianLinks()
  const create = useCreateGuardianInvite()
  const revoke = useRevokeGuardianInvite()
  const [inviting, setInviting] = useState(false)
  const [scopes, setScopes] = useState<GuardianScopes | null>(null)
  const [created, setCreated] = useState<NewGuardianInvite | null>(null)
  const onError = (error: unknown) => toast.error(academicErrorText(t, error))
  if (view.isPending || view.isError) return null
  const data = view.data
  const draftScopes = scopes ?? data.default_scopes

  return (
    <PrivacyCard icon={<Users className="h-5 w-5" />} title={t('guardians.title')}>
      <p className="text-sm text-slate-700 dark:text-slate-300">{t('guardians.body')}</p>
      {data.links.length === 0 ? <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{t('guardians.none')}</p>
        : <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">{data.links.map(link => <LinkRow key={link.id} link={link} />)}</ul>}

      {data.invites.length > 0 && (
        <div className="mt-4">
          <CardTitle as="h3" emoji="✉️" color="#6366f1" title={t('guardians.openInvites')} />
          <ul className="mt-1 grid gap-1 text-sm">
            {data.invites.map(invite => (
              <li key={invite.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>{t('guardians.inviteEnds', { date: formatDate(invite.expires_at, language) })}</span>
                <Button size="sm" variant="ghost" loading={revoke.isPending && revoke.variables === invite.id} onClick={() => revoke.mutate(invite.id, { onError })}>{t('guardians.cancelInvite')}</Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {created && <NewCode invite={created} />}
      {inviting ? (
        <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-gray-800/60">
          <p className="text-sm">{t('guardians.inviteScopes')}</p>
          <ScopeSwitches value={draftScopes} onChange={(scope, on) => setScopes({ ...draftScopes, [scope]: on })} />
          <div className="mt-3 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setInviting(false)}>{t('common.cancel')}</Button>
            <Button size="sm" loading={create.isPending}
              onClick={() => create.mutate({ scopes: draftScopes }, { onSuccess: invite => { setCreated(invite); setInviting(false) }, onError })}>{t('guardians.createCode')}</Button>
          </div>
        </div>
      ) : <Button className="mt-4" size="sm" variant="outline" onClick={() => { setInviting(true); setCreated(null) }}>{t('guardians.invite')}</Button>}
    </PrivacyCard>
  )
}

/** Ages 13–15: a guardian agrees before any score is stored (PARENT-003). */
export function GuardianConsentStep() {
  const { t } = useAcademicCopy()
  const toast = useToast()
  const session = useAcademicSession()
  const create = useCreateGuardianInvite()
  const [created, setCreated] = useState<NewGuardianInvite | null>(null)
  const [checked, setChecked] = useState(false)
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-800">
      <Users aria-hidden className="h-8 w-8 text-indigo-600 dark:text-indigo-300" />
      <h2 className="mt-3 text-xl font-black">{t('guardians.consent.title')}</h2>
      <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{t('guardians.consent.body')}</p>
      {created ? <NewCode invite={created} /> : (
        <Button className="mt-4" loading={create.isPending}
          onClick={() => create.mutate({ purpose: 'consent' }, { onSuccess: setCreated, onError: error => toast.error(academicErrorText(t, error)) })}>
          {t('guardians.createCode')}
        </Button>
      )}
      <div className="mt-4">
        <Button variant="ghost" size="sm" loading={session.isFetching} onClick={() => session.refetch().then(() => setChecked(true))}>{t('guardians.consent.check')}</Button>
        {checked && !session.isFetching && session.data?.next_step === 'guardian_consent' && <p role="status" className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('guardians.consent.waiting')}</p>}
      </div>
    </section>
  )
}
