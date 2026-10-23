import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { callAcademicRpc, shouldRetryAcademic } from './rpc'
import { academicKeys } from './session'

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
    onSuccess: invalidate,
  })
}

export function useTransitionEnrolment() {
  const invalidate = useInvalidateAcademic()
  return useMutation({
    mutationFn: (input: TransitionInput) => callAcademicRpc<{ closed_enrolment_id: string | null; enrolment_id: string | null }>(
      'academic_transition_enrolment', { p_input: input },
    ),
    onSuccess: invalidate,
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
  return useMutation({
    mutationFn: ({ lineId, version, line, reason }: { lineId: string; version: number; line: Pick<WireLine, 'status' | 'value'>; reason?: string }) =>
      callAcademicRpc<EntryLine>('academic_correct_score_line', { p_line_id: lineId, p_expected_version: version, p_line: line, p_reason: reason ?? null }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: academicKeys.all }),
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
