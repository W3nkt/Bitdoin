import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { AcademicError } from './errors'
import { callAcademicRpc, shouldRetryAcademic } from './rpc'
import { academicKeys } from './session'
import { resumeUsageEvents, useTrackUsage } from './usageEvents'

// Data access for the My Scores screens. Configuration (grades, subjects,
// settings) is read straight from its tables; everything about the student
// goes through RPCs (OD-01c).

export type AgeBand = '13_15' | '16_17' | '18_plus'

export interface AcademicGrade {
  id: string
  code: string
  ordinal: number
  level: 'lower_secondary' | 'upper_secondary'
  label_lo: string
  label_en: string
}

export interface AcademicSubject {
  id: string
  code: string
  name_lo: string
  name_en: string
  grade_min: number
  grade_max: number
  is_default: boolean
}

export interface AcademicYear {
  id: string
  code: string
  start_date: string
  end_date: string
}

export interface AcademicConfig {
  grades: AcademicGrade[]
  subjects: AcademicSubject[]
  activeYear: AcademicYear | null
  maxSubjects: number
  /** REL-001 (migration 128): set-up needs a pilot invite code. */
  pilotMode: boolean
}

export interface SchoolMatch {
  id: string
  name_lo: string
  name_en: string | null
  romanised_name: string | null
  province_code: string
  district_code: string | null
  latitude: number | null
  longitude: number | null
}

/** Subject chosen during onboarding or when editing subjects. */
export type SubjectItem = { subject_id: string } | { custom_name: string; id?: string }

export interface ProfileInput {
  display_name: string
  age_band: AgeBand
  province_code: string
  district_code?: string | null
  grade_id: string
  school_id?: string
  school_free_text?: string
  subjects?: SubjectItem[]
  goals?: { chips?: string[]; text?: string } | null
  interest_subject_codes?: string[]
  notice_version: string
  pilot_code?: string
}

export interface MyDataSummary {
  profile: {
    id: string
    display_name: string
    age_band: AgeBand
    province_code: string
    district_code: string | null
    goals: { chips?: string[]; text?: string } | null
    interest_subject_codes: string[] | null
    status: 'active' | 'read_only' | 'deletion_pending'
    version: number
  }
  counts: {
    enrolments: number
    score_entries_submitted: number
    score_entries_draft: number
    scores: number
    corrections: number
    uploads: number
    guardian_links: number
  }
  consents: { id: string; purpose: string; notice_version: string; granted_at: string; withdrawn_at: string | null }[]
  deletion: { status: string; deletion_scope: string | null; deletion_requested_at: string | null; deletion_scheduled_for: string | null }
}

export type TransitionKind = 'promoted' | 'repeated' | 'transferred' | 'left' | 'started'

export interface TransitionInput {
  kind: TransitionKind
  grade_id?: string
  school_id?: string
  school_free_text?: string
  effective_period_seq?: number
  subjects?: SubjectItem[]
}

async function readSetting<T>(key: string, fallback: T): Promise<T> {
  const { data, error } = await supabase.from('academic_settings').select('value').eq('key', key).maybeSingle()
  if (error) throw error
  return (data?.value as T | undefined) ?? fallback
}

/** Grades the module supports now, the subject catalogue and the current year. */
export function useAcademicConfig(enabled = true) {
  return useQuery({
    queryKey: [...academicKeys.all, 'config'],
    enabled,
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<AcademicConfig> => {
      const [grades, subjects, year, levels, maxSubjects, pilotMode] = await Promise.all([
        supabase.from('academic_grades').select('id,code,ordinal,level,label_lo,label_en').eq('status', 'active').order('ordinal'),
        supabase.from('academic_subjects').select('id,code,name_lo,name_en,grade_min,grade_max,is_default').eq('status', 'active').order('code'),
        supabase.from('academic_years').select('id,code,start_date,end_date').eq('status', 'active').maybeSingle(),
        readSetting<string[]>('allowed_grade_levels', ['upper_secondary']),
        readSetting<number>('max_subjects_per_enrolment', 25),
        readSetting<boolean>('pilot_mode', false),
      ])
      for (const result of [grades, subjects, year]) if (result.error) throw result.error
      return {
        grades: ((grades.data ?? []) as AcademicGrade[]).filter(grade => levels.includes(grade.level)),
        subjects: (subjects.data ?? []) as AcademicSubject[],
        activeYear: (year.data ?? null) as AcademicYear | null,
        maxSubjects: Number(maxSubjects) || 25,
        pilotMode: pilotMode === true,
      }
    },
  })
}

/** Default subjects for a grade (PROFILE-003). */
export function defaultSubjectsFor(subjects: AcademicSubject[], grade: AcademicGrade | undefined) {
  if (!grade) return []
  return subjects.filter(subject => subject.is_default && grade.ordinal >= subject.grade_min && grade.ordinal <= subject.grade_max)
}

export function useSchoolSearch(query: string, provinceCode: string | null, districtCode: string | null = null) {
  const trimmed = query.trim()
  return useQuery({
    queryKey: [...academicKeys.all, 'schools', trimmed.toLowerCase(), provinceCode, districtCode],
    enabled: trimmed.length >= 2 || (trimmed.length === 0 && !!provinceCode),
    staleTime: 5 * 60_000,
    retry: shouldRetryAcademic,
    queryFn: () => callAcademicRpc<SchoolMatch[]>('academic_search_schools', {
      p_query: trimmed,
      p_province_code: provinceCode,
      p_district_code: districtCode,
      p_limit: 20,
    }),
  })
}

function useInvalidateAcademic() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: academicKeys.all })
}

export function useCreateProfile() {
  const invalidate = useInvalidateAcademic()
  return useMutation({
    mutationFn: (input: ProfileInput) => callAcademicRpc<{ created: boolean; profile_id: string; enrolment_id: string | null }>(
      'academic_create_profile', { p_input: input },
    ),
    onSuccess: invalidate,
  })
}

/** Checks a pilot invite code; resolves with the cohort's name. */
export const checkPilotCode = (code: string) => callAcademicRpc<{ code: string; name: string }>('academic_check_pilot_code', { p_code: code })

export function useGrantConsent() {
  const invalidate = useInvalidateAcademic()
  return useMutation({
    mutationFn: ({ purpose, noticeVersion }: { purpose: string; noticeVersion: string }) =>
      callAcademicRpc('academic_grant_consent', { p_purpose: purpose, p_notice_version: noticeVersion }),
    onSuccess: () => {
      // Agreeing to the notice can switch usage statistics on (migration 124).
      resumeUsageEvents()
      return invalidate()
    },
  })
}

export function useTransitionEnrolment() {
  const invalidate = useInvalidateAcademic()
  const track = useTrackUsage()
  return useMutation({
    mutationFn: (input: TransitionInput) => callAcademicRpc<{ closed_enrolment_id: string | null; enrolment_id: string | null }>(
      'academic_transition_enrolment', { p_input: input },
    ),
    onSuccess: (_result, input) => {
      track('enrolment_transitioned', { type: input.kind })
      return invalidate()
    },
  })
}

export function useMyDataSummary(enabled = true) {
  return useQuery({
    queryKey: [...academicKeys.all, 'my-data'],
    enabled,
    retry: shouldRetryAcademic,
    queryFn: () => callAcademicRpc<MyDataSummary>('academic_get_my_data_summary'),
  })
}

export function useUpdateProfile() {
  const invalidate = useInvalidateAcademic()
  return useMutation({
    mutationFn: ({ version, changes }: { version: number; changes: Partial<Omit<ProfileInput, 'notice_version' | 'grade_id' | 'school_id' | 'school_free_text' | 'subjects'>> }) =>
      callAcademicRpc<{ profile_id: string; version: number }>('academic_update_profile', { p_expected_version: version, p_changes: changes }),
    onSuccess: invalidate,
  })
}

export interface HistoryEnrolment {
  enrolment_id: string
  academic_year: string
  grade: { code: string; label_lo: string; label_en: string }
  school: { id: string | null; name_lo: string | null; name_en: string | null; verification: 'verified' | 'unverified_school' }
  state: 'active' | 'closed'
  closed_reason: string | null
  read_only: boolean
  scale?: ScoreEntryView['scale']
  terms?: HistoryTerm[]
}

export interface HistoryPeriod {
  id: string
  key: string
  period_type: string
  term_no: number | null
  sequence: number
  label_lo: string
  label_en: string
  start_date: string
  end_date: string
  entry: { id: string; state: 'draft' | 'submitted'; submitted_at: string | null; source: string }
  lines: { subject_enrolment_id: string; code: string | null; name_lo: string; name_en: string; line: EntryLine | null }[]
}

export interface HistoryTerm {
  term_no: number | null
  periods: HistoryPeriod[]
}

/** Every school year the student recorded, newest first (SCORE-010). */
export function useAcademicHistory(enabled = true) {
  return useQuery({
    queryKey: [...academicKeys.all, 'history'],
    enabled,
    retry: shouldRetryAcademic,
    queryFn: () => callAcademicRpc<{ enrolments: HistoryEnrolment[] }>('academic_get_history'),
  })
}

export interface PeriodOption {
  id: string
  key: string
  period_type: string
  term_no?: number | null
  sequence: number
  label_lo: string
  label_en: string
  state: 'empty' | 'draft' | 'submitted'
  disabled: boolean
}

export function usePeriods(enrolmentId: string | null | undefined) {
  return useQuery({
    queryKey: [...academicKeys.all, 'periods', enrolmentId],
    enabled: !!enrolmentId,
    retry: shouldRetryAcademic,
    queryFn: () => callAcademicRpc<{ enrolment_id: string; read_only: boolean; periods: PeriodOption[]; suggested_period_id: string | null }>(
      'academic_list_periods', { p_enrolment_id: enrolmentId },
    ),
  })
}

export interface EntryLine {
  id: string
  status: 'scored' | 'missing' | 'not_applicable' | 'exempt'
  value: number | string | null
  normalised_value: number | null
  source: 'manual' | 'ocr_confirmed' | 'school_import'
  verification: 'self_reported' | 'guardian_acknowledged' | 'school_verified'
  edited: boolean
  version: number
}

export interface ScoreEntryView {
  enrolment_id: string
  period: { id: string; key: string; period_type: string; term_no: number | null; sequence: number; label_lo: string; label_en: string; start_date: string; end_date: string }
  scale: {
    id: string; code: string; version: number; family: 'numeric_linear' | 'ordinal' | 'pass_fail'
    min: number | null; max: number | null; step: number | null; decimals: number; pass_mark: number | null; normalisable: boolean
    levels: { code: string; label_lo?: string; label_en?: string }[] | null
  }
  read_only: boolean
  entry: { id: string; state: 'draft' | 'submitted'; version: number; source: string; submitted_at: string | null } | null
  subjects: { subject_enrolment_id: string; code: string | null; name_lo: string; name_en: string; line: EntryLine | null }[]
  replayed?: boolean
}

export interface WireLine {
  subject_enrolment_id: string
  status?: 'scored' | 'missing' | 'not_applicable' | 'exempt'
  value?: string | number
  clear?: boolean
}

export function useScoreEntry(enrolmentId: string | null | undefined, periodId: string | null | undefined) {
  return useQuery({
    queryKey: [...academicKeys.all, 'entry', enrolmentId, periodId],
    enabled: !!enrolmentId && !!periodId,
    retry: shouldRetryAcademic,
    staleTime: 0,
    queryFn: () => callAcademicRpc<ScoreEntryView>('academic_get_score_entry', { p_enrolment_id: enrolmentId, p_period_id: periodId }),
  })
}

export const saveServerDraft = (enrolmentId: string, periodId: string, lines: WireLine[]) =>
  callAcademicRpc<ScoreEntryView>('academic_save_draft', { p_enrolment_id: enrolmentId, p_period_id: periodId, p_lines: lines })

export const submitScoreEntry = (enrolmentId: string, periodId: string, lines: WireLine[], idempotencyKey: string) =>
  callAcademicRpc<ScoreEntryView>('academic_submit_score_entry', {
    p_enrolment_id: enrolmentId, p_period_id: periodId, p_lines: lines, p_idempotency_key: idempotencyKey,
  })

export function useCorrectLine() {
  const queryClient = useQueryClient()
  const track = useTrackUsage()
  return useMutation({
    mutationFn: ({ lineId, version, line, reason }: { lineId: string; version: number; line: Pick<WireLine, 'status' | 'value'>; reason?: string }) =>
      callAcademicRpc<EntryLine>('academic_correct_score_line', { p_line_id: lineId, p_expected_version: version, p_line: line, p_reason: reason ?? null }),
    onSuccess: (_line, { reason }) => {
      track('score_line_edited', { reason_given: !!reason?.trim() })
      return queryClient.invalidateQueries({ queryKey: academicKeys.all })
    },
  })
}

export interface Revision {
  old_value: number | string | null
  new_value: number | string | null
  old_status: string
  new_status: string
  changed_by: 'student' | 'admin' | 'system'
  reason: string | null
  changed_at: string
}

export function useLineRevisions(lineId: string | null) {
  return useQuery({
    queryKey: [...academicKeys.all, 'revisions', lineId],
    enabled: !!lineId,
    retry: shouldRetryAcademic,
    queryFn: () => callAcademicRpc<{ score_line_id: string; revisions: Revision[] }>('academic_get_line_revisions', { p_line_id: lineId }),
  })
}

// ─── Dashboard (BE-004 snapshot, FE-005) ─────────────────────────────────────

export type Direction = 'up' | 'down' | 'same'
export interface Change { value: number; direction: Direction; compared_period_id: string; skipped_periods?: number }

export interface DashboardPeriod {
  period_id: string
  sequence: number
  key: string
  label_lo: string
  label_en: string
  recorded: number
  active: number
  missing: number
  coverage: number | null
  mean: number | null
  change: Change | null
  rolling_mean: number | null
}

export interface DashboardSubject {
  subject_enrolment_id: string
  code: string | null
  name_lo: string
  name_en: string
  display_order: number
  active: boolean
  series: { period_id: string; sequence: number; status: EntryLine['status']; value: number | string | null }[]
  window_n: number
  mean: number | null
  latest: { period_id: string; sequence: number; status: EntryLine['status']; value: number | string | null } | null
  change: Change | null
  /** Engine v2 (migration 129); absent while insights_enabled is off (migration 130), null on ordinal scales. */
  label?: SubjectLabel | null
  trend?: SubjectTrend | null
}

export type Confidence = 'high' | 'medium' | 'low'

/** ANALYSIS-002: the subject against the student's own period means, last 6 periods. */
export interface SubjectLabel {
  value: 'insufficient_evidence' | 'relatively_stronger' | 'relatively_lower' | 'neutral'
  confidence: Confidence | null
  rule: string
  /** Periods in the window that have both a score and a shown average. */
  n: number
  mean_deviation: number | null
  periods_above: number
  periods_below: number
}

/** ANALYSIS-003: direction over the whole school year (CALC-4). */
export interface SubjectTrend {
  value: 'insufficient_evidence' | 'volatile' | 'improving' | 'declining' | 'no_clear_trend'
  confidence: Confidence | null
  rule: string
  n: number
  slope: number | null
  p: number | null
  sd: number | null
  direction: 'up' | 'down' | 'flat' | null
}

export interface DashboardView {
  snapshot_id: string
  snapshot_created_at: string
  enrolment: {
    id: string; academic_year: string; state: 'active' | 'closed'; read_only: boolean
    grade: { code: string; label_lo: string; label_en: string }
    school: { name_lo: string | null; name_en: string | null; verification: string }
    closed_reason: string | null; start_period_seq: number; end_period_seq: number | null
  }
  engine_version: string
  numeric: boolean
  scale: ScoreEntryView['scale']
  about_same_band: number
  periods: DashboardPeriod[]
  subjects: DashboardSubject[]
  summary: { latest_period_id: string; mean: number | null; coverage: { recorded: number; active: number }; missing: number; change: Change | null; rolling_mean: number | null } | null
  /** Set when shown from this device's cache because the network failed. */
  stale_since?: number
  /** P3-BIL: labels and trends carry their verdict only, without evidence or confidence (migration 142). */
  detail_locked?: boolean
}

/**
 * The current analysis snapshot. When the network fails, the last copy
 * loaded on this device (same account) is returned with stale_since.
 */
export function useDashboard(userId: string, enrolmentId: string | null) {
  return useQuery({
    queryKey: [...academicKeys.all, 'dashboard', enrolmentId],
    retry: shouldRetryAcademic,
    queryFn: async (): Promise<DashboardView> => {
      const cacheKey = `${userId}:dashboard:${enrolmentId ?? 'current'}`
      const { loadCached, saveCached } = await import('./drafts')
      try {
        const view = await callAcademicRpc<DashboardView>('academic_get_dashboard', { p_enrolment_id: enrolmentId })
        void saveCached({ key: cacheKey, userId, value: view, savedAt: Date.now() })
        return view
      } catch (error) {
        const offline = !navigator.onLine || (error instanceof Error && 'code' in error && (error as { code: string }).code === 'UNKNOWN')
        const cached = offline ? await loadCached<DashboardView>(cacheKey, userId) : undefined
        if (cached) return { ...cached.value, stale_since: cached.savedAt }
        throw error
      }
    },
  })
}

// ─── Privacy (FE-006): consent, export, deletion ─────────────────────────────

export function useWithdrawConsent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (purpose: string) => callAcademicRpc('academic_withdraw_consent', { p_purpose: purpose }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: academicKeys.all }),
  })
}

/** Turns on an optional purpose from My data, such as letting reviewers read Coach chats (migration 146). */
export function useGrantOptionalConsent() {
  const invalidate = useInvalidateAcademic()
  return useMutation({
    mutationFn: ({ purpose, noticeVersion }: { purpose: string; noticeVersion: string }) =>
      callAcademicRpc('academic_grant_consent', { p_purpose: purpose, p_notice_version: noticeVersion }),
    onSuccess: invalidate,
  })
}

/** Usage statistics back on (migration 124): the app starts sending again. */
export function useGrantUsageStatistics() {
  const invalidate = useInvalidateAcademic()
  return useMutation({
    mutationFn: (noticeVersion: string) => callAcademicRpc('academic_grant_consent', { p_purpose: 'usage_statistics', p_notice_version: noticeVersion }),
    onSuccess: () => {
      resumeUsageEvents()
      return invalidate()
    },
  })
}

export const exportMyData = async (): Promise<import('./exportZip').ExportData> => {
  const [data, quizzes, reports, recommendations, guidance, scholarships, careerReports] = await Promise.all([
    callAcademicRpc<import('./exportZip').ExportData>('academic_export_my_data'),
    // Diagnostic quiz attempts (migration 132) and problem reports (133) come from their own RPCs.
    callAcademicRpc<{ attempts?: Record<string, unknown>[]; practice?: Record<string, unknown>[] } | null>('academic_export_my_quizzes'),
    callAcademicRpc<{ reports: Record<string, unknown>[] } | null>('academic_export_my_reports'),
    // Next actions shown and feedback on them (migration 138).
    callAcademicRpc<Record<string, unknown> | null>('academic_export_my_recommendations'),
    // Study planner, Coach "My scores" chats and career guidance (migration 150).
    callAcademicRpc<{ planner?: Record<string, unknown>; coach?: Record<string, unknown>; careers?: Record<string, unknown> } | null>('academic_export_my_guidance'),
    // Saved scholarships (migration 155) go with careers.
    callAcademicRpc<Record<string, unknown>[] | null>('academic_export_my_scholarships'),
    // Career reports (migration 157) too.
    callAcademicRpc<Record<string, unknown>[] | null>('academic_export_my_career_reports'),
  ])
  return {
    ...data, quizzes: { attempts: quizzes?.attempts ?? [], practice: quizzes?.practice ?? [] }, reports: reports?.reports ?? [], recommendations: recommendations ?? { shown: [], feedback: [] },
    planner: guidance?.planner ?? {}, coach: guidance?.coach ?? {}, careers: { ...(guidance?.careers ?? {}), scholarships: scholarships ?? [], reports: careerReports ?? [] },
  }
}

export interface DeletionStatus {
  status: 'active' | 'read_only' | 'deletion_pending'
  deletion_scope: 'scores' | 'profile' | null
  deletion_requested_at: string | null
  deletion_scheduled_for: string | null
}

export function useRequestDeletion() {
  const queryClient = useQueryClient()
  const track = useTrackUsage()
  return useMutation({
    mutationFn: (scope: 'scores' | 'profile') => callAcademicRpc<DeletionStatus>('academic_request_deletion', { p_scope: scope }),
    onSuccess: () => {
      track('deletion_requested', {})
      return queryClient.invalidateQueries({ queryKey: academicKeys.all })
    },
  })
}

export function useCancelDeletion() {
  const queryClient = useQueryClient()
  const track = useTrackUsage()
  return useMutation({
    mutationFn: () => callAcademicRpc<DeletionStatus>('academic_cancel_deletion'),
    onSuccess: () => {
      track('deletion_cancelled', {})
      return queryClient.invalidateQueries({ queryKey: academicKeys.all })
    },
  })
}

// ─── Reminders (BE-009, #27) ─────────────────────────────────────────────────

export interface AcademicNotification {
  id: string
  category: 'score_reminder' | 'guardian_link' | 'guardian_report' | 'scholarship_deadline'
  code: 'score_reminder.first' | 'score_reminder.second' | string
  /** Reminders carry the period; guardian notices (migration 152) the other person's name. */
  payload: { enrolment_id?: string; period_id?: string; period_key?: string; period_label_lo?: string; period_label_en?: string; guardian?: string; student?: string; relationship?: string; name_en?: string; name_lo?: string; deadline?: string; days?: number }
  channel: 'in_app' | 'push'
  state: 'sent' | 'read'
  created_at: string
  read_at: string | null
}

export interface NotificationPage {
  items: AcademicNotification[]
  unread_count: number
  next_before: string | null
}

const notificationsKey = [...academicKeys.all, 'notifications'] as const

/** The inbox, newest first, 20 at a time. Page 1 also carries the unread count. */
export function useNotifications(enabled = true) {
  return useInfiniteQuery({
    queryKey: notificationsKey,
    enabled,
    retry: shouldRetryAcademic,
    staleTime: 60_000,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => callAcademicRpc<NotificationPage>('academic_list_notifications', { p_limit: 20, p_before: pageParam }),
    getNextPageParam: last => last.next_before,
  })
}

export const unreadCount = (data: InfiniteData<NotificationPage> | undefined) => data?.pages[0]?.unread_count ?? 0

function useUpdateInbox() {
  const queryClient = useQueryClient()
  return (change: (item: AcademicNotification) => AcademicNotification | null, unread?: number) =>
    queryClient.setQueryData<InfiniteData<NotificationPage>>(notificationsKey, data => data && {
      ...data,
      pages: data.pages.map((page, index) => ({
        ...page,
        items: page.items.flatMap(item => change(item) ?? []),
        unread_count: index === 0 && unread !== undefined ? unread : page.unread_count,
      })),
    })
}

export function useMarkNotificationsRead() {
  const update = useUpdateInbox()
  return useMutation({
    mutationFn: (ids: string[]) => callAcademicRpc<{ unread_count: number }>('academic_mark_notifications_read', { p_ids: ids }),
    onSuccess: ({ unread_count }, ids) => update(item => (ids.includes(item.id) ? { ...item, state: 'read' } : item), unread_count),
  })
}

export function useDismissNotification() {
  const queryClient = useQueryClient()
  const update = useUpdateInbox()
  return useMutation({
    mutationFn: (id: string) => callAcademicRpc('academic_dismiss_notification', { p_id: id }),
    onSuccess: (_, id) => {
      update(item => (item.id === id ? null : item))
      void queryClient.invalidateQueries({ queryKey: notificationsKey })
    },
  })
}

export interface NotificationPreferences {
  categories: Array<{ category: 'score_reminder'; in_app_enabled: boolean; push_enabled: boolean }>
  push_consent: boolean
  /** Some device of this account has the My Scores switch on. */
  push_device: boolean
  quiet_hours: { start: string; end: string } | null
}

const preferencesKey = [...academicKeys.all, 'notification-preferences'] as const

export function useNotificationPreferences() {
  return useQuery({
    queryKey: preferencesKey,
    retry: shouldRetryAcademic,
    queryFn: () => callAcademicRpc<NotificationPreferences>('academic_get_notification_preferences'),
  })
}

export function useSetNotificationPreference() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ inApp, push }: { inApp: boolean; push: boolean }) =>
      callAcademicRpc<NotificationPreferences>('academic_set_notification_preference', { p_category: 'score_reminder', p_in_app: inApp, p_push: push }),
    onSuccess: prefs => queryClient.setQueryData(preferencesKey, prefs),
  })
}

// ─── Diagnostic quizzes (QUIZ-001..003, ANALYSIS-005; migration 132) ─────────

export interface QuizOffer {
  /** The main form for the subject and grade. */
  diagnostic: { id: string; title_lo: string; title_en: string; items: number } | null
  /** The form to open now (resume, first try or a parallel form); null while a retake waits. */
  start_id: string | null
  /** QUIZ-004: when the next attempt opens. */
  retake_from: string | null
  /** P3-BIL: set when the check for this term is used and re-tests need Premium (migration 142). */
  locked?: 'diagnostic_unlimited' | null
  attempt: { id: string; answered: number; total: number; expires_at: string } | null
  /** strong: >= 80% in every tested topic (ANALYSIS-007). */
  last_result: { id: string; completed_at: string; strong: boolean } | null
}

export interface QuizOptionView { key: string; text_lo: string; text_en: string | null }

export interface QuizAttemptView {
  attempt_id: string
  status: 'in_progress' | 'completed' | 'expired'
  expires_at: string
  diagnostic: { id: string; title_lo: string; title_en: string }
  items: { id: string; position: number; topic: { name_lo: string; name_en: string }; stem_lo: string; stem_en: string | null; options: QuizOptionView[] }[]
  /** item id -> chosen option key */
  answers: Record<string, string>
}

export type MasteryBand = 'secure' | 'developing' | 'needs_practice' | 'not_enough'

export interface QuizTopicResult { topic_id: string; name_lo: string; name_en: string; correct: number; total: number; band: MasteryBand }

export interface QuizResultView {
  attempt_id: string
  completed_at: string
  diagnostic: { id: string; title_lo: string; title_en: string }
  topics: QuizTopicResult[]
  /** QUIZ-004: the previous finished attempt of the same quiz family. */
  previous: { attempt_id: string; completed_at: string; topics: QuizTopicResult[] } | null
  items: {
    position: number
    topic: { name_lo: string; name_en: string }
    stem_lo: string
    stem_en: string | null
    options: QuizOptionView[]
    chosen_key: string | null
    correct_key: string
    is_correct: boolean
    explanation_lo: string | null
    explanation_en: string | null
    explanation_origin: 'human' | 'ai'
  }[]
}

/** The "Find which topics to practise" offer for a subject; null diagnostic hides it. */
export function useQuizOffer(subjectEnrolmentId: string, enabled: boolean) {
  return useQuery({
    queryKey: [...academicKeys.all, 'quiz-offer', subjectEnrolmentId],
    enabled,
    retry: shouldRetryAcademic,
    queryFn: () => callAcademicRpc<QuizOffer>('academic_get_quiz_offer', { p_subject_enrolment_id: subjectEnrolmentId }),
  })
}

/** Starts the quiz, or resumes the unfinished attempt (same result on every call within 7 days). */
export function useQuizAttempt(diagnosticId: string) {
  return useQuery({
    queryKey: [...academicKeys.all, 'quiz-attempt', diagnosticId],
    retry: shouldRetryAcademic,
    refetchOnWindowFocus: false,
    queryFn: () => callAcademicRpc<QuizAttemptView>('academic_start_quiz', { p_diagnostic_id: diagnosticId }),
  })
}

export function useAnswerQuizItem() {
  return useMutation({
    mutationFn: ({ attemptId, itemId, key }: { attemptId: string; itemId: string; key: string }) =>
      callAcademicRpc<{ answered: number; total: number }>('academic_answer_quiz_item', { p_attempt_id: attemptId, p_item_id: itemId, p_key: key }),
  })
}

export function useFinishQuiz() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (attemptId: string) => callAcademicRpc<QuizResultView>('academic_finish_quiz', { p_attempt_id: attemptId }),
    onSuccess: result => {
      queryClient.setQueryData([...academicKeys.all, 'quiz-result', result.attempt_id], result)
      return queryClient.invalidateQueries({ queryKey: [...academicKeys.all, 'quiz-offer'] })
    },
  })
}

export function useQuizResult(attemptId: string) {
  return useQuery({
    queryKey: [...academicKeys.all, 'quiz-result', attemptId],
    retry: shouldRetryAcademic,
    queryFn: () => callAcademicRpc<QuizResultView>('academic_get_quiz_result', { p_attempt_id: attemptId }),
  })
}

// ─── Report a problem (PRIV-008, migration 133) ──────────────────────────────

export type ProblemCategory = 'guardian_link' | 'ai_answer' | 'account_misuse' | 'other'

export function useReportProblem() {
  return useMutation({
    mutationFn: (input: { category: ProblemCategory; description: string; screen: string }) =>
      callAcademicRpc<{ id: string; priority: 'priority' | 'normal'; first_response_due: string }>('academic_report_problem', { p_input: input }),
  })
}

// ─── Weekly next actions and practice sets (LEARN-001, REC-PRACTICE; migrations 136–137) ──

export interface Recommendation {
  key: string
  rule_id: 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R7'
  kind: 'enter_scores' | 'diagnostic' | 'practice_set' | 'academy_lesson' | 'academy_challenge' | 'gap'
  title_lo: string
  title_en: string
  est_minutes: number | null
  /** Where the action opens; null for a content-gap card. */
  route: string | null
  priority: number
  reason: {
    code: 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R7' | 'gap'
    subject_lo?: string; subject_en?: string; topic_lo?: string; topic_en?: string
    period_lo?: string; period_en?: string; band?: string; date?: string; label?: string; trend?: string
  }
}

export function useRecommendations(enabled = true) {
  return useQuery({
    queryKey: [...academicKeys.all, 'recommendations'],
    enabled,
    retry: shouldRetryAcademic,
    // more_locked: actions held back for Premium (migration 142).
    queryFn: async () => {
      const result = await callAcademicRpc<{ items: Recommendation[]; more_locked?: number }>('academic_get_recommendations')
      return { items: result.items, moreLocked: result.more_locked ?? 0 }
    },
  })
}

export interface PracticeFeedback {
  chosen_key: string
  is_correct: boolean
  correct_key: string
  explanation_lo: string | null
  explanation_en: string | null
  explanation_origin: 'human' | 'ai'
}

export interface PracticeView {
  attempt_id: string
  status: 'in_progress' | 'completed' | 'expired'
  correct: number | null
  topic: { id: string; name_lo: string; name_en: string }
  items: { id: string; position: number; stem_lo: string; stem_en: string | null; options: QuizOptionView[]; feedback: PracticeFeedback | null }[]
}

/** Starts or resumes practice for a topic (same attempt on every call until finished). */
export function usePracticeSet(topicId: string) {
  return useQuery({
    queryKey: [...academicKeys.all, 'practice', topicId],
    retry: shouldRetryAcademic,
    refetchOnWindowFocus: false,
    queryFn: () => callAcademicRpc<PracticeView>('academic_start_practice', { p_topic_id: topicId }),
  })
}

export function useAnswerPractice() {
  return useMutation({
    mutationFn: ({ attemptId, itemId, key }: { attemptId: string; itemId: string; key: string }) =>
      callAcademicRpc<PracticeFeedback>('academic_answer_practice_item', { p_attempt_id: attemptId, p_item_id: itemId, p_key: key }),
  })
}

export function useFinishPractice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (attemptId: string) => callAcademicRpc<{ attempt_id: string; correct: number; total: number }>('academic_finish_practice', { p_attempt_id: attemptId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...academicKeys.all, 'recommendations'] }),
  })
}

/** LEARN-005: done (30 days), not now (14 days) or not helpful (180 days) for a shown action. */
export function useRecommendationFeedback() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ key, response }: { key: string; response: 'done' | 'not_now' | 'not_helpful' }) =>
      callAcademicRpc<{ item_key: string; response: string }>('academic_recommendation_feedback', { p_item_key: key, p_response: response }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...academicKeys.all, 'recommendations'] }),
  })
}

// ─── Score-book scanning (P2-OCR #48, migration 139) ────────────────────────

export interface OcrStatus {
  available: boolean
  consent: boolean
  allowance: { limit: number; used: number; remaining: number }
}

export interface OcrRow {
  subject_raw: string
  score_raw: string | null
  score_value: number | null
  score_confidence: number
  struck_through: boolean
  replacement_value: number | null
  bbox: [number, number, number, number] | null
  subject_match: { subject_enrolment_id: string | null; subject_code?: string | null; method: 'alias_exact' | 'alias_fuzzy' | 'none'; confidence: number } | null
}

export interface OcrExtraction {
  schema: 'ocr_extraction.v1'
  periods: { period_label_raw: string | null; period_guess: { month: number | null; confidence: number }; rows: OcrRow[] }[]
  warnings: ('multiple_person_blocks' | 'multiple_periods' | 'struck_through_value_detected')[]
  document: { detected_person_blocks: number }
}

export interface OcrJob {
  job_id: string
  status: 'awaiting_upload' | 'processing' | 'succeeded' | 'failed' | 'confirmed' | 'discarded'
  enrolment_id: string
  created_at: string
  duplicate_of: string | null
  extraction: OcrExtraction | null
  error_code: string | null
  keep_photo: boolean
  has_image: boolean
  thresholds: { clear: number; review: number }
  timeout_seconds: number
}

/** One reviewed subject (OCR-010: what was read against what was saved). */
export interface OcrField {
  subject_enrolment_id: string
  subject_raw: string | null
  match_method: string | null
  ocr_value: number | null
  ocr_confidence: number | null
  confirmed_status: string | null
  confirmed_value: number | null
  edited: boolean
}

export function useOcrStatus(enabled = true) {
  return useQuery({
    queryKey: [...academicKeys.all, 'ocr-status'],
    enabled,
    retry: shouldRetryAcademic,
    queryFn: () => callAcademicRpc<OcrStatus>('academic_ocr_status'),
  })
}

export const startOcrJob = (enrolmentId: string, phash: string, ignoreDuplicate = false) =>
  callAcademicRpc<{ job?: OcrJob; duplicate?: { job_id: string; created_at: string } }>('academic_start_ocr_job', {
    p_enrolment_id: enrolmentId, p_phash: phash, p_ignore_duplicate: ignoreDuplicate,
  })

export const reuseOcrJob = (jobId: string) => callAcademicRpc<{ job: OcrJob }>('academic_reuse_ocr_job', { p_job_id: jobId })
export const getOcrJob = (jobId: string) => callAcademicRpc<OcrJob>('academic_get_ocr_job', { p_job_id: jobId })
export const discardOcrJob = (jobId: string) => callAcademicRpc<OcrJob>('academic_discard_ocr_job', { p_job_id: jobId })
export const deleteOcrImage = (jobId: string) => callAcademicRpc<OcrJob>('academic_delete_ocr_image', { p_job_id: jobId })

export const confirmOcrJob = (input: { jobId: string; periodId: string; lines: WireLine[]; fields: OcrField[]; timeToConfirmMs: number; keepPhoto: boolean }) =>
  callAcademicRpc<ScoreEntryView & { ocr_job_id: string }>('academic_confirm_ocr_job', {
    p_job_id: input.jobId, p_period_id: input.periodId, p_lines: input.lines, p_fields: input.fields,
    p_time_to_confirm_ms: input.timeToConfirmMs, p_keep_photo: input.keepPhoto,
  })

/** Sends the compressed photo to the academic-ocr function; resolves with the finished job. */
export async function processOcrJob(jobId: string, imageBase64: string, imageQuality: Record<string, number>): Promise<OcrJob> {
  const { data, error } = await supabase.functions.invoke('academic-ocr', {
    body: { action: 'process', job_id: jobId, image_base64: imageBase64, image_quality: imageQuality },
  })
  if (error) {
    const context = (error as { context?: Response }).context
    const body = context && typeof context.json === 'function' ? await context.json().catch(() => null) : null
    const failure = body?.error as { code?: string; status?: number; reason?: string } | undefined
    throw new AcademicError(failure?.code ?? 'OCR_FAILED', failure?.status ?? 502, failure?.reason, failure)
  }
  return data as OcrJob
}

export interface OcrPhoto { job_id: string; created_at: string; status: OcrJob['status']; keep_photo: boolean; delete_after: string | null }

/** OCR-011: the score-book photos still stored for the student. */
export function useOcrPhotos(enabled = true) {
  return useQuery({
    queryKey: [...academicKeys.all, 'ocr-photos'],
    enabled,
    retry: shouldRetryAcademic,
    queryFn: async () => (await callAcademicRpc<{ photos: OcrPhoto[] } | null>('academic_list_ocr_photos'))?.photos ?? [],
  })
}

export function useDeleteOcrPhoto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (jobId: string) => deleteOcrImage(jobId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...academicKeys.all, 'ocr-photos'] }),
  })
}

// ─── Entitlements (P3-BIL #51, migration 141) ────────────────────────────────

export type FeatureCode = 'advanced_analysis' | 'diagnostic_unlimited' | 'ocr_upload' | 'coach_academic' | 'ai_monthly_summary'
  | 'planner_full' | 'parent_reports' | 'career_report' | 'mock_exams'

export interface Entitlements {
  enforced: boolean
  tier: 'free' | 'premium'
  premium: { active: boolean; source: 'academy_premium' | 'manual_grant' | null; until: string | null }
  period_key: string
  resets_at: string
  features: Partial<Record<FeatureCode, {
    enabled: boolean
    source: 'academy_premium' | 'manual_grant' | 'free' | 'open' | null
    until: string | null
    quota: { limit: number; used: number; remaining: number } | null
  }>>
}

/** GET /me/entitlements: tier, premium end and this month's quotas. */
export function useEntitlements(enabled = true) {
  return useQuery({
    queryKey: [...academicKeys.all, 'entitlements'],
    enabled,
    retry: shouldRetryAcademic,
    queryFn: () => callAcademicRpc<Entitlements>('academic_my_entitlements'),
  })
}

// ─── Study planner (P3-PLAN #54, migration 143) ──────────────────────────────

export type Feasibility = 'steady' | 'stretch' | 'ambitious' | 'maintain'
type PeriodRef = { id: string; label_lo: string; label_en: string }

export interface LearningGoal {
  id: string
  subject_enrolment_id: string
  subject_lo: string
  subject_en: string
  baseline: number
  target: number
  months_remaining: number
  required_gain: number
  feasibility: Feasibility
  target_period: PeriodRef
  milestone: { value: number; period: PeriodRef | null } | null
  latest: number | null
  status: 'active' | 'archived'
  version: number
}

export interface StudyTask {
  id: string
  date: string
  first_date: string
  kind: 'diagnostic' | 'practice_set' | 'academy_lesson' | 'academy_challenge' | 'self_study'
  title_lo: string | null
  title_en: string | null
  subject_lo: string | null
  subject_en: string | null
  route: string | null
  est_minutes: number
  state: 'scheduled' | 'done' | 'skipped'
  moved: boolean
  needs_decision: boolean
  done_by: 'student' | 'activity' | null
  /** Academy XP this task earned (PLAN-005, migration 144). */
  xp: number
}

export interface PlannerView {
  entitled: boolean
  free_goals: number
  minutes_options: number[]
  today: string
  scale: ScoreEntryView['scale']
  goals: LearningGoal[]
  subjects: { subject_enrolment_id: string; name_lo: string; name_en: string; baseline: number | null }[]
  periods: (PeriodRef & { months: number })[]
  plan: { days: number[]; minutes_per_day: number; paused_until: string | null; starts_on: string; xp_opt_in: boolean; xp_per_task: number } | null
  week: { week_start: string; tasks: StudyTask[]; decisions: StudyTask[] } | null
  review: { week_start: string; planned: number; done: number; minutes: number; topics: { lo: string | null; en: string | null }[] } | null
  suggestion: { subject_enrolment_id: string; name_lo: string; name_en: string; baseline: number; target: number } | null
}

export interface GoalPreview {
  subject_enrolment_id: string
  baseline: number
  target: number
  target_period_id: string
  months_remaining: number
  required_gain: number
  feasibility: Feasibility
  milestone_value: number | null
  milestone_period_id: string | null
}

const plannerKey = [...academicKeys.all, 'planner'] as const

export function usePlanner() {
  return useQuery({
    queryKey: plannerKey,
    retry: shouldRetryAcademic,
    queryFn: () => callAcademicRpc<PlannerView>('academic_get_planner'),
  })
}

export const previewGoal = (subjectEnrolmentId: string, target: number, periodId: string) =>
  callAcademicRpc<GoalPreview>('academic_preview_goal', { p_subject_enrolment_id: subjectEnrolmentId, p_target: target, p_target_period_id: periodId })

function usePlannerMutation<A, R>(fn: (args: A) => Promise<R>) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: fn, onSuccess: () => queryClient.invalidateQueries({ queryKey: plannerKey }) })
}

export const useSaveGoal = () => usePlannerMutation((input: { id?: string; subject_enrolment_id?: string; target: number; target_period_id: string }) =>
  callAcademicRpc<LearningGoal>('academic_save_goal', { p_input: input }))
export const useArchiveGoal = () => usePlannerMutation((goalId: string) => callAcademicRpc<LearningGoal>('academic_archive_goal', { p_goal_id: goalId }))
export const useSavePlan = () => usePlannerMutation((input: { days: number[]; minutes_per_day: number }) =>
  callAcademicRpc<PlannerView>('academic_save_plan', { p_input: input }))
export const usePausePlan = () => usePlannerMutation((until: string | null) => callAcademicRpc<PlannerView>('academic_pause_plan', { p_until: until }))
export const useSetPlannerXp = () => usePlannerMutation((on: boolean) => callAcademicRpc<PlannerView>('academic_set_planner_xp', { p_on: on }))
export const useUpdateTask = () => usePlannerMutation(({ taskId, action }: { taskId: string; action: 'done' | 'undo' | 'skip' | 'keep' }) =>
  callAcademicRpc<StudyTask>('academic_update_task', { p_task_id: taskId, p_action: action }))

// ─── AI Coach academic mode (P3-AI #53, migration 145) ───────────────────────

export interface CoachStatus {
  available: boolean
  busy: boolean
  quota: { limit: number; used: number; remaining: number } | null
  resources: { key: string; name_en: string; name_lo: string; phone: string }[]
}

export function useCoachStatus() {
  return useQuery({
    queryKey: [...academicKeys.all, 'coach-status'],
    retry: shouldRetryAcademic,
    queryFn: () => callAcademicRpc<CoachStatus>('academic_coach_status'),
  })
}

/** AI-009: a ≤150-word summary of the latest month; 'template' when written from the snapshot without AI. */
export async function fetchMonthlySummary(language: 'lo' | 'en') {
  const { data, error } = await supabase.functions.invoke('premium-coach', { body: { mode: 'academic', action: 'summary', language } })
  if (error || data?.error) throw new AcademicError(data?.code ?? 'UNKNOWN', 503, data?.error)
  return data as { summary: string; source: 'ai' | 'template'; cached?: boolean }
}

// ─── Career guidance (P4-CAR #55: CAREER-001..010; migrations 148, 150) ──────

export type InterestArea = 'R' | 'I' | 'A' | 'S' | 'E' | 'C'

/** A published career as students see it (migration 148); facts past their review-by date are marked. */
export interface GuidanceCareer {
  slug: string
  title_en: string
  title_lo: string
  summary_en: string
  summary_lo: string
  cluster: string
  primary_area: InterestArea
  secondary_area?: InterestArea | ''
  related_subjects: string[]
  study_years: 'le3' | '4to5' | '6plus'
  work_settings: string[]
  preparation_en?: string[]
  preparation_lo?: string[]
  facts?: { kind: string; text_en: string; text_lo: string; source_name: string; source_url: string; verified_on: string; review_by: string; out_of_date: boolean }[]
}

/** The factors behind an option (CAREER-002). There is never a score. */
export interface CareerFactors {
  saved?: boolean
  interest?: InterestArea[]
  subjects?: string[]
  preferences?: ('work_setting' | 'study_length')[]
}

export interface CareerGuidanceView {
  questionnaire: { version: string; items: { n: number; areas: InterestArea[]; en: string; lo: string }[]; items_per_screen: number; min_answered: number }
  in_progress: { answers: Record<string, number | null>; preferences: Record<string, string>; reason: string } | null
  completed_at: string | null
  area_scores: { areas: Record<InterestArea, { score: number | null; answered: number; level: 'high' | 'medium' | 'low' | 'not_enough' }>; top2: InterestArea[]; top3: InterestArea[] } | null
  preferences: Record<string, string> | null
  retake_after: string | null
  /** Options need Academy Premium (feature career_options); interests and every career stay free. */
  options_locked: boolean
  catalogue_size: number
  result: {
    created_at: string
    reason: 'first' | 'retake' | 'interests_changed' | 'new_scores' | 'catalogue' | 'shortlist'
    has_scores: boolean
    options: { slug: string; cluster: string; factors: CareerFactors; career: GuidanceCareer }[]
    changes: { since: string; reason: string; added: string[]; removed: string[] } | null
  } | null
  shortlist: string[]
  subject_names: Record<string, { en: string; lo: string }>
}

const careerKey = [...academicKeys.all, 'career-guidance'] as const

export function useCareerGuidance() {
  return useQuery({ queryKey: careerKey, retry: shouldRetryAcademic, queryFn: () => callAcademicRpc<CareerGuidanceView>('academic_get_career_guidance') })
}

/** A sourced fact with its academic year (UNI-004); out_of_date past its review-by date. */
export interface ProgrammeRequirement { kind: 'requirement' | 'cutoff'; text_en: string; text_lo: string; academic_year: string; source_name: string; source_url: string; verified_on: string; out_of_date: boolean }

export interface CatalogueInstitution { slug: string; name_en: string; name_lo: string; short_name?: string; province_code: string; website_url: string }
export interface CatalogueProgramme {
  slug: string; institution: string; faculty?: string; name_en: string; name_lo: string; degree_level: string; duration_years: string
  entrance_group?: string; field?: string; careers?: string[]; source_name: string; source_url: string; verified_on: string; out_of_date: boolean
  requirements?: ProgrammeRequirement[]
}
export interface CatalogueScholarship {
  slug: string; name_en: string; name_lo: string; provider: string; institution?: string; deadline: string; academic_year: string
  eligibility_en: string; eligibility_lo: string; amount_en?: string; amount_lo?: string; source_name: string; source_url: string; verified_on: string; out_of_date: boolean
}
export interface CareerCatalogue { careers: GuidanceCareer[]; institutions: CatalogueInstitution[]; programmes: CatalogueProgramme[]; scholarships: CatalogueScholarship[] }

/** Every published career, institution, programme and open scholarship (CAREER-003, UNI-003, UNI-005). */
export function useCareerCatalogue() {
  return useQuery({
    queryKey: [...careerKey, 'catalogue'],
    retry: shouldRetryAcademic,
    queryFn: () => callAcademicRpc<CareerCatalogue>('academic_career_catalogue'),
  })
}

export function useMyScholarships() {
  return useQuery({ queryKey: [...careerKey, 'scholarships'], retry: shouldRetryAcademic, queryFn: () => callAcademicRpc<{ slug: string; remind: boolean }[]>('academic_my_scholarships') })
}
export const useSetScholarshipSaved = () => useCareerMutation(({ slug, saved, remind }: { slug: string; saved: boolean; remind?: boolean }) =>
  callAcademicRpc<{ slug: string; remind: boolean }[]>('academic_set_scholarship_saved', { p_slug: slug, p_saved: saved, p_remind: remind ?? false }))

function useCareerMutation<A, R>(fn: (args: A) => Promise<R>) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: fn, onSuccess: () => queryClient.invalidateQueries({ queryKey: careerKey }) })
}

export const useStartCareerQuestionnaire = () => useCareerMutation((reason: 'first' | 'retake' | 'interests_changed') =>
  callAcademicRpc<CareerGuidanceView>('academic_start_career_questionnaire', { p_reason: reason }))
/** Saved after each screen, without refetching (CAREER-001). */
export const saveCareerAnswers = (answers: Record<string, number | null>, preferences?: Record<string, string>) =>
  callAcademicRpc<{ saved: boolean }>('academic_save_career_answers', { p_answers: answers, p_preferences: preferences ?? null })
export const useFinishCareerQuestionnaire = () => useCareerMutation(() => callAcademicRpc<CareerGuidanceView>('academic_finish_career_questionnaire'))
export const useSetCareerSaved = () => useCareerMutation(({ slug, saved }: { slug: string; saved: boolean }) =>
  callAcademicRpc<{ shortlist: string[] }>('academic_set_career_saved', { p_slug: slug, p_saved: saved }))

// ─── Guardian links (P3-PAR #52: PARENT-001..009; migration 152) ─────────────

export type GuardianScope = 'scores' | 'plan' | 'careers' | 'goals_text'
export type GuardianScopes = Record<GuardianScope, boolean>

export interface GuardianLink {
  id: string
  status: 'pending_student' | 'active' | 'paused' | 'suspended' | 'removed'
  purpose: 'link' | 'consent'
  relationship: 'mother' | 'father' | 'guardian' | 'other'
  scopes: GuardianScopes
  guardian_name: string | null
  student_name: string | null
  declared_at: string
  confirm_by: string
  confirmed_at: string | null
  reconfirm_by: string | null
  removed_at: string | null
  removed_by: 'student' | 'guardian' | 'system' | null
  grade?: string | null
}

export interface GuardianLinksView {
  consent_state: 'pending_guardian' | 'active' | 'withdrawn'
  invites: { id: string; purpose: 'link' | 'consent'; scopes: GuardianScopes; expires_at: string; created_at: string }[]
  links: GuardianLink[]
  default_scopes: GuardianScopes
}

export interface NewGuardianInvite { id: string; code: string; purpose: 'link' | 'consent'; scopes: GuardianScopes; expires_at: string }

const guardianKey = [...academicKeys.all, 'guardians'] as const

export function useGuardianLinks() {
  return useQuery({ queryKey: guardianKey, retry: shouldRetryAcademic, queryFn: () => callAcademicRpc<GuardianLinksView>('academic_list_guardian_links') })
}

function useGuardianMutation<A, R>(fn: (args: A) => Promise<R>) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: fn, onSuccess: () => queryClient.invalidateQueries({ queryKey: guardianKey }) })
}

export const useCreateGuardianInvite = () => useGuardianMutation(({ scopes, purpose }: { scopes?: Partial<GuardianScopes>; purpose?: 'link' | 'consent' }) =>
  callAcademicRpc<NewGuardianInvite>('academic_create_guardian_invite', { p_scopes: scopes ?? {}, p_purpose: purpose ?? 'link' }))
export const useRevokeGuardianInvite = () => useGuardianMutation((id: string) => callAcademicRpc<GuardianLinksView>('academic_revoke_guardian_invite', { p_invite_id: id }))
export const useConfirmGuardianLink = () => useGuardianMutation(({ id, confirm }: { id: string; confirm: boolean }) =>
  callAcademicRpc<GuardianLinksView>('academic_confirm_guardian_link', { p_link_id: id, p_confirm: confirm }))
export const useSetGuardianScopes = () => useGuardianMutation(({ id, scopes }: { id: string; scopes: Partial<GuardianScopes> }) =>
  callAcademicRpc<GuardianLinksView>('academic_set_guardian_scopes', { p_link_id: id, p_scopes: scopes }))
export const useRemoveGuardianLink = () => useGuardianMutation((id: string) => callAcademicRpc<GuardianLinksView>('academic_remove_guardian_link', { p_link_id: id }))
export const useKeepGuardianLink = () => useGuardianMutation((id: string) => callAcademicRpc<GuardianLinksView>('academic_keep_guardian_link', { p_link_id: id }))

// The guardian's side (any signed-in Bitdoin user).
export interface FamilyView { links: GuardianLink[]; notices: { code: string; payload: Record<string, string>; created_at: string }[] }
const familyKey = ['family'] as const
export function useFamily() {
  return useQuery({ queryKey: familyKey, retry: shouldRetryAcademic, queryFn: () => callAcademicRpc<FamilyView>('academic_get_family') })
}
export const previewGuardianInvite = (code: string) =>
  callAcademicRpc<{ student_name: string; purpose: 'link' | 'consent'; scopes: GuardianScopes; expires_at: string }>('academic_preview_guardian_invite', { p_code: code })
export function useAcceptGuardianInvite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ code, relationship }: { code: string; relationship: GuardianLink['relationship'] }) =>
      callAcademicRpc<GuardianLink>('academic_accept_guardian_invite', { p_code: code, p_relationship: relationship, p_declaration: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: familyKey }),
  })
}
export function useGuardianRemoveLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => callAcademicRpc<FamilyView>('academic_guardian_remove_link', { p_link_id: id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: familyKey }),
  })
}

/** The guardian's view of one child (PARENT-005, migration 153); sections are null when not shared. */
export interface GuardianChildView {
  link_id: string
  name: string
  relationship: GuardianLink['relationship']
  scopes: GuardianScopes
  grade_en: string | null
  grade_lo: string | null
  school_year: string | null
  scores: {
    scale: { min?: number; max?: number } | null
    /** Months entered in the last 3 days are held back for corrections (PRD §14.9.4). */
    hidden_recent: boolean
    months: { label_en: string; label_lo: string; average: number | null; change: number | null }[]
    subjects: { name_en: string; name_lo: string; latest: number | string | null; average: number | null; change: number | null; label: string | null; trend: string | null; number_of_scores: number }[]
  } | null
  suggestions: { kind: 'ask_hardest' | 'notice_progress' | 'check_in' | 'start_together' | 'ask_support'; subject_en?: string; subject_lo?: string }[]
  plan: { goals: { subject_en: string; subject_lo: string; target: number; target_period: { label_en: string; label_lo: string } }[]; week: { done: number; total: number }; has_plan: boolean } | null
  careers: { interests: Record<string, { level: string }> | null; saved: { title_en: string; title_lo: string }[] } | null
  goals_text: { chips?: string[]; text?: string } | null
  reports_entitled: boolean
  reports: { id: string; label_en: string; label_lo: string; generated_at: string; read: boolean }[]
}

/** A monthly report, frozen when it was made (PARENT-006, PRD §14.9.3). */
export interface GuardianReport {
  id: string
  link_id: string
  generated_at: string
  content: {
    student_name: string
    period: { label_en: string; label_lo: string; school_year: string; generated_at: string; data_as_of: string | null }
    recorded: { recorded: number | null; active: number | null; missing: { name_en: string; name_lo: string }[] }
    changes: { mean_change: number | null; subjects: { name_en: string; name_lo: string; latest: number | string; previous: number | string | null; direction: 'up' | 'down' | 'same' | null }[] }
    stronger: { name_en: string; name_lo: string; reason: { n: number; above: number; below: number; confidence: string | null } | null }[]
    needs_attention: { name_en: string; name_lo: string; reason: { n: number; above: number; below: number; confidence: string | null } | null }[]
    activities: { quizzes: number; practice: number; plan_tasks: number | null }
    next_steps: GuardianChildView['suggestions']
  }
}

export function useGuardianReport(reportId: string) {
  return useQuery({ queryKey: ['family', 'report', reportId], retry: shouldRetryAcademic, queryFn: () => callAcademicRpc<GuardianReport>('academic_guardian_report', { p_report_id: reportId }) })
}

export function useGuardianChild(linkId: string) {
  return useQuery({ queryKey: ['family', 'child', linkId], retry: shouldRetryAcademic, queryFn: () => callAcademicRpc<GuardianChildView>('academic_guardian_child', { p_link_id: linkId }) })
}

// ─── Career report and its one-time purchase (CAREER-006, BILLING-004; migration 157) ─

export interface ReportPurchaseView {
  price: { price_lak: number; months: number }
  entitled: boolean
  purchase: { id: string; amount_lak: number; status: 'pending' | 'review' | 'verified' | 'rejected' | 'cancelled'; has_receipt: boolean; rejection_reason: string | null; created_at: string; reviewed_at: string | null; valid_until: string | null } | null
}

const purchaseKey = ['career-report-purchase'] as const

export function useReportPurchase() {
  return useQuery({ queryKey: purchaseKey, retry: shouldRetryAcademic, queryFn: () => callAcademicRpc<ReportPurchaseView>('academic_my_report_purchase') })
}

function usePurchaseMutation<A, R>(fn: (args: A) => Promise<R>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => Promise.all([queryClient.invalidateQueries({ queryKey: purchaseKey }), queryClient.invalidateQueries({ queryKey: careerKey })]),
  })
}

export const useStartReportPurchase = () => usePurchaseMutation(() => callAcademicRpc<ReportPurchaseView>('academic_start_report_purchase'))
export const useCancelReportPurchase = () => usePurchaseMutation((id: string) => callAcademicRpc<ReportPurchaseView>('academic_cancel_report_purchase', { p_purchase_id: id }))
/** Uploads the receipt to the buyer's own folder (the same bucket as Premium payments), then sends it for review. */
export const useSubmitReportReceipt = () => usePurchaseMutation(async ({ purchaseId, userId, file }: { purchaseId: string; userId: string; file: File }) => {
  const extension = (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const path = `${userId}/report-${purchaseId}-${Date.now()}.${extension}`
  const { error } = await supabase.storage.from('premium-payment-proofs').upload(path, file, { cacheControl: '3600', upsert: false })
  if (error) throw error
  return callAcademicRpc<ReportPurchaseView>('academic_submit_report_receipt', { p_purchase_id: purchaseId, p_path: path })
})

export interface PaymentAccountOption { id: string; method: string; label: string; bank_name: string | null; account_name: string | null; account_number: string | null; qr_image_url: string | null; instructions: string | null }

/** The Bitdoin payment accounts shown on the plans page (QR or bank transfer). */
export function usePaymentAccounts() {
  return useQuery({
    queryKey: ['premium', 'payment-accounts'],
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data, error } = await supabase.from('payment_accounts')
        .select('id,method,label,bank_name,account_name,account_number,qr_image_url,instructions')
        .eq('is_active', true).order('sort_order')
      if (error) throw error
      return (data ?? []) as PaymentAccountOption[]
    },
  })
}

export interface CareerReportContent {
  student_name: string
  generated_at: string
  school_year: string | null
  grade_en: string | null
  grade_lo: string | null
  scores_as_of: string | null
  interests: Record<InterestArea, { level: string }>
  questionnaire_on: string
  options: {
    slug: string; cluster: string; factors: CareerFactors; title_en: string; title_lo: string; summary_en: string; summary_lo: string; study_years: string
    preparation_en: string[]; preparation_lo: string[]
    subjects: { code: string; name_en: string; name_lo: string; latest: number | string | null; label: string | null }[]
    facts: { kind: string; text_en: string; text_lo: string; source_name: string; source_url: string; verified_on: string }[]
    programmes: { name_en: string; name_lo: string; faculty?: string; institution_en: string; institution_lo: string; degree_level: string; duration_years: string; entrance_group: string | null
      requirements: { kind: string; text_en: string; text_lo: string; academic_year: string; source_name: string; source_url: string; verified_on: string }[]
      source_name: string; source_url: string; verified_on: string }[]
  }[]
  scholarships: { name_en: string; name_lo: string; provider: string; deadline: string; eligibility_en: string; eligibility_lo: string; source_name: string; source_url: string; verified_on: string }[]
  history: { created_at: string; reason: string; options: string[] }[]
}

export function useCareerReports() {
  return useQuery({ queryKey: [...careerKey, 'reports'], retry: shouldRetryAcademic,
    queryFn: () => callAcademicRpc<{ entitled: boolean; reports: { id: string; generated_at: string }[] }>('academic_career_reports') })
}
export function useCareerReport(id: string) {
  return useQuery({ queryKey: [...careerKey, 'report', id], retry: shouldRetryAcademic,
    queryFn: () => callAcademicRpc<{ id: string; generated_at: string; content: CareerReportContent }>('academic_get_career_report', { p_report_id: id }) })
}
export const useGenerateCareerReport = () => useCareerMutation(() => callAcademicRpc<{ id: string; generated_at: string; content: CareerReportContent }>('academic_generate_career_report'))
