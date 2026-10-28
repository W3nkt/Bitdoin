import { useSearchParams } from 'react-router-dom'
import { Activity, BarChart3, BookOpenCheck, CalendarDays, Flag, LifeBuoy, ListChecks, MessageSquareWarning, Ruler, ScanLine, BadgeCheck, Bot, Briefcase, School, ScrollText, Tags, Users } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { MfaGate } from '@/components/academic/admin/MfaGate'
import { AdminSection } from '@/components/academic/admin/AdminKit'
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
import { AiReviewAdmin } from '@/components/academic/admin/AiReviewAdmin'
import { CareersAdmin } from '@/components/academic/admin/CareersAdmin'
import { ResponsiveAcademyMenu } from '@/components/academy/AcademyMenu'
import { AcademyAdminHeader } from '@/components/admin/AcademyAdminHeader'

type TabId = 'subjects' | 'scales' | 'schools' | 'calendars' | 'quiz' | 'content' | 'roles' | 'support' | 'reports' | 'audit' | 'health' | 'metrics' | 'scans' | 'plans' | 'ai' | 'careers' | 'pilot'

// Each section keeps one colour: in the menu, on its header and on every panel inside it.
const TABS: Array<{ id: TabId; label: string; icon: typeof Users; color: string; roles: string[] }> = [
  { id: 'subjects', label: 'Subjects', icon: BookOpenCheck, color: '#2563eb', roles: ['ADMIN'] },
  { id: 'scales', label: 'Grading scales', icon: Ruler, color: '#7c3aed', roles: ['ADMIN'] },
  { id: 'schools', label: 'Schools', icon: School, color: '#6366f1', roles: ['ADMIN'] },
  { id: 'calendars', label: 'Calendars', icon: CalendarDays, color: '#e48b26', roles: ['ADMIN'] },
  { id: 'quiz', label: 'Quiz items', icon: ListChecks, color: '#8b5cf6', roles: ['ADMIN'] },
  { id: 'content', label: 'Content', icon: Tags, color: '#0ea5e9', roles: ['ADMIN'] },
  { id: 'roles', label: 'Roles', icon: Users, color: '#31a59a', roles: ['ADMIN'] },
  { id: 'support', label: 'Support', icon: LifeBuoy, color: '#df779d', roles: ['ADMIN', 'OPERATIONS'] },
  { id: 'reports', label: 'Reports', icon: MessageSquareWarning, color: '#f97316', roles: ['ADMIN', 'OPERATIONS'] },
  { id: 'audit', label: 'Audit log', icon: ScrollText, color: '#64748b', roles: ['ADMIN', 'OPERATIONS'] },
  { id: 'health', label: 'Health', icon: Activity, color: '#10b981', roles: ['ADMIN'] },
  { id: 'metrics', label: 'Metrics', icon: BarChart3, color: '#3989cd', roles: ['ADMIN'] },
  { id: 'scans', label: 'Scan quality', icon: ScanLine, color: '#0d9488', roles: ['ADMIN'] },
  { id: 'plans', label: 'Entitlements', icon: BadgeCheck, color: '#d59627', roles: ['ADMIN', 'FINANCE'] },
  { id: 'ai', label: 'AI review', icon: Bot, color: '#ab69ce', roles: ['ADMIN'] },
  { id: 'careers', label: 'Careers', icon: Briefcase, color: '#14b8a6', roles: ['ADMIN'] },
  { id: 'pilot', label: 'Pilot', icon: Flag, color: '#e11d48', roles: ['ADMIN'] },
]

/**
 * /academy-admin/scores — Schooling configuration and support (FE-007, #34).
 * ADMIN configures; OPERATIONS gets support and their own audit entries
 * (OD-01b). Everything sits behind an authenticator-app check (OD-13).
 */
export function MyScoresAdmin() {
  const { profile } = useAuth()
  const [params, setParams] = useSearchParams()
  const role = profile?.role ?? 'CUSTOMER'
  const tabs = TABS.filter(tab => tab.roles.includes(role))
  const active = tabs.find(tab => tab.id === params.get('tab')) ?? tabs[0]

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 dark:bg-gray-950 dark:text-slate-100">
      <AcademyAdminHeader backTo="/academy-admin" title={<><School aria-hidden className="h-5 w-5" />Schooling</>} />

      {active && <ResponsiveAcademyMenu compact docked pathname="/academy-admin/scores"
        title={{ en: 'Schooling admin sections', lo: 'ເມນູຈັດການໂຮງຮຽນ' }} brand="BITDOIN SCHOOLING"
        items={tabs.map(tab => ({
          id: tab.id,
          en: tab.label,
          lo: tab.label,
          icon: tab.icon,
          color: tab.color,
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
            <span aria-hidden className="mx-auto mb-3 block text-4xl">🔒</span>
            <h2 className="text-xl font-black">No Schooling access</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Your role does not include Schooling admin or support. Ask an admin if you need it.</p>
          </section>
        ) : (
          <AdminSection.Provider value={{ icon: active.icon, color: active.color }}>
            <div className="mb-5 flex items-center gap-3">
              <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${active.color}, ${active.color}bb)` }}>
                <active.icon className="h-6 w-6" />
              </span>
              <p className="text-xl font-black">{active.label}</p>
            </div>
            <MfaGate>
              {active.id === 'subjects' && <SubjectsAdmin />}
              {active.id === 'scales' && <ScalesAdmin />}
              {active.id === 'schools' && <SchoolsAdmin />}
              {active.id === 'calendars' && <CalendarsAdmin />}
              {active.id === 'quiz' && <QuizBankAdmin />}
              {active.id === 'content' && <ContentAdmin />}
              {active.id === 'roles' && <RolesAdmin />}
              {active.id === 'support' && <SupportAdmin isAdmin={role === 'ADMIN'} />}
              {active.id === 'reports' && <ReportsAdmin />}
              {active.id === 'audit' && <AuditAdmin isAdmin={role === 'ADMIN'} />}
              {active.id === 'health' && <HealthAdmin />}
              {active.id === 'metrics' && <MetricsAdmin />}
              {active.id === 'scans' && <OcrQualityAdmin />}
              {active.id === 'plans' && <EntitlementsAdmin />}
              {active.id === 'ai' && <AiReviewAdmin />}
              {active.id === 'careers' && <CareersAdmin />}
              {active.id === 'pilot' && <PilotAdmin />}
            </MfaGate>
          </AdminSection.Provider>
        )}
      </main>
    </div>
  )
}
