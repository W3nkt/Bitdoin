import { AlertTriangle, ClipboardList, Hourglass } from 'lucide-react'
import { Navigate, useLocation } from 'react-router-dom'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { MyScoresNotice, MyScoresShell } from '@/components/academic/MyScoresShell'
import { useAuth } from '@/context/AuthContext'
import { useAcademicCopy, type AcademicCopyKey } from '@/lib/academic/copy'
import { AcademicError } from '@/lib/academic/errors'
import { useAcademicSession, type AcademicNextStep } from '@/lib/academic/session'

const STEP_TITLES: Record<Exclude<AcademicNextStep, 'unavailable'>, AcademicCopyKey> = {
  onboarding: 'state.next.onboarding',
  consent: 'state.next.consent',
  new_school_year: 'state.next.newSchoolYear',
  ready: 'state.next.ready',
}

/**
 * /academy/scores — entry to My Scores (FE-001). Uses the existing Bitdoin
 * session (AUTH-001): signed-out visitors go to /auth and come back here.
 * The database decides which screen comes next.
 */
export function MyScores() {
  const { profile, loading } = useAuth()
  const location = useLocation()
  const session = useAcademicSession()
  const { t } = useAcademicCopy()

  if (loading) return <PageLoader />
  if (!profile) return <Navigate to="/auth" state={{ from: `${location.pathname}${location.search}` }} replace />
  if (session.isPending) return <PageLoader />

  if (session.isError) {
    const rateLimited = session.error instanceof AcademicError && session.error.code === 'RATE_LIMITED'
    return (
      <MyScoresShell>
        <MyScoresNotice
          icon={<AlertTriangle className="h-7 w-7" />}
          title={t('state.error.title')}
          body={rateLimited ? t('state.error.rateLimited') : t('state.error.body')}
          action={(
            <button
              type="button"
              onClick={() => void session.refetch()}
              className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-black text-white hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:bg-white dark:text-slate-900"
            >
              {t('state.retry')}
            </button>
          )}
        />
      </MyScoresShell>
    )
  }

  const step = session.data.next_step
  if (step === 'unavailable') {
    return (
      <MyScoresShell>
        <MyScoresNotice icon={<Hourglass className="h-7 w-7" />} title={t('state.unavailable.title')} body={t('state.unavailable.body')} />
      </MyScoresShell>
    )
  }

  // Each step gets its own screen in FE-002 (onboarding, consent, new year)
  // and FE-005 (dashboard).
  return (
    <MyScoresShell>
      <MyScoresNotice icon={<ClipboardList className="h-7 w-7" />} title={t(STEP_TITLES[step])} body={t('state.placeholder')} />
    </MyScoresShell>
  )
}
