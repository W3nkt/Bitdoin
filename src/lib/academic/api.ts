import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
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
}

export interface SchoolMatch {
  id: string
  name_lo: string
  name_en: string | null
  romanised_name: string | null
  province_code: string
  district_code: string | null
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
      const [grades, subjects, year, levels, maxSubjects] = await Promise.all([
        supabase.from('academic_grades').select('id,code,ordinal,level,label_lo,label_en').eq('status', 'active').order('ordinal'),
        supabase.from('academic_subjects').select('id,code,name_lo,name_en,grade_min,grade_max,is_default').eq('status', 'active').order('code'),
        supabase.from('academic_years').select('id,code,start_date,end_date').eq('status', 'active').maybeSingle(),
        readSetting<string[]>('allowed_grade_levels', ['upper_secondary']),
        readSetting<number>('max_subjects_per_enrolment', 25),
      ])
      for (const result of [grades, subjects, year]) if (result.error) throw result.error
      return {
        grades: ((grades.data ?? []) as AcademicGrade[]).filter(grade => levels.includes(grade.level)),
        subjects: (subjects.data ?? []) as AcademicSubject[],
        activeYear: (year.data ?? null) as AcademicYear | null,
        maxSubjects: Number(maxSubjects) || 25,
      }
    },
  })
}

/** Default subjects for a grade (PROFILE-003). */
export function defaultSubjectsFor(subjects: AcademicSubject[], grade: AcademicGrade | undefined) {
  if (!grade) return []
  return subjects.filter(subject => subject.is_default && grade.ordinal >= subject.grade_min && grade.ordinal <= subject.grade_max)
}

export function useSchoolSearch(query: string, provinceCode: string | null) {
  const trimmed = query.trim()
  return useQuery({
    queryKey: [...academicKeys.all, 'schools', trimmed.toLowerCase(), provinceCode],
    enabled: trimmed.length >= 2,
    staleTime: 5 * 60_000,
    retry: shouldRetryAcademic,
    queryFn: () => callAcademicRpc<SchoolMatch[]>('academic_search_schools', {
      p_query: trimmed,
      p_province_code: provinceCode,
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

export const exportMyData = () => callAcademicRpc<import('./exportZip').ExportData>('academic_export_my_data')

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
  category: 'score_reminder'
  code: 'score_reminder.first' | 'score_reminder.second' | string
  payload: { enrolment_id?: string; period_id?: string; period_key?: string; period_label_lo?: string; period_label_en?: string }
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
