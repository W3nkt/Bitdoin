import { AlertTriangle, ClipboardList, Hourglass, PenLine, ShieldCheck } from 'lucide-react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { MyScoresNotice, MyScoresShell } from '@/components/academic/MyScoresShell'
import { Onboarding } from '@/components/academic/Onboarding'
import { ConsentReview } from '@/components/academic/ConsentReview'
import { NewSchoolYear } from '@/components/academic/NewSchoolYear'
import { MyData } from '@/components/academic/MyData'
import { ScoreEntry } from '@/components/academic/ScoreEntry'
import { useAuth } from '@/context/AuthContext'
import { useAcademicCopy } from '@/lib/academic/copy'
import { AcademicError } from '@/lib/academic/errors'
import { useAcademicSession, type AcademicSession } from '@/lib/academic/session'

/**
 * /academy/scores/* — My Scores (FE-001). Uses the existing Bitdoin session
 * (AUTH-001): signed-out visitors go to /auth and come back here. The
 * database decides which screen comes next.
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

  const data = session.data
  if (data.next_step === 'unavailable') {
    return (
      <MyScoresShell>
        <MyScoresNotice icon={<Hourglass className="h-7 w-7" />} title={t('state.unavailable.title')} body={t('state.unavailable.body')} />
      </MyScoresShell>
    )
  }

  return (
    <Routes>
      <Route
        path="data"
        element={data.profile
          ? <MyScoresShell subtitle={t('data.title')} backTo="/academy/scores"><MyData activeEnrolmentId={data.active_enrolment_id} /></MyScoresShell>
          : <Navigate to="/academy/scores" replace />}
      />
      <Route
        path="entry"
        element={data.next_step === 'ready' && data.active_enrolment_id
          ? <MyScoresShell subtitle={t('entry.subtitle')} backTo="/academy/scores"><ScoreEntry userId={profile.id} enrolmentId={data.active_enrolment_id} /></MyScoresShell>
          : <Navigate to="/academy/scores" replace />}
      />
      <Route path="*" element={<MyScoresShell><StepScreen session={data} /></MyScoresShell>} />
    </Routes>
  )
}

function StepScreen({ session }: { session: AcademicSession }) {
  const { t } = useAcademicCopy()
  switch (session.next_step) {
    case 'onboarding':
      return <Onboarding noticeVersion={session.notice_version ?? ''} />
    case 'consent':
      return <ConsentReview session={session} />
    case 'new_school_year':
      return <NewSchoolYear hasEnrolment={!!session.active_enrolment_id} />
    default:
      // The dashboard arrives with FE-005; until then, link to My data.
      return (
        <MyScoresNotice
          icon={<ClipboardList className="h-7 w-7" />}
          title={t('state.next.ready')}
          body={t('state.placeholder')}
          action={(
            <div className="flex flex-col items-center gap-3">
              <Link to="/academy/scores/entry" className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-black text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
                <PenLine className="h-4 w-4" />{t('entry.cta')}
              </Link>
              <Link to="/academy/scores/data" className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-black text-white hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:bg-white dark:text-slate-900">
                <ShieldCheck className="h-4 w-4" />{t('data.link')}
              </Link>
            </div>
          )}
        />
      )
  }
}
