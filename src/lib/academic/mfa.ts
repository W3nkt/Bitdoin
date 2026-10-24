import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Authenticator-app (TOTP) step-up for My Scores admin and support (OD-13).
// The database checks the session's `aal` claim; these helpers get the
// session to aal2. Other Bitdoin admin pages do not use this.

export interface MfaState {
  /** The setting admin_mfa_required (true unless switched off). */
  required: boolean
  level: 'aal1' | 'aal2' | null
  /** The verified authenticator, if the account has one. */
  factorId: string | null
}

export const mfaKey = ['academic', 'mfa'] as const

export function useMfaState(enabled = true) {
  return useQuery({
    queryKey: mfaKey,
    enabled,
    queryFn: async (): Promise<MfaState> => {
      const [{ data: setting }, aal, factors] = await Promise.all([
        supabase.from('academic_settings').select('value').eq('key', 'admin_mfa_required').maybeSingle(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        supabase.auth.mfa.listFactors(),
      ])
      if (aal.error) throw aal.error
      if (factors.error) throw factors.error
      return {
        required: (setting as { value: unknown } | null)?.value !== false,
        level: aal.data.currentLevel as MfaState['level'],
        factorId: factors.data.totp.find(factor => factor.status === 'verified')?.id ?? null,
      }
    },
  })
}

export interface Enrolment {
  factorId: string
  /** SVG data URL to show as an image. */
  qrCode: string
  secret: string
}

/** Starts authenticator setup. Earlier unfinished setups are removed first. */
export async function startMfaEnrolment(): Promise<Enrolment> {
  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors()
  if (listError) throw listError
  for (const factor of factors.all) {
    if (factor.factor_type === 'totp' && factor.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: factor.id })
  }
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Bitdoin admin ${new Date().toISOString().slice(0, 10)}` })
  if (error) throw error
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret }
}

/** Checks a 6-digit code; on success the session becomes aal2. */
export async function verifyMfaCode(factorId: string, code: string) {
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
  if (error) throw error
}
