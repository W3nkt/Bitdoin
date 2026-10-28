import { useState } from 'react'
import { CalendarPlus, FileEdit, Plus, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { LAOS_ADMIN_DIVISIONS } from '@/data/laosAdministrativeDivisions'
import {
  useAdminCalendars, useAdminYears, useCreateSchoolCalendar, useDeletePeriod, useSavePeriod, useSaveYear,
  type AdminCalendar, type AdminPeriod, type AdminYear, type PeriodType,
} from '@/lib/academic/adminApi'
import { Empty, Field, IconButton, Panel, Pill, adminErrorText } from './AdminKit'
import { SchoolChooser } from './SchoolsAdmin'

const PERIOD_TYPES: Record<PeriodType, string> = {
  monthly: 'Monthly', term_official: 'Term (official)', semester_official: 'Semester (official)', annual_official: 'Year (official)', exam: 'Exam',
}

type PeriodDraft = Omit<AdminPeriod, 'id'> & { id?: string; calendarId: string }
type YearDraft = Omit<AdminYear, 'id'> & { id?: string }

/** Academic years, calendars and reporting periods (ADMIN-004). */
export function CalendarsAdmin() {
  const toast = useToast()
  const years = useAdminYears()
  const [yearId, setYearId] = useState<string | null>(null)
  const selectedYear = years.data?.find(year => year.id === yearId) ?? years.data?.find(year => year.status === 'active') ?? years.data?.[0]
  const calendars = useAdminCalendars(selectedYear?.id ?? null)
  const saveYear = useSaveYear()
  const savePeriod = useSavePeriod()
  const deletePeriod = useDeletePeriod()
  const createSchoolCalendar = useCreateSchoolCalendar()
  const [yearDraft, setYearDraft] = useState<YearDraft | null>(null)
  const [periodDraft, setPeriodDraft] = useState<PeriodDraft | null>(null)
  const [schoolPicking, setSchoolPicking] = useState(false)
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const onError = (error: unknown) => toast.error(adminErrorText(error))

  function newPeriod(calendar: AdminCalendar) {
    const monthly = calendar.periods.filter(period => period.period_type === 'monthly')
    const last = monthly[monthly.length - 1]
    setPeriodDraft({
      calendarId: calendar.id, period_type: 'monthly', term_no: last?.term_no ?? 1, sequence: (last?.sequence ?? 0) + 1,
      label_lo: '', label_en: '', start_date: selectedYear?.start_date ?? '', end_date: selectedYear?.start_date ?? '',
    })
  }

  const scopeLabel = (calendar: AdminCalendar) => calendar.scope === 'national' ? 'National'
    : calendar.scope === 'province' ? `Province · ${LAOS_ADMIN_DIVISIONS.find(item => item.id === calendar.province_code)?.name_en ?? calendar.province_code}`
    : `School · ${calendar.school?.name_lo ?? ''}`

  const periodValid = !!periodDraft && periodDraft.label_lo.trim() && periodDraft.label_en.trim() && periodDraft.start_date && periodDraft.end_date
    && periodDraft.end_date >= periodDraft.start_date && periodDraft.sequence > 0
  const yearValid = !!yearDraft && /^\d{4}-\d{4}$/.test(yearDraft.code) && yearDraft.start_date && yearDraft.end_date && yearDraft.end_date > yearDraft.start_date

  return (
    <div className="grid gap-6">
      <Panel
        title="School years"
        description="New enrolments use the calendar of their school, then province, then the national one. A school calendar starts as a copy, so only the periods you change differ."
        actions={<Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setYearDraft({ code: '', start_date: '', end_date: '', status: 'upcoming' })}>Add year</Button>}
      >
        {years.isPending ? <Skeleton className="h-12 w-full rounded-xl" />
          : years.isError ? <Empty>{adminErrorText(years.error)}</Empty>
          : (
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="School year">
              {years.data.map(year => (
                <span key={year.id} className="inline-flex items-center gap-1">
                  <button type="button" role="tab" aria-selected={year.id === selectedYear?.id} onClick={() => setYearId(year.id)}
                    className={year.id === selectedYear?.id
                      ? 'rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white dark:bg-primary-600'
                      : 'rounded-full bg-white px-4 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-200 dark:bg-gray-900 dark:text-slate-300 dark:ring-slate-700'}>
                    {year.code} · {year.status}
                  </button>
                  {year.id === selectedYear?.id && <IconButton label={`Edit ${year.code}`} onClick={() => setYearDraft({ ...year })}><FileEdit className="h-4 w-4" /></IconButton>}
                </span>
              ))}
            </div>
          )}
      </Panel>

      {selectedYear && (
        <Panel
          title={`Calendars for ${selectedYear.code}`}
          actions={<Button size="sm" variant="outline" icon={<CalendarPlus className="h-4 w-4" />} onClick={() => setSchoolPicking(true)}>School calendar</Button>}
        >
          {calendars.isPending ? <Skeleton className="h-48 w-full rounded-xl" />
            : calendars.isError ? <Empty>{adminErrorText(calendars.error)}</Empty>
            : calendars.data.length === 0 ? <Empty>No calendars for this year yet. Run the curriculum seed or add periods to a national calendar.</Empty>
            : (
              <div className="grid gap-4">
                {calendars.data.map(calendar => (
                  <article key={calendar.id} className="rounded-xl ring-1 ring-slate-200 dark:ring-slate-700">
                    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="font-black">{calendar.name}</span>
                        <Pill tone={calendar.scope === 'national' ? 'blue' : 'gray'}>{scopeLabel(calendar)}</Pill>
                        {calendar.status !== 'active' && <Pill tone="amber">{calendar.status}</Pill>}
                      </p>
                      <Button size="sm" variant="ghost" icon={<Plus className="h-4 w-4" />} onClick={() => newPeriod(calendar)}>Add period</Button>
                    </header>
                    <div tabIndex={0} className="overflow-x-auto">
                      <table className="w-full min-w-[720px] text-left text-sm">
                        <thead className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          <tr><th className="px-4 py-2">Type</th><th className="px-4 py-2">Term</th><th className="px-4 py-2">#</th><th className="px-4 py-2">Lao</th><th className="px-4 py-2">English</th><th className="px-4 py-2">Dates</th><th className="px-4 py-2"><span className="sr-only">Actions</span></th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {calendar.periods.map(period => (
                            <tr key={period.id}>
                              <td className="px-4 py-2">{PERIOD_TYPES[period.period_type]}</td>
                              <td className="px-4 py-2">{period.term_no ?? '—'}</td>
                              <td className="px-4 py-2">{period.sequence}</td>
                              <td className="px-4 py-2" lang="lo">{period.label_lo}</td>
                              <td className="px-4 py-2">{period.label_en}</td>
                              <td className="px-4 py-2 tabular-nums">{period.start_date} → {period.end_date}</td>
                              <td className="px-4 py-2">
                                <div className="flex justify-end gap-2">
                                  <IconButton label={`Edit ${period.label_en}`} onClick={() => setPeriodDraft({ ...period, calendarId: calendar.id })}><FileEdit className="h-4 w-4" /></IconButton>
                                  <IconButton danger label={`Delete ${period.label_en}`} onClick={() => {
                                    if (window.confirm(`Delete ${period.label_en}? Periods that already have submitted scores cannot be deleted.`)) deletePeriod.mutate(period.id, { onError })
                                  }}><Trash2 className="h-4 w-4" /></IconButton>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </article>
                ))}
              </div>
            )}
        </Panel>
      )}

      <Modal open={!!yearDraft} onClose={() => setYearDraft(null)} title={yearDraft?.id ? `Edit ${yearDraft.code}` : 'Add school year'} size="lg">
        {yearDraft && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Code" hint="e.g. 2027-2028"><input value={yearDraft.code} maxLength={9} onChange={event => setYearDraft({ ...yearDraft, code: event.target.value })} /></Field>
            <Field label="Status">
              <select value={yearDraft.status} onChange={event => setYearDraft({ ...yearDraft, status: event.target.value as AdminYear['status'] })}>
                <option value="upcoming">Upcoming</option><option value="active">Active</option><option value="closed">Closed</option>
              </select>
            </Field>
            <Field label="Starts"><input type="date" value={yearDraft.start_date} onChange={event => setYearDraft({ ...yearDraft, start_date: event.target.value })} /></Field>
            <Field label="Ends"><input type="date" value={yearDraft.end_date} onChange={event => setYearDraft({ ...yearDraft, end_date: event.target.value })} /></Field>
            <div className="sm:col-span-2">
              <Button fullWidth disabled={!yearValid} loading={saveYear.isPending} icon={<Save className="h-4 w-4" />}
                onClick={() => saveYear.mutate(yearDraft, { onSuccess: () => { setYearDraft(null); toast.success('Year saved.') }, onError })}>Save year</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!periodDraft} onClose={() => setPeriodDraft(null)} title={periodDraft?.id ? 'Edit period' : 'Add period'} size="lg">
        {periodDraft && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type">
              <select value={periodDraft.period_type} onChange={event => setPeriodDraft({ ...periodDraft, period_type: event.target.value as PeriodType })}>
                {Object.entries(PERIOD_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Term"><input type="number" min={1} max={3} value={periodDraft.term_no ?? ''} onChange={event => setPeriodDraft({ ...periodDraft, term_no: event.target.value ? Number(event.target.value) : null })} /></Field>
              <Field label="Order"><input type="number" min={1} value={periodDraft.sequence} onChange={event => setPeriodDraft({ ...periodDraft, sequence: Number(event.target.value) })} /></Field>
            </div>
            <Field label="Lao label" hint="Month names without ເດືອນ, e.g. ຕຸລາ"><input lang="lo" value={periodDraft.label_lo} maxLength={40} onChange={event => setPeriodDraft({ ...periodDraft, label_lo: event.target.value })} /></Field>
            <Field label="English label"><input value={periodDraft.label_en} maxLength={40} onChange={event => setPeriodDraft({ ...periodDraft, label_en: event.target.value })} /></Field>
            <Field label="Starts"><input type="date" value={periodDraft.start_date} onChange={event => setPeriodDraft({ ...periodDraft, start_date: event.target.value })} /></Field>
            <Field label="Ends"><input type="date" value={periodDraft.end_date} onChange={event => setPeriodDraft({ ...periodDraft, end_date: event.target.value })} /></Field>
            <div className="sm:col-span-2">
              <Button fullWidth disabled={!periodValid} loading={savePeriod.isPending} icon={<Save className="h-4 w-4" />}
                onClick={() => savePeriod.mutate({ ...periodDraft, label_lo: periodDraft.label_lo.trim(), label_en: periodDraft.label_en.trim() }, { onSuccess: () => { setPeriodDraft(null); toast.success('Period saved.') }, onError })}>Save period</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={schoolPicking} onClose={() => { setSchoolPicking(false); setSchoolId(null) }} title={`School calendar for ${selectedYear?.code ?? ''}`} size="xl">
        <div className="grid gap-4">
          <p className="text-sm text-slate-700 dark:text-slate-300">Copies the province or national calendar for this school. Then edit only the periods that differ. Students already enrolled keep their calendar.</p>
          <SchoolChooser value={schoolId} onChange={setSchoolId} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setSchoolPicking(false); setSchoolId(null) }}>Cancel</Button>
            <Button disabled={!schoolId || !selectedYear} loading={createSchoolCalendar.isPending}
              onClick={() => schoolId && selectedYear && createSchoolCalendar.mutate({ schoolId, yearId: selectedYear.id, overrides: [] }, {
                onSuccess: () => { setSchoolPicking(false); setSchoolId(null); toast.success('School calendar created. Edit the periods that differ.') },
                onError,
              })}>Create</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
