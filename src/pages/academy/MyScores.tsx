import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Hourglass } from 'lucide-react'
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { MyScoresNotice, MyScoresShell } from '@/components/academic/MyScoresShell'
import { Onboarding } from '@/components/academic/Onboarding'
import { ConsentReview } from '@/components/academic/ConsentReview'
import { NewSchoolYear } from '@/components/academic/NewSchoolYear'
import { MyData } from '@/components/academic/MyData'
import { ScoreEntry } from '@/components/academic/ScoreEntry'
import { Planner } from '@/components/academic/Planner'
import { CareerGuidance } from '@/components/academic/CareerGuidance'
import { CareerReportPage } from '@/components/academic/CareerReport'
import { GuardianConsentStep } from '@/components/academic/Guardians'
import { History } from '@/components/academic/History'
import { Inbox } from '@/components/academic/Inbox'
import { QuizResult, QuizRunner } from '@/components/academic/Quiz'
import { PracticeRunner } from '@/components/academic/Practice'

// Charts (Recharts) load only with the dashboard.
const Dashboard = lazy(() => import('@/components/academic/Dashboard'))
import { useAuth } from '@/context/AuthContext'
import { useAcademicCopy } from '@/lib/academic/copy'
import { AcademicError } from '@/lib/academic/errors'
import { useAcademicSession, type AcademicSession } from '@/lib/academic/session'
import { landingSourceFrom, setLandingSource, useTrackUsage } from '@/lib/academic/usageEvents'

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
  const backTo = location.pathname.replace(/\/+$/, '') === '/academy/scores' ? undefined : '/academy/scores'
  const track = useTrackUsage()
  // Where this visit came from, read once on arrival (ANL-001).
  const [source] = useState(() => landingSourceFrom(location.search))
  const landed = useRef(false)
  const available = !!session.data && session.data.next_step !== 'unavailable'
  useEffect(() => {
    if (!available || landed.current) return
    landed.current = true
    setLandingSource(source)
    track('module_landing_viewed', { source })
  }, [available, source, track])

  if (loading) return <PageLoader />
  if (!profile) return <Navigate to="/auth" state={{ from: `${location.pathname}${location.search}` }} replace />
  if (session.isPending) return <PageLoader />

  if (session.isError) {
    const rateLimited = session.error instanceof AcademicError && session.error.code === 'RATE_LIMITED'
    return (
      <MyScoresShell backTo={backTo}>
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
      <MyScoresShell backTo={backTo}>
        <MyScoresNotice icon={<Hourglass className="h-7 w-7" />} title={t('state.unavailable.title')} body={t('state.unavailable.body')} />
      </MyScoresShell>
    )
  }

  const inbox = !!data.profile
  return (
    <Routes>
      <Route
        path="data"
        element={data.profile
          ? <MyScoresShell subtitle={t('data.title')} backTo="/academy/scores" inbox><MyData activeEnrolmentId={data.active_enrolment_id} /></MyScoresShell>
          : <Navigate to="/academy/scores" replace />}
      />
      <Route
        path="entry"
        element={data.next_step === 'ready' && data.active_enrolment_id
          ? <MyScoresShell subtitle={t('entry.subtitle')} backTo="/academy/scores" inbox><ScoreEntry userId={profile.id} enrolmentId={data.active_enrolment_id} /></MyScoresShell>
          : <Navigate to="/academy/scores" replace />}
      />
      <Route
        path="history"
        element={data.profile
          ? <MyScoresShell subtitle={t('history.title')} backTo="/academy/scores" inbox><History /></MyScoresShell>
          : <Navigate to="/academy/scores" replace />}
      />
      <Route
        path="quiz/result/:attemptId"
        element={data.profile
          ? <MyScoresShell subtitle={t('quiz.result.title')} backTo="/academy/scores" inbox><QuizResultRoute /></MyScoresShell>
          : <Navigate to="/academy/scores" replace />}
      />
      <Route
        path="quiz/:diagnosticId"
        element={data.next_step === 'ready'
          ? <MyScoresShell subtitle={t('quiz.title')} backTo="/academy/scores" inbox><QuizRunnerRoute /></MyScoresShell>
          : <Navigate to="/academy/scores" replace />}
      />
      <Route
        path="practice/:topicId"
        element={data.next_step === 'ready'
          ? <MyScoresShell subtitle={t('practice.title')} backTo="/academy/scores" inbox><PracticeRoute /></MyScoresShell>
          : <Navigate to="/academy/scores" replace />}
      />
      <Route
        path="planner"
        element={data.next_step === 'ready' && data.active_enrolment_id
          ? <MyScoresShell subtitle={t('planner.title')} backTo="/academy/scores" inbox><Planner /></MyScoresShell>
          : <Navigate to="/academy/scores" replace />}
      />
      <Route
        path="careers/report/:reportId"
        element={data.profile
          ? <MyScoresShell subtitle={t('careers.report.title')} backTo="/academy/scores/careers" inbox><CareerReportPage /></MyScoresShell>
          : <Navigate to="/academy/scores" replace />}
      />
      <Route
        path="careers"
        element={data.profile
          ? <MyScoresShell subtitle={t('careers.title')} backTo="/academy/scores" inbox><CareerGuidance /></MyScoresShell>
          : <Navigate to="/academy/scores" replace />}
      />
      <Route
        path="inbox"
        element={data.profile
          ? <MyScoresShell subtitle={t('inbox.title')} backTo="/academy/scores"><Inbox noticeVersion={data.notice_version} /></MyScoresShell>
          : <Navigate to="/academy/scores" replace />}
      />
      <Route path="*" element={<MyScoresShell inbox={inbox}><StepScreen session={data} userId={profile.id} /></MyScoresShell>} />
    </Routes>
  )
}

function QuizRunnerRoute() {
  const { diagnosticId = '' } = useParams()
  return <QuizRunner key={diagnosticId} diagnosticId={diagnosticId} />
}

function PracticeRoute() {
  const { topicId = '' } = useParams()
  return <PracticeRunner key={topicId} topicId={topicId} />
}

function QuizResultRoute() {
  const { attemptId = '' } = useParams()
  return <QuizResult attemptId={attemptId} />
}

function StepScreen({ session, userId }: { session: AcademicSession; userId: string }) {
  switch (session.next_step) {
    case 'onboarding':
      return <Onboarding noticeVersion={session.notice_version ?? ''} />
    case 'consent':
      return <ConsentReview session={session} />
    case 'guardian_consent':
      return <GuardianConsentStep />
    case 'new_school_year':
      return <NewSchoolYear hasEnrolment={!!session.active_enrolment_id} />
    default:
      return session.active_enrolment_id
        ? (
          <Suspense fallback={<div className="h-80 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />}>
            <Dashboard userId={userId} enrolmentId={session.active_enrolment_id} />
          </Suspense>
        )
        : <NewSchoolYear hasEnrolment={false} />
  }
}
