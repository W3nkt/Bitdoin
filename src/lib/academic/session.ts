import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import type { Language, UserRole } from '@/types'
import { callAcademicRpc, shouldRetryAcademic } from './rpc'

/** Which My Scores screen comes next (academic_get_session, migration 111). */
export type AcademicNextStep = 'unavailable' | 'onboarding' | 'consent' | 'new_school_year' | 'ready'

export interface AcademicSession {
  user: { id: string; role: UserRole; language: Language }
  module_enabled: boolean
  notice_version: string | null
  next_step: AcademicNextStep
  profile: {
    id: string
    display_name: string
    age_band: '13_15' | '16_17' | '18_plus'
    status: 'active' | 'read_only' | 'deletion_pending'
    consent_state: 'pending_guardian' | 'active' | 'withdrawn'
    version: number
  } | null
  active_enrolment_id: string | null
  consent: { module_processing: boolean; notice_version: string | null }
}

export const academicKeys = {
  all: ['academic'] as const,
  session: (userId: string | undefined) => ['academic', 'session', userId] as const,
}

/**
 * Resolves the signed-in Bitdoin user for My Scores (AUTH-001). Disabled
 * while signed out; route guards send those visitors to /auth first.
 */
export function useAcademicSession() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: academicKeys.session(profile?.id),
    enabled: !!profile,
    queryFn: () => callAcademicRpc<AcademicSession>('academic_get_session'),
    retry: shouldRetryAcademic,
  })
}
