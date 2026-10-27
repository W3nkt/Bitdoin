import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { AcademicError, toAcademicError } from './errors'
import { callAcademicRpc } from './rpc'

// Data access for the My Scores admin screens (FE-007, #34). Configuration
// tables are written directly under RLS (ADMIN with an aal2 session,
// migration 116); merges, scale versions, calendars, roles and support go
// through the audited RPCs. Config changes are audited by triggers (111).

export const adminKey = ['academic', 'admin'] as const

/** Unwraps a PostgREST result. Plain Postgres errors keep their SQLSTATE as PG_<code>. */
async function rows<T>(request: PromiseLike<{ data: unknown; error: unknown }>): Promise<T> {
  const { data, error } = await request
  if (error) {
    const code = (error as { code?: string }).code ?? ''
    if (/^PT\d{3}$/.test(code) || code === '42501' || code.startsWith('PGRST')) throw toAcademicError(error)
    throw new AcademicError(`PG_${code}`, 400, (error as { message?: string }).message)
  }
  return data as T
}

function useAdminMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKey }),
  })
}

// ─── Subjects and aliases (ADMIN-002) ────────────────────────────────────────

export interface AdminGrade { id: string; code: string; ordinal: number; label_lo: string; label_en: string }

export interface SubjectAlias { id: string; alias_text: string; school_id: string | null }

export interface AdminSubject {
  id: string
  code: string
  name_lo: string
  name_en: string
  grade_min: number
  grade_max: number
  is_default: boolean
  status: 'active' | 'archived'
  aliases: SubjectAlias[]
}

export type SubjectInput = Omit<AdminSubject, 'id' | 'aliases'> & { id?: string }

export function useAdminGrades() {
  return useQuery({
    queryKey: [...adminKey, 'grades'],
    queryFn: () => rows<AdminGrade[]>(supabase.from('academic_grades').select('id,code,ordinal,label_lo,label_en').eq('status', 'active').order('ordinal')),
  })
}

export function useAdminSubjects() {
  return useQuery({
    queryKey: [...adminKey, 'subjects'],
    queryFn: () => rows<AdminSubject[]>(supabase.from('academic_subjects')
      .select('id,code,name_lo,name_en,grade_min,grade_max,is_default,status,aliases:academic_subject_aliases(id,alias_text,school_id)')
      .order('code')),
  })
}

export function useSaveSubject() {
  return useAdminMutation(({ id, ...fields }: SubjectInput) => rows(id
    ? supabase.from('academic_subjects').update(fields).eq('id', id)
    : supabase.from('academic_subjects').insert(fields)))
}

export function useAddAlias() {
  return useAdminMutation(({ subjectId, text }: { subjectId: string; text: string }) =>
    rows(supabase.from('academic_subject_aliases').insert({ subject_id: subjectId, alias_text: text, alias_normalised: text.trim().toLowerCase() })))
}

export function useDeleteAlias() {
  return useAdminMutation((id: string) => rows(supabase.from('academic_subject_aliases').delete().eq('id', id)))
}

// ─── Grading scales (ADMIN-002, OD-13a) ──────────────────────────────────────

export type ScaleFamily = 'numeric_linear' | 'ordinal' | 'pass_fail'
export interface OrdinalLevel { code: string; label_lo: string; label_en: string }

export interface ScaleVersion {
  id: string
  version: number
  scale_family: ScaleFamily
  min_value: number | null
  max_value: number | null
  step: number | null
  decimals: number
  pass_mark: number | null
  normalisable: boolean
  ordinal_levels: OrdinalLevel[] | null
  status: 'draft' | 'approved' | 'retired'
  created_by: string | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
}

export interface AdminScale {
  id: string
  code: string
  name_lo: string
  name_en: string
  status: 'active' | 'archived'
  versions: ScaleVersion[]
}

export type ScaleFields = Partial<Pick<ScaleVersion, 'scale_family' | 'min_value' | 'max_value' | 'step' | 'decimals' | 'pass_mark' | 'normalisable' | 'ordinal_levels'>>

export function useAdminScales() {
  return useQuery({
    queryKey: [...adminKey, 'scales'],
    queryFn: async () => {
      const scales = await rows<AdminScale[]>(supabase.from('academic_grading_scales')
        .select('id,code,name_lo,name_en,status,versions:academic_grading_scale_versions(id,version,scale_family,min_value,max_value,step,decimals,pass_mark,normalisable,ordinal_levels,status,created_by,approved_by,approved_at,created_at)')
        .order('code'))
      return scales.map(scale => ({ ...scale, versions: [...scale.versions].sort((a, b) => b.version - a.version) }))
    },
  })
}

/** A new scale with its first draft version. */
export function useCreateScale() {
  return useAdminMutation(async ({ code, name_lo, name_en, fields }: { code: string; name_lo: string; name_en: string; fields: ScaleFields }) => {
    const [scale] = await rows<Array<{ id: string }>>(supabase.from('academic_grading_scales').insert({ code, name_lo, name_en }).select('id'))
    return callAcademicRpc<string>('academic_admin_create_scale_version', { p_scale_id: scale.id, p_fields: fields })
  })
}

/** Scales are never edited in place: a change is a new draft version. */
export function useCreateScaleVersion() {
  return useAdminMutation(({ scaleId, fields }: { scaleId: string; fields: ScaleFields }) =>
    callAcademicRpc<string>('academic_admin_create_scale_version', { p_scale_id: scaleId, p_fields: fields }))
}

export function useApproveScaleVersion() {
  return useAdminMutation((versionId: string) => callAcademicRpc('academic_admin_approve_scale_version', { p_version_id: versionId }))
}

export function useRetireScaleVersion() {
  return useAdminMutation((versionId: string) => rows(supabase.from('academic_grading_scale_versions').update({ status: 'retired' }).eq('id', versionId)))
}

export function useDeleteDraftVersion() {
  return useAdminMutation((versionId: string) => rows(supabase.from('academic_grading_scale_versions').delete().eq('id', versionId).eq('status', 'draft')))
}

// ─── Schools (ADMIN-003) ─────────────────────────────────────────────────────

export interface AdminSchool {
  id: string
  name_lo: string
  name_en: string | null
  romanised_name: string | null
  province_code: string
  district_code: string | null
  school_type: 'public' | 'private' | 'other' | null
  status: 'active' | 'merged' | 'archived'
  merged_into_id: string | null
}

export type SchoolInput = Omit<AdminSchool, 'id' | 'status' | 'merged_into_id'> & { id?: string; status?: 'active' | 'archived' }

const SCHOOL_COLUMNS = 'id,name_lo,name_en,romanised_name,province_code,district_code,school_type,status,merged_into_id'

export function useAdminSchools(search: string, provinceCode: string, includeMerged: boolean) {
  return useQuery({
    queryKey: [...adminKey, 'schools', search, provinceCode, includeMerged],
    queryFn: () => {
      let query = supabase.from('academic_schools').select(SCHOOL_COLUMNS).order('name_lo').limit(100)
      const term = search.trim().replace(/[%,()]/g, ' ')
      if (term) query = query.or(`name_lo.ilike.%${term}%,name_en.ilike.%${term}%,romanised_name.ilike.%${term}%`)
      if (provinceCode) query = query.eq('province_code', provinceCode)
      if (!includeMerged) query = query.neq('status', 'merged')
      return rows<AdminSchool[]>(query)
    },
  })
}

export function useSaveSchool() {
  return useAdminMutation(({ id, ...fields }: SchoolInput) => rows(id
    ? supabase.from('academic_schools').update(fields).eq('id', id)
    : supabase.from('academic_schools').insert(fields)))
}

export function useMergeSchools() {
  return useAdminMutation(({ fromId, intoId, reason }: { fromId: string; intoId: string; reason: string }) =>
    callAcademicRpc<{ enrolments_moved: number }>('academic_admin_merge_schools', { p_from_id: fromId, p_into_id: intoId, p_reason: reason }))
}

export interface ReviewTask {
  id: string
  kind: 'unverified_school'
  status: 'open' | 'resolved' | 'dismissed'
  enrolment_id: string | null
  payload: { school_free_text?: string; province_code?: string }
  created_at: string
}

export function useReviewTasks() {
  return useQuery({
    queryKey: [...adminKey, 'review-tasks'],
    queryFn: () => rows<ReviewTask[]>(supabase.from('academic_review_tasks')
      .select('id,kind,status,enrolment_id,payload,created_at').eq('status', 'open').order('created_at').limit(200)),
  })
}

export function useResolveTask() {
  return useAdminMutation(({ taskId, schoolId, note }: { taskId: string; schoolId: string | null; note?: string }) =>
    callAcademicRpc('academic_admin_resolve_school_task', { p_task_id: taskId, p_school_id: schoolId, p_note: note ?? null }))
}

// ─── Calendars (ADMIN-004) ───────────────────────────────────────────────────

export interface AdminYear { id: string; code: string; start_date: string; end_date: string; status: 'upcoming' | 'active' | 'closed' }

export type PeriodType = 'monthly' | 'term_official' | 'semester_official' | 'annual_official' | 'exam'

export interface AdminPeriod {
  id: string
  period_type: PeriodType
  term_no: number | null
  sequence: number
  label_lo: string
  label_en: string
  start_date: string
  end_date: string
}

export interface AdminCalendar {
  id: string
  name: string
  academic_year_id: string
  scope: 'national' | 'province' | 'school'
  province_code: string | null
  school_id: string | null
  status: 'draft' | 'active' | 'archived'
  school: { name_lo: string } | null
  periods: AdminPeriod[]
}

export function useAdminYears() {
  return useQuery({
    queryKey: [...adminKey, 'years'],
    queryFn: () => rows<AdminYear[]>(supabase.from('academic_years').select('id,code,start_date,end_date,status').order('start_date', { ascending: false })),
  })
}

export function useSaveYear() {
  return useAdminMutation(({ id, ...fields }: Omit<AdminYear, 'id'> & { id?: string }) => rows(id
    ? supabase.from('academic_years').update(fields).eq('id', id)
    : supabase.from('academic_years').insert(fields)))
}

export function useAdminCalendars(yearId: string | null) {
  return useQuery({
    queryKey: [...adminKey, 'calendars', yearId],
    enabled: !!yearId,
    queryFn: async () => {
      const calendars = await rows<AdminCalendar[]>(supabase.from('academic_calendar_templates')
        .select('id,name,academic_year_id,scope,province_code,school_id,status,school:academic_schools(name_lo),periods:academic_reporting_periods(id,period_type,term_no,sequence,label_lo,label_en,start_date,end_date)')
        .eq('academic_year_id', yearId!)
        .order('scope').order('name'))
      const typeOrder: PeriodType[] = ['monthly', 'term_official', 'semester_official', 'annual_official', 'exam']
      return calendars.map(calendar => ({
        ...calendar,
        periods: [...calendar.periods].sort((a, b) => typeOrder.indexOf(a.period_type) - typeOrder.indexOf(b.period_type) || a.sequence - b.sequence),
      }))
    },
  })
}

export function useSavePeriod() {
  return useAdminMutation(({ id, calendarId, ...fields }: Omit<AdminPeriod, 'id'> & { id?: string; calendarId: string }) => rows(id
    ? supabase.from('academic_reporting_periods').update(fields).eq('id', id)
    : supabase.from('academic_reporting_periods').insert({ ...fields, calendar_template_id: calendarId })))
}

/** Fails with PG_23503 while any score entry uses the period. */
export function useDeletePeriod() {
  return useAdminMutation((id: string) => rows(supabase.from('academic_reporting_periods').delete().eq('id', id)))
}

export interface PeriodOverride {
  period_type: PeriodType
  sequence: number
  label_lo?: string
  label_en?: string
  term_no?: number
  start_date?: string
  end_date?: string
  remove?: boolean
}

export function useCreateSchoolCalendar() {
  return useAdminMutation(({ schoolId, yearId, overrides }: { schoolId: string; yearId: string; overrides: PeriodOverride[] }) =>
    callAcademicRpc<string>('academic_admin_create_school_calendar', { p_school_id: schoolId, p_year_id: yearId, p_overrides: overrides }))
}

// ─── Roles (ADMIN-001) ───────────────────────────────────────────────────────

export type BitdoinRole = 'CUSTOMER' | 'ADMIN' | 'OPERATIONS' | 'FINANCE'

export interface StaffUser { id: string; name: string; email: string | null; phone: string | null; member_code: string | null; role: BitdoinRole }

/** Staff, or anyone matching the search (name, email, phone, member code). */
export function useStaffUsers(search: string) {
  return useQuery({
    queryKey: [...adminKey, 'users', search],
    queryFn: () => {
      let query = supabase.from('users').select('id,name,email,phone,member_code,role').order('name').limit(50)
      const term = search.trim().replace(/[%,()]/g, ' ')
      query = term
        ? query.or(`name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,member_code.ilike.%${term}%`)
        : query.neq('role', 'CUSTOMER')
      return rows<StaffUser[]>(query)
    },
  })
}

export function useSetUserRole() {
  return useAdminMutation(({ userId, role, reason }: { userId: string; role: BitdoinRole; reason: string }) =>
    callAcademicRpc<{ old_role: BitdoinRole; role: BitdoinRole }>('academic_admin_set_user_role', { p_user_id: userId, p_role: role, p_reason: reason }))
}

// ─── Support (ADMIN-005) ─────────────────────────────────────────────────────

export interface SupportLookup {
  user: { id: string; member_code: string | null; role: BitdoinRole }
  profile: {
    id: string
    status: 'active' | 'read_only' | 'deletion_pending'
    consent_state: string
    age_band: string
    deletion_requested_at: string | null
    deletion_scope: string | null
    created_at: string
  }
  enrolments: Array<{ id: string; academic_year: string; grade: string; state: string; closed_reason: string | null; school_verification: string; submitted_periods: number; draft_periods: number }>
  consents: Array<{ purpose: string; notice_version: string; granted_at: string; withdrawn_at: string | null }>
}

export const supportLookup = (userRef: string) => callAcademicRpc<SupportLookup>('academic_support_lookup', { p_user_ref: userRef })

export const startBreakGlass = (profileId: string, reason: string) =>
  callAcademicRpc<{ session_id: string; expires_at: string }>('academic_support_break_glass', { p_student_profile_id: profileId, p_reason: reason })

export const viewStudentScores = (profileId: string) =>
  callAcademicRpc<{ expires_at: string; enrolments: import('./api').HistoryEnrolment[] }>('academic_support_view_scores', { p_student_profile_id: profileId })

// ─── Audit (ADMIN-006) ───────────────────────────────────────────────────────

export interface AuditEvent {
  id: string
  occurred_at: string
  actor_user_id: string | null
  actor_role: string
  action: string
  target_type: string
  target_id: string | null
  student_profile_id: string | null
  outcome: 'success' | 'denied' | 'error'
  reason: string | null
}

export interface AuditFilters {
  actor: string
  student: string
  action: string
  outcome: '' | AuditEvent['outcome']
}

export const AUDIT_PAGE = 50

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Actor by user ID or member code (BA-XXX-… prefixes are ignored). */
async function resolveActor(ref: string): Promise<string | null> {
  const value = ref.trim()
  if (!value) return null
  if (UUID.test(value)) return value.toLowerCase()
  const code = value.toUpperCase().replace(/^BA-[A-Z]{3}-/, '')
  const found = await rows<Array<{ id: string }>>(supabase.from('users').select('id').eq('member_code', code).limit(1))
  return found[0]?.id ?? '00000000-0000-0000-0000-000000000000'
}

async function auditQuery(filters: AuditFilters, from: number, to: number) {
  let query = supabase.from('academic_audit_events')
    .select('id,occurred_at,actor_user_id,actor_role,action,target_type,target_id,student_profile_id,outcome,reason', { count: 'exact' })
    .order('occurred_at', { ascending: false })
    .range(from, to)
  const actor = await resolveActor(filters.actor)
  if (actor) query = query.eq('actor_user_id', actor)
  const student = filters.student.trim()
  if (student) query = UUID.test(student) ? query.eq('student_profile_id', student.toLowerCase()) : query.eq('student_profile_id', '00000000-0000-0000-0000-000000000000')
  if (filters.action) query = query.like('action', `${filters.action}%`)
  if (filters.outcome) query = query.eq('outcome', filters.outcome)
  const { data, error, count } = await query
  if (error) throw toAcademicError(error)
  return { events: (data ?? []) as AuditEvent[], total: count ?? 0 }
}

export function useAuditEvents(filters: AuditFilters, page: number) {
  return useQuery({
    queryKey: [...adminKey, 'audit', filters, page],
    queryFn: () => auditQuery(filters, page * AUDIT_PAGE, page * AUDIT_PAGE + AUDIT_PAGE - 1),
  })
}

/** Up to 5,000 rows with the current filters, for the CSV export. */
export const auditExportRows = (filters: AuditFilters) => auditQuery(filters, 0, 4999)

// ─── Anomaly alerts (T6, T12; migration 117) ─────────────────────────────────

export type AlertKind =
  | 'multi_profile_access' | 'access_denied_burst'
  | 'slo_availability' | 'slo_latency' | 'slo_dashboard' | 'job_failed' | 'job_stale' | 'push_backlog' | 'test'
  | 'backup_failed' | 'backup_stale' | 'drill_failed' | 'drill_stale'
  | 'priority_report'

export interface AcademicAlert {
  id: string
  kind: AlertKind
  actor_user_id: string | null
  details: { profiles_24h?: number; denied_1h?: number; threshold?: number; actor_role?: string; job?: string; stuck?: number; run_url?: string; category?: string; first_response_due?: string }
  status: 'open' | 'acknowledged'
  acknowledged_at: string | null
  created_at: string
}

export function useAlerts() {
  return useQuery({
    queryKey: [...adminKey, 'alerts'],
    queryFn: () => rows<AcademicAlert[]>(supabase.from('academic_alerts')
      .select('id,kind,actor_user_id,details,status,acknowledged_at,created_at')
      .order('status', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50)),
  })
}

export function useAcknowledgeAlert() {
  return useAdminMutation(({ id, userId }: { id: string; userId: string }) => rows(supabase.from('academic_alerts')
    .update({ status: 'acknowledged', acknowledged_by: userId, acknowledged_at: new Date().toISOString() })
    .eq('id', id).eq('status', 'open')))
}

// ─── Health (OPS-002, migration 122) ─────────────────────────────────────────

export interface SloWindow {
  read_calls: number
  read_p95_ms: number | null
  write_calls: number
  write_p95_ms: number | null
  slowest: Array<{ rpc: string; kind: 'read' | 'write'; calls: number; p95_ms: number }> | null
  calls: number
  server_errors: number
  client_errors: number
  network_errors: number
  availability: number | null
  dashboard_loads: number
  dashboard_p75_ms: number | null
}

export interface HealthView {
  targets: { read_p95_ms: number; write_p95_ms: number; availability: number; dashboard_p75_ms: number; min_calls: number }
  hour: SloWindow
  day: SloWindow
  month: SloWindow
  series: Array<{ hour: string; read_p95_ms: number | null; write_p95_ms: number | null; calls: number; server_errors: number }>
  jobs: Array<{ job: string; schedule: string; last_run: string | null; last_status: string | null; failed_24h: number }>
  alerts: { open: number; unsent: number; last_error: string | null }
  pending_push: number
  /** Migration 123; absent until it is applied. */
  backups?: Record<'backup' | 'drill', BackupStatus>
}

// ─── Backups (OPS-003, migration 123) ────────────────────────────────────────

export interface BackupRunDetails {
  bytes?: number; tables?: number; rows?: number; migration?: string; cron_jobs?: number; problems?: number
  dump_s?: number; download_s?: number; stack_s?: number; restore_s?: number; verify_s?: number; rto_s?: number; backup_age_s?: number
  run_url?: string
}

export interface BackupStatus {
  last: { ok: boolean; finished_at: string; details: BackupRunDetails } | null
  last_success_at: string | null
  runs_30d: number
  failed_30d: number
}

export function useHealth() {
  return useQuery({
    queryKey: [...adminKey, 'health'],
    queryFn: () => callAcademicRpc<HealthView>('academic_admin_health'),
    refetchInterval: 60_000,
  })
}

/** Queues a test alert and asks the e-mail function to send it now (the 5-minute job would too). */
export function useTestAlert() {
  return useAdminMutation(async () => {
    await callAcademicRpc('academic_admin_test_alert')
    const { data, error } = await supabase.functions.invoke('academic-alerts', { body: { action: 'deliver' } })
    if (error) throw error
    return data as { claimed: number; sent: number; failed: number; skipped?: string }
  })
}

// ─── Usage metrics (ANL-002, migration 125) ──────────────────────────────────
// Counts of 1–19 students and rates over fewer than 20 arrive as null.

export interface UsageMetrics {
  generated_at: string
  timezone: string
  min_group: number
  tracking_since: string | null
  statistics: { on: number | null; off: number | null }
  weeks: Array<{
    week_start: string
    profiles_created: number | null
    onboarding_started: number | null
    onboarding_completed: number | null
    onboarding_rate: number | null
    first_entry_cohort: number | null
    first_entry_rate: number | null
    first_entry_final: boolean
  }>
  months: Array<{
    month: string
    recording_students: number | null
    active_students: number | null
    dashboard_twice_rate: number | null
    second_month_base: number | null
    second_month_rate: number | null
    entry_duration_p50_ms: number | null
    period_expected: number | null
    period_completion_rate: number | null
    complete: boolean
  }>
  cohorts: Array<{ month: string; size: number | null; m1_rate: number | null; m3_rate: number | null; m1_due: boolean; m3_due: boolean }>
  /** Migration 128: the pilot cohort the figures are for (null = everyone). */
  cohort_id?: string | null
  ratings?: Record<'usefulness' | 'entry_ease', { respondents: number | null; share_4_or_5: number | null }>
  pilot?: {
    first_entry_rate: number | null
    first_entry_cohort: number | null
    second_month_rate: number | null
    second_month_base: number | null
    returning_entry_p50_ms: number | null
    returning_entries: number | null
    usefulness_rate: number | null
    usefulness_respondents: number | null
  }
  sources: Array<{ source: string; profiles: number | null; share: number | null }>
  grades: Array<{ grade_code: string; recording_students: number | null }>
}

/** All students, or one pilot cohort (migration 128). */
export function useUsageMetrics(cohortId: string | null = null) {
  return useQuery({
    queryKey: [...adminKey, 'usage-metrics', cohortId],
    queryFn: () => callAcademicRpc<UsageMetrics>('academic_admin_usage_metrics', cohortId ? { p_cohort: cohortId } : {}),
    staleTime: 5 * 60_000,
  })
}

// ─── Pilot (REL-001, migration 128) ──────────────────────────────────────────

export interface PilotCohort {
  id: string
  code: string
  name: string
  school_id: string | null
  school_name: string | null
  max_students: number | null
  active: boolean
  created_at: string
  students: number
}

export interface PilotView { pilot_mode: boolean; cohorts: PilotCohort[] }

export function usePilot() {
  return useQuery({ queryKey: [...adminKey, 'pilot'], queryFn: () => callAcademicRpc<PilotView>('academic_admin_list_pilot') })
}

export function useSavePilotCohort() {
  return useAdminMutation((input: { id?: string; name: string; school_id: string | null; max_students: number | null; active?: boolean }) =>
    callAcademicRpc<PilotView>('academic_admin_save_pilot_cohort', { p_input: input }))
}

export function useSetPilotMode() {
  return useAdminMutation(({ enabled, reason }: { enabled: boolean; reason: string }) =>
    callAcademicRpc<PilotView>('academic_admin_set_pilot_mode', { p_enabled: enabled, p_reason: reason }))
}

// ─── Diagnostic item bank (ADMIN-007, QUIZ-005, migration 131) ───────────────

export type QuizItemStatus = 'draft' | 'in_review' | 'approved' | 'retired'

export interface QuizTopic {
  id: string
  subject_id: string
  grade_id: string
  code: string
  name_lo: string
  name_en: string
  display_order: number
  active: boolean
  subject_code: string
  grade_code: string
  approved_items: number
  open_items: number
}

export interface QuizOption { key: string; text_lo: string; text_en?: string | null }

export interface QuizItem {
  id: string
  item_key: string
  item_version: number
  topic_id: string
  stem_lo: string
  stem_en: string | null
  options: QuizOption[]
  correct_key: string
  explanation_lo: string | null
  explanation_en: string | null
  explanation_origin: 'human' | 'ai'
  licence: 'original' | 'cc-by-4.0' | 'cc-by-sa-4.0' | 'licensed'
  source: string | null
  status: QuizItemStatus
  author_name: string | null
  reviewer_name: string | null
  review_note: string | null
  reviewed_at: string | null
  updated_at: string
  /** The approved item_version of this item, if any. */
  live_version: number | null
  /** Field -> what stops it going to review; empty when complete. */
  problems: Record<string, string>
  can_approve: boolean
}

export interface QuizBank { four_eyes: boolean; topics: QuizTopic[]; items: QuizItem[] }

export type QuizItemInput = Pick<QuizItem, 'topic_id' | 'stem_lo' | 'stem_en' | 'options' | 'correct_key' | 'explanation_lo' | 'explanation_en' | 'explanation_origin' | 'licence' | 'source'>
  & { id?: string; item_key?: string }

/** status: every version in that status (e.g. approved items for a diagnostic); otherwise the newest version per item. */
export function useQuizBank(status?: QuizItemStatus) {
  return useQuery({
    queryKey: [...adminKey, 'quiz-bank', status ?? 'newest'],
    queryFn: () => callAcademicRpc<QuizBank>('academic_admin_list_quiz_bank', status ? { p_filter: { status } } : {}),
  })
}

export function useSaveQuizTopic() {
  return useAdminMutation((input: Pick<QuizTopic, 'subject_id' | 'grade_id' | 'code' | 'name_lo' | 'name_en' | 'active'> & { id?: string; display_order?: number }) =>
    callAcademicRpc<QuizBank>('academic_admin_save_quiz_topic', { p_input: input }))
}

export function useSaveQuizItem() {
  return useAdminMutation((input: QuizItemInput) => callAcademicRpc<QuizItem>('academic_admin_save_quiz_item', { p_input: input }))
}

export function useReviewQuizItem() {
  return useAdminMutation(({ id, action, note }: { id: string; action: 'submit' | 'approve' | 'return' | 'retire'; note?: string }) =>
    callAcademicRpc<QuizItem>('academic_admin_review_quiz_item', { p_item_id: id, p_action: action, p_note: note ?? null }))
}

// ─── Diagnostics (QUIZ-001, migration 132) ───────────────────────────────────

export interface AdminDiagnostic {
  id: string
  subject_id: string
  grade_id: string
  subject_code: string
  grade_code: string
  /** QUIZ-004: the main form this is a parallel form of. */
  parallel_of: string | null
  title_lo: string
  title_en: string
  status: 'draft' | 'published' | 'retired'
  published_at: string | null
  item_ids: string[]
  problems: Record<string, string>
  attempts: number
  completed: number
}

export interface DiagnosticsView {
  rules: { min_items: number; max_items: number; min_per_topic: number; resume_days: number; retake_days?: number }
  diagnostics: AdminDiagnostic[]
}

export function useDiagnostics() {
  return useQuery({ queryKey: [...adminKey, 'diagnostics'], queryFn: () => callAcademicRpc<DiagnosticsView>('academic_admin_list_diagnostics') })
}

export function useSaveDiagnostic() {
  return useAdminMutation((input: Pick<AdminDiagnostic, 'subject_id' | 'grade_id' | 'title_lo' | 'title_en' | 'item_ids' | 'parallel_of'> & { id?: string }) =>
    callAcademicRpc<DiagnosticsView>('academic_admin_save_diagnostic', { p_input: input }))
}

export function useSetDiagnosticStatus() {
  return useAdminMutation(({ id, action, note }: { id: string; action: 'publish' | 'retire'; note?: string }) =>
    callAcademicRpc<DiagnosticsView>('academic_admin_set_diagnostic_status', { p_diagnostic_id: id, p_action: action, p_note: note ?? null }))
}

// ─── Problem reports (PRIV-008, migration 133) ───────────────────────────────

export interface ProblemReport {
  id: string
  category: 'guardian_link' | 'ai_answer' | 'account_misuse' | 'other'
  priority: 'priority' | 'normal'
  screen: string | null
  description: string
  status: 'open' | 'in_progress' | 'resolved'
  first_response_due: string
  responded_at: string | null
  overdue: boolean
  reporter_member_code: string | null
  handled_by_name: string | null
  resolution_note: string | null
  resolved_at: string | null
  created_at: string
}

/** status: undefined = open and in progress; 'all' or one status otherwise. */
export function useProblemReports(status?: 'all' | ProblemReport['status']) {
  return useQuery({
    queryKey: [...adminKey, 'reports', status ?? 'active'],
    queryFn: () => callAcademicRpc<ProblemReport[]>('academic_support_list_reports', status ? { p_status: status } : {}),
  })
}

export function useUpdateProblemReport() {
  return useAdminMutation(({ id, status, note }: { id: string; status: 'in_progress' | 'resolved'; note?: string }) =>
    callAcademicRpc<{ id: string; status: string }>('academic_support_update_report', { p_report_id: id, p_status: status, p_note: note ?? null }))
}

// ─── Content catalogue (LEARN-004, migration 135) ────────────────────────────

export type ContentKind = 'academy_lesson' | 'academy_challenge' | 'practice_set'

export interface ExternalContent { title_lo: string; title_en: string; available: boolean; route: string; membership: boolean }

export interface ContentItem {
  id: string
  kind: ContentKind
  external_id: string
  subject_ids: string[]
  grade_min: number
  grade_max: number
  topic_ids: string[]
  difficulty: 1 | 2 | 3
  language: 'lo' | 'en'
  est_minutes: number
  objectives_lo: string[]
  objectives_en: string[]
  quality_score: number | null
  status: 'draft' | 'published' | 'retired'
  published_at: string | null
  /** The Academy lesson, challenge or quiz topic it points at (null if it no longer exists). */
  external: ExternalContent | null
  subject_codes: string[]
  topic_names: string[]
}

export interface ExternalCandidate { id: string; title_en: string; title_lo: string; detail: string; available: boolean; tagged: boolean }

export type ContentInput = Omit<ContentItem, 'id' | 'published_at' | 'external' | 'subject_codes' | 'topic_names'> & { id?: string }

export function useContentItems() {
  return useQuery({ queryKey: [...adminKey, 'content'], queryFn: () => callAcademicRpc<ContentItem[]>('academic_admin_list_content') })
}

export function useExternalContent(kind: ContentKind, search: string) {
  return useQuery({
    queryKey: [...adminKey, 'content-search', kind, search],
    queryFn: () => callAcademicRpc<ExternalCandidate[]>('academic_admin_search_external_content', { p_kind: kind, p_search: search }),
  })
}

export function useSaveContent() {
  return useAdminMutation((input: ContentInput) => callAcademicRpc<ContentItem>('academic_admin_save_content', { p_input: input }))
}

// ─── Content gaps (LEARN-003, migration 136) ─────────────────────────────────

export interface ContentGap { rule_id: 'R3' | 'R4' | 'R7'; subject_code: string | null; grade_code: string | null; topic_id: string | null; topic_name: string | null; students: number; last_seen: string }

export function useContentGaps() {
  return useQuery({ queryKey: [...adminKey, 'content-gaps'], queryFn: () => callAcademicRpc<ContentGap[]>('academic_admin_content_gaps') })
}

// ─── OCR quality (ADMIN-008, migration 140) ──────────────────────────────────

export interface OcrQuality {
  days: number
  daily: { day: string; model_id: string; prompt_version: string; jobs: number; failed: number; abandoned: number; confirmed: number; latency_p50_ms: number | null; latency_p95_ms: number | null; cost_usd: number }[]
  errors: { error_code: string | null; count: number }[]
  subjects: { subject_code: string; fields: number; edited: number; correction_rate: number }[]
  last_7_days: {
    jobs: number; failed: number; fields: number; edited: number
    failure_rate: number | null; correction_rate: number | null
    alerts: ('correction_rate' | 'failure_rate')[]
    thresholds: { correction_rate?: number; failure_rate?: number; min_fields?: number; min_jobs?: number }
  }
}

export function useOcrQuality(days = 30) {
  return useQuery({
    queryKey: [...adminKey, 'ocr-quality', days],
    queryFn: () => callAcademicRpc<OcrQuality>('academic_admin_ocr_quality', { p_days: days }),
    staleTime: 5 * 60_000,
  })
}

// ─── Entitlements (BILLING-007, migration 141) ───────────────────────────────

export interface EntitlementGrant {
  id: string
  feature_code: string
  source: 'manual_grant' | 'trial' | 'one_time_purchase'
  reason_code: string
  note: string | null
  reference: string | null
  amount_lak: number | null
  starts_at: string
  ends_at: string
  created_at: string
  granted_by: string | null
  revoked_at: string | null
  revoked_by: string | null
  revoke_reason: string | null
  active: boolean
}

export interface MemberEntitlements {
  user: { id: string; name: string; member_code: string | null }
  subscriptions: { plan: string; price_lak: number; status: string; starts_at: string | null; ends_at: string | null }[]
  entitlements: import('./api').Entitlements
  grants: EntitlementGrant[]
}

export interface GrantInput {
  feature_code: string
  source: EntitlementGrant['source']
  reason_code: string
  ends_at: string
  note?: string
  reference?: string
  amount_lak?: number
}

export const lookupMemberEntitlements = (memberCode: string) =>
  callAcademicRpc<MemberEntitlements>('academic_admin_member_entitlements', { p_member_code: memberCode })

export const grantEntitlement = (userId: string, input: GrantInput) =>
  callAcademicRpc<EntitlementGrant>('academic_admin_grant_entitlement', { p_user_id: userId, p_input: input })

export const revokeEntitlement = (grantId: string, reason: string) =>
  callAcademicRpc<EntitlementGrant>('academic_admin_revoke_entitlement', { p_grant_id: grantId, p_reason: reason })

// ─── AI Coach review (ADMIN-009, migration 145) ──────────────────────────────

export interface AiReviewItem {
  id: string
  conversation_id: string
  rating: -1 | 1 | null
  report_category: 'wrong_numbers' | 'unsafe' | 'not_lao' | 'other' | null
  priority: boolean
  /** 'sample': picked by the weekly random sample (migration 146). */
  source: 'student' | 'sample'
  sample_week: string | null
  share_text: boolean
  comment: string | null
  status: 'open' | 'reviewed'
  created_at: string
  question: string | null
  answer: string | null
  prompt_version: string | null
  model_id: string | null
  numbers_checked: boolean | null
  safety_category: string | null
  review: { accuracy: number; lao: number; safety: number; note: string | null; at: string; by: string | null } | null
}

export interface AiReview {
  items: AiReviewItem[]
  last_7_days: { answers: number; safety_redirects: number; numbers_fallbacks: number; thumbs_up: number; thumbs_down: number; provider_failures: number }
  sample: { week: string | null; items: number; consenting_students: number; rule: { rate: number; minimum: number } | null }
  /** Reviewed items of the last 90 days by prompt version and model (feeds AI-010). */
  ratings: { prompt_version: string | null; model_id: string; reviewed: number; accuracy: number; lao: number; safety: number }[]
}

export function useAiReview(status: 'open' | 'reviewed') {
  return useQuery({
    queryKey: [...adminKey, 'ai-review', status],
    queryFn: () => callAcademicRpc<AiReview>('academic_admin_ai_review', { p_status: status }),
  })
}

export function useRateAi() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, accuracy, lao, safety, note }: { id: string; accuracy: number; lao: number; safety: number; note?: string }) =>
      callAcademicRpc<{ id: string; status: string }>('academic_admin_rate_ai', { p_feedback_id: id, p_input: { accuracy, lao, safety, note } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...adminKey, 'ai-review'] }),
  })
}

// ─── Career catalogue (ADMIN-010, UNI-001/002/004; migration 148) ────────────

export type CareerKind = 'career' | 'institution' | 'programme' | 'scholarship' | 'exam_blueprint'
export type CareerStatus = 'draft' | 'in_review' | 'published' | 'archived'

/** A sourced, dated fact (UNI-002). Requirements and cut-offs also need academic_year (UNI-004). */
export interface CareerFact {
  kind: string
  text_en: string
  text_lo: string
  source_name: string
  source_url: string
  verified_on: string
  review_by: string
  academic_year?: string
}

export interface CareerRecord {
  id: string
  kind: CareerKind
  slug: string
  status: CareerStatus
  draft: Record<string, unknown>
  published: Record<string, unknown> | null
  /** The working copy differs from what students see. */
  changed: boolean
  problems: Record<string, string>
  review_by: string | null
  published_review_by: string | null
  author: string | null
  last_edited_by: string | null
  reviewed_by: string | null
  review_note: string | null
  submitted_at: string | null
  published_at: string | null
  updated_at: string
  can_approve: boolean
}

export interface CareerContentView {
  items: CareerRecord[]
  clusters: string[]
  subjects: { code: string; name_en: string }[]
  institutions: { slug: string; name_en: string }[]
  careers: { slug: string; title_en: string }[]
  /** The intake the current Grade 12 sits the entrance exam for (migration 164). */
  exam_intake_year: string | null
}

export function useCareerContent(kind: CareerKind) {
  return useQuery({
    queryKey: [...adminKey, 'career-content', kind],
    queryFn: () => callAcademicRpc<CareerContentView>('academic_admin_career_content', { p_kind: kind }),
  })
}

export function useCareerDue() {
  return useQuery({
    queryKey: [...adminKey, 'career-due'],
    queryFn: () => callAcademicRpc<{ id: string; kind: CareerKind; slug: string; name: string; review_by: string; overdue: boolean }[]>('academic_admin_career_due'),
  })
}

export function useSaveCareerContent() {
  return useAdminMutation((input: { id?: string; kind: CareerKind; slug?: string; data: Record<string, unknown> }) =>
    callAcademicRpc<CareerRecord>('academic_admin_save_career_content', { p_input: input }))
}

export function useReviewCareerContent() {
  return useAdminMutation(({ id, action, note }: { id: string; action: 'submit' | 'approve' | 'return' | 'archive' | 'restore'; note?: string }) =>
    callAcademicRpc<CareerRecord>('academic_admin_review_career_content', { p_id: id, p_action: action, p_note: note ?? null }))
}

// ─── Guardian links (PARENT-008, migration 152) ──────────────────────────────

export interface SupportGuardianLink {
  id: string
  status: 'pending_student' | 'active' | 'paused' | 'suspended' | 'removed'
  purpose: 'link' | 'consent'
  relationship: string
  scopes: Record<string, boolean>
  guardian_name: string | null
  declared_at: string
  confirmed_at: string | null
  removed_at: string | null
  removed_by: string | null
  cases: { action: 'suspend' | 'reinstate'; reason: string; note: string; at: string; by: string | null }[]
}

export const supportGuardianLinks = (profileId: string) => callAcademicRpc<SupportGuardianLink[]>('academic_support_guardian_links', { p_profile_id: profileId })
export const suspendGuardianLink = (linkId: string, reason: string, note: string) =>
  callAcademicRpc('academic_support_suspend_guardian_link', { p_link_id: linkId, p_reason: reason, p_note: note })
export const reinstateGuardianLink = (linkId: string, note: string) => callAcademicRpc('academic_admin_reinstate_guardian_link', { p_link_id: linkId, p_note: note })

// ─── Career report purchases (BILLING-004, migration 157) ────────────────────

export interface ReportPurchaseRow {
  id: string
  amount_lak: number
  status: 'pending' | 'review' | 'verified' | 'rejected' | 'cancelled'
  receipt_path: string | null
  reference: string | null
  rejection_reason: string | null
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  valid_until: string | null
  buyer: { name: string | null; member_code: string | null } | null
}

export function useReportPurchases(status: 'review' | 'verified' | 'rejected') {
  return useQuery({ queryKey: [...adminKey, 'report-purchases', status], queryFn: () => callAcademicRpc<ReportPurchaseRow[]>('academic_admin_report_purchases', { p_status: status }) })
}

export function useReviewReportPurchase() {
  return useAdminMutation(({ id, action, reference, reason }: { id: string; action: 'verify' | 'reject'; reference?: string; reason?: string }) =>
    callAcademicRpc<ReportPurchaseRow>('academic_admin_review_report_purchase', { p_purchase_id: id, p_action: action, p_reference: reference ?? null, p_reason: reason ?? null }))
}

/** A 5-minute link to a receipt (staff may read the bucket). */
export async function receiptUrl(path: string) {
  const { data, error } = await supabase.storage.from('premium-payment-proofs').createSignedUrl(path, 300)
  if (error) throw error
  return data.signedUrl
}
