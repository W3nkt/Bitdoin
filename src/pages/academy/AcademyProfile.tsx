import { ArrowLeft, Brain, CreditCard, GraduationCap, School, Target, UserRound } from 'lucide-react'
import { OpenBook } from '@/components/ui/OpenBook'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AcademyHeaderActions } from '@/components/academy/AcademyHeaderActions'
import { TelegramReminderCard } from '@/components/premium/TelegramReminderCard'
import { PushNotificationCard } from '@/components/notifications/PushNotificationCard'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useAcademicSession } from '@/lib/academic/session'

export function AcademyProfile() {
  const { profile, loading } = useAuth()
  const { language } = useLanguage()
  const navigate = useNavigate()
  const academicSession = useAcademicSession()
  const lo = language === 'lo'
  if (loading) return null
  if (!profile) return <Navigate to="/auth" replace />
  if (profile.role !== 'CUSTOMER') return <Navigate to="/academy-admin" replace />
  return (
    <main className="min-h-screen bg-[#f7f8fb] dark:bg-gray-950 text-slate-950 dark:text-slate-100">
      <header className="sticky top-[var(--academy-banner-h,0px)] z-30 pt-[var(--safe-top)] border-b border-slate-900/10 bg-white/90 backdrop-blur-xl dark:border-white/10 dark:bg-gray-950/90">
        <div className="mx-auto flex h-20 max-w-4xl items-center gap-3 px-4">
          <button onClick={() => navigate('/academy/home')} aria-label={lo ? 'ກັບຄືນ' : 'Back to Academy'} className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-slate-900/5 dark:hover:bg-white/10"><ArrowLeft className="h-5 w-5" /></button>
          <span className="hidden h-11 w-11 shrink-0 place-items-center rounded-2xl sm:grid bg-amber-400 text-[#071426]"><GraduationCap className="h-6 w-6" /></span>
          <div className="min-w-0 flex-1"><p className="truncate font-black">Bitdoin Academy</p><p className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">{lo ? 'ໂປຣໄຟລ໌ການຮຽນ' : 'Learning profile'}</p></div>
          <AcademyHeaderActions />
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <section className="flex items-center gap-5 border-b border-slate-200 dark:border-slate-700 pb-8">
          {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-20 w-20 rounded-full object-cover" /> : <span className="grid h-20 w-20 place-items-center rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300"><UserRound className="h-8 w-8" /></span>}
          <div><h1 className="text-2xl font-black">{profile.name}</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{profile.email || profile.phone}</p></div>
        </section>
        <nav className="mt-8 border-t border-slate-200 dark:border-slate-700">
          <ProfileLink to="/academy/learn" icon={OpenBook} title={lo ? 'ການຮຽນຂອງຂ້ອຍ' : 'My learning'} />
          <ProfileLink to="/academy/progress" icon={Target} title={lo ? 'ຄວາມຄືບໜ້າ' : 'Progress and achievements'} />
          {academicSession.data?.module_enabled && <ProfileLink to="/academy/scores?from=profile_link" icon={School} title={lo ? 'ໂຮງຮຽນ' : 'Schooling'} />}
          <ProfileLink to="/academy/coach" icon={Brain} title={lo ? 'AI Coach' : 'AI Coach conversations'} />
          <ProfileLink to="/academy/subscription" icon={CreditCard} title={lo ? 'ສະມາຊິກ ແລະ ການຈ່າຍ' : 'Membership and billing'} />
        </nav>
        <PushNotificationCard platform="ACADEMY" lo={lo} className="mt-8" />
        <TelegramReminderCard lo={lo} />
      </div>
    </main>
  )
}

function ProfileLink({ to, icon: Icon, title }: { to: string; icon: typeof OpenBook; title: string }) {
  return <Link to={to} className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-700 py-5"><Icon className="h-5 w-5 text-amber-600 dark:text-amber-400" /><span className="font-black">{title}</span></Link>
}
