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
