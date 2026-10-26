import { useNavigate, useSearchParams } from 'react-router-dom'
import { Activity, ArrowLeft, BarChart3, BookOpenCheck, CalendarDays, Flag, ExternalLink, LifeBuoy, ListChecks, MessageSquareWarning, Moon, Ruler, ScanLine, BadgeCheck, School, ScrollText, Sun, Tags, Users } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/lib/theme'
import { MfaGate } from '@/components/academic/admin/MfaGate'
import { SubjectsAdmin } from '@/components/academic/admin/SubjectsAdmin'
import { ScalesAdmin } from '@/components/academic/admin/ScalesAdmin'
import { SchoolsAdmin } from '@/components/academic/admin/SchoolsAdmin'
import { CalendarsAdmin } from '@/components/academic/admin/CalendarsAdmin'
import { RolesAdmin } from '@/components/academic/admin/RolesAdmin'
import { SupportAdmin } from '@/components/academic/admin/SupportAdmin'
import { AuditAdmin } from '@/components/academic/admin/AuditAdmin'
import { HealthAdmin } from '@/components/academic/admin/HealthAdmin'
import { MetricsAdmin } from '@/components/academic/admin/MetricsAdmin'
import { PilotAdmin } from '@/components/academic/admin/PilotAdmin'
import { QuizBankAdmin } from '@/components/academic/admin/QuizBankAdmin'
import { ReportsAdmin } from '@/components/academic/admin/ReportsAdmin'
import { ContentAdmin } from '@/components/academic/admin/ContentAdmin'
import { OcrQualityAdmin } from '@/components/academic/admin/OcrQualityAdmin'
import { EntitlementsAdmin } from '@/components/academic/admin/EntitlementsAdmin'
import { ResponsiveAcademyMenu } from '@/components/academy/AcademyMenu'
import { AdminPlatformSwitch } from '@/components/admin/AdminPlatformSwitch'

type TabId = 'subjects' | 'scales' | 'schools' | 'calendars' | 'quiz' | 'content' | 'roles' | 'support' | 'reports' | 'audit' | 'health' | 'metrics' | 'scans' | 'plans' | 'pilot'

const TABS: Array<{ id: TabId; label: string; icon: typeof Users; roles: string[] }> = [
  { id: 'subjects', label: 'Subjects', icon: BookOpenCheck, roles: ['ADMIN'] },
  { id: 'scales', label: 'Grading scales', icon: Ruler, roles: ['ADMIN'] },
  { id: 'schools', label: 'Schools', icon: School, roles: ['ADMIN'] },
  { id: 'calendars', label: 'Calendars', icon: CalendarDays, roles: ['ADMIN'] },
  { id: 'quiz', label: 'Quiz items', icon: ListChecks, roles: ['ADMIN'] },
  { id: 'content', label: 'Content', icon: Tags, roles: ['ADMIN'] },
  { id: 'roles', label: 'Roles', icon: Users, roles: ['ADMIN'] },
  { id: 'support', label: 'Support', icon: LifeBuoy, roles: ['ADMIN', 'OPERATIONS'] },
  { id: 'reports', label: 'Reports', icon: MessageSquareWarning, roles: ['ADMIN', 'OPERATIONS'] },
  { id: 'audit', label: 'Audit log', icon: ScrollText, roles: ['ADMIN', 'OPERATIONS'] },
  { id: 'health', label: 'Health', icon: Activity, roles: ['ADMIN'] },
  { id: 'metrics', label: 'Metrics', icon: BarChart3, roles: ['ADMIN'] },
  { id: 'scans', label: 'Scan quality', icon: ScanLine, roles: ['ADMIN'] },
  { id: 'plans', label: 'Entitlements', icon: BadgeCheck, roles: ['ADMIN', 'FINANCE'] },
  { id: 'pilot', label: 'Pilot', icon: Flag, roles: ['ADMIN'] },
]

/**
 * /academy-admin/scores — Schooling configuration and support (FE-007, #34).
 * ADMIN configures; OPERATIONS gets support and their own audit entries
 * (OD-01b). Everything sits behind an authenticator-app check (OD-13).
 */
export function MyScoresAdmin() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const theme = useTheme(state => state.theme)
  const toggleTheme = useTheme(state => state.toggleTheme)
  const [params, setParams] = useSearchParams()
  const role = profile?.role ?? 'CUSTOMER'
  const tabs = TABS.filter(tab => tab.roles.includes(role))
  const active = tabs.find(tab => tab.id === params.get('tab')) ?? tabs[0]

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 dark:bg-gray-950 dark:text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950 text-white">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center gap-4 px-4 lg:pr-24">
          <button type="button" onClick={() => navigate('/academy-admin')} aria-label="Back to Academy admin" className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-white/10"><ArrowLeft className="h-5 w-5" /></button>
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-300">Academy Admin</p>
            <h1 className="flex items-center gap-2 text-xl font-black"><School className="h-5 w-5" />Schooling</h1>
          </div>
          <a href="/academy/scores" target="_blank" rel="noreferrer" className="hidden items-center gap-2 text-xs font-bold text-slate-300 sm:flex">Student view <ExternalLink className="h-4 w-4" /></a>
          <AdminPlatformSwitch platform="academy" />
          <button type="button" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-slate-200 transition-colors hover:bg-white/15 hover:text-white dark:text-amber-300">
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {active && <ResponsiveAcademyMenu compact pathname="/academy-admin/scores"
        title={{ en: 'Schooling admin sections', lo: 'ເມນູຈັດການໂຮງຮຽນ' }} brand="BITDOIN SCHOOLING"
        items={tabs.map((tab, index) => ({
          id: tab.id,
          en: tab.label,
          lo: tab.label,
          icon: tab.icon,
          color: ['#3989cd', '#ab69ce', '#6366f1', '#e48b26', '#31a59a', '#df779d'][index % 6],
          active: tab.id === active.id,
          onSelect: () => setParams(current => {
            const next = new URLSearchParams(current)
            next.set('tab', tab.id)
            return next
          }),
        }))} />}
      <main className="mx-auto max-w-7xl px-4 py-8 pb-24 [&_section]:min-w-0 [&_article]:min-w-0 [&_table]:relative">
        {!active ? (
          <section className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-700">
            <h2 className="text-xl font-black">No Schooling access</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Your role does not include Schooling admin or support. Ask an admin if you need it.</p>
          </section>
        ) : (
          <>
            <MfaGate>
              {active.id === 'subjects' && <SubjectsAdmin />}
              {active.id === 'scales' && <ScalesAdmin />}
              {active.id === 'schools' && <SchoolsAdmin />}
              {active.id === 'calendars' && <CalendarsAdmin />}
              {active.id === 'quiz' && <QuizBankAdmin />}
              {active.id === 'content' && <ContentAdmin />}
              {active.id === 'roles' && <RolesAdmin />}
              {active.id === 'support' && <SupportAdmin />}
              {active.id === 'reports' && <ReportsAdmin />}
              {active.id === 'audit' && <AuditAdmin isAdmin={role === 'ADMIN'} />}
              {active.id === 'health' && <HealthAdmin />}
              {active.id === 'metrics' && <MetricsAdmin />}
              {active.id === 'scans' && <OcrQualityAdmin />}
              {active.id === 'plans' && <EntitlementsAdmin />}
              {active.id === 'pilot' && <PilotAdmin />}
            </MfaGate>
          </>
        )}
      </main>
    </div>
  )
}
