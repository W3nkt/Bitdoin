import { useToast } from '@/components/ui/Toast'
import { useAcademicCopy } from '@/lib/academic/copy'
import { useGrantConsent } from '@/lib/academic/api'
import type { AcademicSession } from '@/lib/academic/session'
import { PrivacyNotice } from './PrivacyNotice'
import { academicErrorText } from './errorText'

/**
 * Shown when the notice changed since the student agreed, or after they
 * withdrew module processing consent (PRIV-001/003).
 */
export function ConsentReview({ session }: { session: AcademicSession }) {
  const { t } = useAcademicCopy()
  const toast = useToast()
  const grant = useGrantConsent()
  const paused = session.profile?.consent_state === 'withdrawn'
  const version = session.notice_version ?? ''

  return (
    <PrivacyNotice
      version={version}
      title={paused ? t('notice.pausedTitle') : t('notice.updatedTitle')}
      intro={paused ? t('notice.pausedBody') : undefined}
      busy={grant.isPending}
      onAccept={() => grant.mutate(
        { purpose: 'module_processing', noticeVersion: version },
        { onError: error => toast.error(academicErrorText(t, error)) },
      )}
    />
  )
}
