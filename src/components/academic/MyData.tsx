import { useState } from 'react'
import { ArrowRightLeft, Database, Pencil, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { LAOS_ADMIN_DIVISIONS } from '@/data/laosAdministrativeDivisions'
import { useAcademicCopy, type AcademicCopyKey } from '@/lib/academic/copy'
import {
  useMyDataSummary, usePeriods, useTransitionEnrolment, useUpdateProfile,
  type AgeBand, type MyDataSummary,
} from '@/lib/academic/api'
import { MyScoresNotice } from './MyScoresShell'
import { ConsentChoices, DeleteCard, DeletionPending, ExportCard } from './Privacy'
import { SchoolPicker, type SchoolChoice } from './SchoolPicker'
import { academicErrorText } from './errorText'

const AGE_BANDS: AgeBand[] = ['13_15', '16_17', '18_plus']
const COUNTS: [keyof MyDataSummary['counts'], AcademicCopyKey][] = [
  ['enrolments', 'data.count.enrolments'],
  ['score_entries_submitted', 'data.count.periods'],
  ['score_entries_draft', 'data.count.drafts'],
  ['scores', 'data.count.scores'],
  ['corrections', 'data.count.corrections'],
  ['uploads', 'data.count.uploads'],
  ['guardian_links', 'data.count.guardians'],
]

/** "My data" (PROFILE-007): everything the module holds, with edits. */
export function MyData({ activeEnrolmentId }: { activeEnrolmentId: string | null }) {
  const { t, lo } = useAcademicCopy()
  const summary = useMyDataSummary()

  if (summary.isPending) return <div className="h-64 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
  if (summary.isError) return <MyScoresNotice title={t('state.error.title')} body={academicErrorText(t, summary.error)} />

  const { profile, counts, consents } = summary.data

  return (
    <div className="space-y-6">
      <DeletionPending deletion={summary.data.deletion} />
      {profile.status === 'read_only' && (
        <p role="status" className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">{t('privacy.readOnly')}</p>
      )}
      <ProfileCard profile={profile} />

      <Card icon={<Database className="h-5 w-5" />} title={t('data.held')}>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {COUNTS.map(([key, label]) => (
            <div key={key} className="rounded-2xl bg-slate-50 p-3 dark:bg-gray-800/60">
              <dt className="text-xs font-bold text-slate-500 dark:text-slate-400">{t(label)}</dt>
              <dd className="mt-1 text-2xl font-black tabular-nums">{counts[key]}</dd>
            </div>
          ))}
        </dl>
      </Card>


      {activeEnrolmentId && profile.status === 'active' && <TransferCard enrolmentId={activeEnrolmentId} lo={lo} />}

      <h2 className="px-1 pt-2 text-xl font-black">{t('privacy.title')}</h2>
      <ConsentChoices consents={consents} />
      <ExportCard />
      {profile.status !== 'deletion_pending' && <DeleteCard />}
    </div>
  )
}

function ProfileCard({ profile }: { profile: MyDataSummary['profile'] }) {
  const { t, lo } = useAcademicCopy()
  const toast = useToast()
  const update = useUpdateProfile()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(profile.display_name)
  const [ageBand, setAgeBand] = useState<AgeBand>(profile.age_band)
  const [provinceId, setProvinceId] = useState(profile.province_code)
  const [districtCode, setDistrictCode] = useState(profile.district_code ?? '')
  const province = LAOS_ADMIN_DIVISIONS.find(item => item.id === provinceId)
  const provinceName = (id: string) => {
    const match = LAOS_ADMIN_DIVISIONS.find(item => item.id === id)
    return match ? (lo ? match.name_lo : match.name_en) : id
  }
  const districtName = profile.district_code
    ? LAOS_ADMIN_DIVISIONS.flatMap(item => item.districts).find(item => item.code === profile.district_code)
    : undefined

  const save = () => {
    update.mutate({
      version: profile.version,
      changes: {
        display_name: name.trim(),
        age_band: ageBand,
        province_code: provinceId,
        district_code: districtCode || null,
      },
    }, {
      onSuccess: () => { setEditing(false); toast.success(t('data.saved')) },
      onError: error => toast.error(academicErrorText(t, error)),
    })
  }

  return (
    <Card
      icon={<UserRound className="h-5 w-5" />}
      title={t('data.profile')}
      action={!editing && profile.status === 'active' && (
        <Button variant="ghost" size="sm" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditing(true)}>{t('data.edit')}</Button>
      )}
    >
      {editing ? (
        <div className="space-y-4">
          <Input label={t('details.name')} value={name} maxLength={40} onChange={event => setName(event.target.value)} />
          <Select label={t('data.ageBand')} value={ageBand} onChange={event => setAgeBand(event.target.value as AgeBand)}
            options={AGE_BANDS.map(band => ({ value: band, label: t(`age.${band}` as AcademicCopyKey) }))} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label={t('details.province')} value={provinceId} onChange={event => { setProvinceId(event.target.value); setDistrictCode('') }}
              options={LAOS_ADMIN_DIVISIONS.map(item => ({ value: item.id, label: lo ? item.name_lo : item.name_en }))} />
            <Select label={`${t('details.district')} (${t('common.optional')})`} value={districtCode} placeholder={t('details.choose')}
              onChange={event => setDistrictCode(event.target.value)}
              options={(province?.districts ?? []).map(item => ({ value: item.code, label: lo ? item.name_lo : item.name_en }))} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(false)}>{t('common.cancel')}</Button>
            <Button loading={update.isPending} disabled={!name.trim()} onClick={save}>{t('common.save')}</Button>
          </div>
        </div>
      ) : (
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <Field label={t('details.name')} value={profile.display_name} />
          <Field label={t('data.ageBand')} value={t(`age.${profile.age_band}` as AcademicCopyKey)} />
          <Field label={t('details.province')} value={provinceName(profile.province_code)} />
          <Field label={t('details.district')} value={districtName ? (lo ? districtName.name_lo : districtName.name_en) : '—'} />
        </dl>
      )}
    </Card>
  )
}

/** Mid-year school change (PROFILE-005). */
function TransferCard({ enrolmentId, lo }: { enrolmentId: string; lo: boolean }) {
  const { t } = useAcademicCopy()
  const toast = useToast()
  const periods = usePeriods(enrolmentId)
  const transition = useTransitionEnrolment()
  const [open, setOpen] = useState(false)
  const [seq, setSeq] = useState('')
  const [school, setSchool] = useState<SchoolChoice | null>(null)

  const months = (periods.data?.periods ?? []).filter(period => period.period_type === 'monthly' && !period.disabled)
  // The first month of the enrolment cannot be a transfer month.
  const choices = months.slice(1)
  if (!open) {
    return (
      <Card icon={<ArrowRightLeft className="h-5 w-5" />} title={t('transfer.title')}
        action={<Button variant="ghost" size="sm" onClick={() => setOpen(true)} disabled={choices.length === 0}>{t('year.transferred')}</Button>}>
        <p className="text-sm text-slate-600 dark:text-slate-400">{t('transfer.body')}</p>
      </Card>
    )
  }

  return (
    <Card icon={<ArrowRightLeft className="h-5 w-5" />} title={t('transfer.title')}>
      <div className="space-y-4">
        <Select label={t('transfer.month')} required value={seq} placeholder={t('details.choose')}
          onChange={event => setSeq(event.target.value)}
          options={choices.map(period => ({ value: String(period.sequence), label: lo ? period.label_lo : period.label_en }))} />
        <SchoolPicker value={school} onChange={setSchool} provinceCode={null} showLocationFilters />
        <p className="text-xs text-slate-500">{t('transfer.body')}</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
          <Button
            loading={transition.isPending}
            disabled={!seq || !school}
            onClick={() => school && transition.mutate({
              kind: 'transferred',
              effective_period_seq: Number(seq),
              ...('school_id' in school ? { school_id: school.school_id } : { school_free_text: school.school_free_text }),
            }, {
              onSuccess: () => { setOpen(false); toast.success(t('transfer.done')) },
              onError: error => toast.error(academicErrorText(t, error)),
            })}
          >
            {t('year.confirm')}
          </Button>
        </div>
      </div>
    </Card>
  )
}

function Card({ icon, title, action, children }: { icon: React.ReactNode; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-800">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">{icon}</span>
        <h2 className="flex-1 text-lg font-black">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-0.5 font-bold">{value}</dd>
    </div>
  )
}
