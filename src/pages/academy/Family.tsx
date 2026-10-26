import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { academicErrorText } from '@/components/academic/errorText'
import { useAcademicCopy, type AcademicCopyKey } from '@/lib/academic/copy'
import {
  previewGuardianInvite, useAcceptGuardianInvite, useFamily, useGuardianRemoveLink,
  type GuardianLink, type GuardianScope, type GuardianScopes,
} from '@/lib/academic/api'
import { formatDate } from '@/lib/academic/format'

// Family (P3-PAR #52: PARENT-002/003/007): a parent or guardian links to a
// child with the code the child gave them, says how they are related and
// confirms they are the parent or guardian. The child then confirms the name.
// The per-child progress page comes in the next piece (PARENT-005).

const card = 'rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-800 sm:p-6'
const SCOPES: GuardianScope[] = ['scores', 'plan', 'careers', 'goals_text']
const RELATIONSHIPS: GuardianLink['relationship'][] = ['mother', 'father', 'guardian', 'other']

function Join() {
  const { t } = useAcademicCopy()
  const toast = useToast()
  const [params] = useSearchParams()
  const [code, setCode] = useState(params.get('code') ?? '')
  const [preview, setPreview] = useState<{ student_name: string; purpose: 'link' | 'consent'; scopes: GuardianScopes } | null>(null)
  const [relationship, setRelationship] = useState<GuardianLink['relationship'] | ''>('')
  const [declared, setDeclared] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [checking, setChecking] = useState(false)
  const accept = useAcceptGuardianInvite()
  const onError = (error: unknown) => toast.error(academicErrorText(t, error))

  const check = async (event: React.FormEvent) => {
    event.preventDefault()
    setChecking(true)
    try { setPreview(await previewGuardianInvite(code.trim())) } catch (error) { onError(error) } finally { setChecking(false) }
  }

  return (
    <section className={card}>
      <h2 className="text-lg font-black">{t('family.join')}</h2>
      <form onSubmit={check} className="mt-3 flex flex-wrap items-end gap-2">
        <label className="grid flex-1 basis-48 gap-1 text-sm font-bold">
          {t('family.codeLabel')}
          <input value={code} onChange={event => { setCode(event.target.value.toUpperCase()); setPreview(null) }} maxLength={12} autoComplete="off" spellCheck={false}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-mono text-lg tracking-widest dark:border-slate-600 dark:bg-gray-950" />
        </label>
        <Button type="submit" variant="outline" loading={checking} disabled={code.trim().length < 8}>{t('family.check')}</Button>
      </form>

      {preview && (
        <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-gray-800/60">
          <p className="font-bold">{t(preview.purpose === 'consent' ? 'family.previewConsent' : 'family.preview', { name: preview.student_name })}</p>
          <p className="mt-2 text-sm">{t('family.wouldSee')}</p>
          <ul className="list-disc pl-5 text-sm">
            {SCOPES.filter(scope => preview.scopes[scope]).map(scope => <li key={scope}>{t(`guardians.scope.${scope}` as AcademicCopyKey)}</li>)}
          </ul>
          <label className="mt-3 grid gap-1 text-sm font-bold">
            {t('family.relationship')}
            <select value={relationship} onChange={event => setRelationship(event.target.value as GuardianLink['relationship'])}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal dark:border-slate-600 dark:bg-gray-950">
              <option value="">—</option>
              {RELATIONSHIPS.map(value => <option key={value} value={value}>{t(`guardians.relationship.${value}` as AcademicCopyKey)}</option>)}
            </select>
          </label>
          <label className="mt-3 flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={declared} onChange={event => setDeclared(event.target.checked)} />{t('family.declaration')}
          </label>
          {preview.purpose === 'consent' && (
            <label className="mt-2 flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={agreed} onChange={event => setAgreed(event.target.checked)} />{t('family.declarationConsent')}
            </label>
          )}
          <Button className="mt-3" loading={accept.isPending} disabled={!relationship || !declared || (preview.purpose === 'consent' && !agreed)}
            onClick={() => relationship && accept.mutate({ code: code.trim(), relationship }, {
              onSuccess: () => { toast.success(t('family.accepted', { name: preview.student_name })); setPreview(null); setCode('') },
              onError,
            })}>
            {t('family.accept')}
          </Button>
        </div>
      )}
    </section>
  )
}

function ChildCard({ link }: { link: GuardianLink }) {
  const { t, language } = useAcademicCopy()
  const toast = useToast()
  const remove = useGuardianRemoveLink()
  const [removing, setRemoving] = useState(false)
  const name = link.student_name ?? '—'
  return (
    <li className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
      <p className="text-base font-black">{name}{link.grade ? <span className="ml-2 text-sm font-normal text-slate-600 dark:text-slate-400">{link.grade}</span> : null}</p>
      <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
        {link.status === 'pending_student' ? t('family.waiting', { name, date: formatDate(link.confirm_by, language) })
          : link.status === 'removed' ? t('family.ended', { date: formatDate(link.removed_at ?? link.declared_at, language) })
          : link.status === 'active' ? t('family.active')
          : t(`guardians.status.${link.status}` as AcademicCopyKey)}
      </p>
      {link.status === 'active' && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('family.dashboardSoon')}</p>}
      {link.status !== 'removed' && (removing ? (
        <div role="alertdialog" aria-labelledby={`stop-${link.id}`} className="mt-3 rounded-2xl bg-amber-50 p-3 dark:bg-amber-500/10">
          <p id={`stop-${link.id}`} className="font-black">{t('family.removeTitle', { name })}</p>
          <p className="mt-1 text-sm">{t('family.removeBody')}</p>
          <div className="mt-2 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setRemoving(false)}>{t('common.cancel')}</Button>
            <Button size="sm" variant="danger" loading={remove.isPending}
              onClick={() => remove.mutate(link.id, { onError: error => toast.error(academicErrorText(t, error)) })}>{t('guardians.remove')}</Button>
          </div>
        </div>
      ) : <Button className="mt-2" size="sm" variant="ghost" onClick={() => setRemoving(true)}>{t('guardians.remove')}</Button>)}
    </li>
  )
}

export function Family() {
  const { t, language } = useAcademicCopy()
  const family = useFamily()
  const links = family.data?.links ?? []
  const notices = family.data?.notices ?? []
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-gray-950 dark:text-slate-100">
      <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
        <Link to="/academy" className="inline-flex items-center gap-2 text-sm font-black text-slate-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-300">
          <ArrowLeft aria-hidden className="h-4 w-4" />Academy
        </Link>
        <header>
          <h1 className="flex items-center gap-2 text-2xl font-black"><Users aria-hidden className="h-6 w-6 text-indigo-600 dark:text-indigo-300" />{t('family.title')}</h1>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{t('family.body')}</p>
        </header>
        <Join />
        <section className={card}>
          <h2 className="text-lg font-black">{t('family.children')}</h2>
          {family.isPending ? <div className="mt-3 h-20 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
            : family.isError ? <p className="mt-2 text-sm">{academicErrorText(t, family.error)}</p>
            : links.length === 0 ? <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{t('family.none')}</p>
            : <ul className="mt-3 grid gap-3">{links.map(link => <ChildCard key={link.id} link={link} />)}</ul>}
          {notices.length > 0 && (
            <ul className="mt-4 grid gap-1 text-sm text-slate-600 dark:text-slate-400">
              {notices.slice(0, 5).map((notice, index) => {
                const key = notice.code === 'guardian.confirmed' ? 'family.note.confirmed' : notice.code === 'guardian.declined' ? 'family.note.declined' : notice.code === 'guardian.removed' ? 'family.note.removed' : null
                return key ? <li key={index}>{formatDate(notice.created_at, language)} · {t(key as AcademicCopyKey, { name: notice.payload.student ?? '' })}</li> : null
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
