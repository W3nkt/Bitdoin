import { ArrowRight, Brain, Check, GraduationCap, Languages, ListChecks, Sparkles, Target, Trophy } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'

export function AcademyLanding() {
  const { profile, loading } = useAuth()
  const { language, setLanguage } = useLanguage()
  const lo = language === 'lo'
  if (loading) return null
  if (profile?.role === 'CUSTOMER') return <Navigate to="/academy/home" replace />
  if (profile) return <Navigate to="/academy-admin" replace />

  return (
    <main className="min-h-screen bg-[#071426] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex h-20 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link to="/academy" className="flex flex-1 items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-400 text-[#071426]"><GraduationCap className="h-6 w-6" /></span>
            <div><p className="font-black">Bitdoin Academy</p><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">Learn · Practice · Grow</p></div>
          </Link>
          <Link to="/" className="rounded-full border border-white/15 px-4 py-2 text-xs font-black text-slate-200 hover:bg-white/5">{lo ? 'ປ່ຽນແພລດຟອມ' : 'Switch platform'}</Link>
          <button onClick={() => setLanguage(lo ? 'en' : 'lo')} className="hidden items-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/5 sm:flex"><Languages className="h-4 w-4" />{lo ? 'English' : 'ລາວ'}</button>
        </div>
      </header>

      <section className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-28">
        <div className="absolute right-[-10rem] top-[-10rem] h-[34rem] w-[34rem] rounded-full bg-amber-400/10 blur-[100px]" />
        <div className="relative mx-auto max-w-7xl">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-300">{lo ? 'ແພລດຟອມການຮຽນສ່ວນຕົວ' : 'Your personal growth platform'}</p>
          <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[1.02] tracking-tight sm:text-7xl">
            {lo ? 'ສ້າງທັກສະທີ່ປ່ຽນຊີວິດທ່ານ.' : 'Build skills that change what comes next.'}
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
            {lo ? 'ບົດຮຽນທີ່ໃຊ້ໄດ້ຈິງ, AI Coach, ຄວາມທ້າທາຍອາທິດ ແລະ ນິໄສປະຈຳວັນ.' : 'Practical lessons, a personal AI Coach, weekly challenges, and daily habits—all in one focused learning space.'}
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link to="/auth" state={{ from: '/academy/home' }} className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-6 py-3.5 text-sm font-black text-[#071426] hover:bg-amber-300">
              {lo ? 'ເລີ່ມຮຽນ' : 'Start learning'}<ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/academy/subscription" className="rounded-full border border-white/20 px-6 py-3.5 text-sm font-black hover:bg-white/5">{lo ? 'ເບິ່ງສະມາຊິກ' : 'View membership'}</Link>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.03] px-4 py-16 sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-3">
          <Feature icon={Brain} title={lo ? 'AI Coach ສ່ວນຕົວ' : 'Personal AI Coach'} text={lo ? 'ຝຶກຮຽນ, ອາຊີບ, AI ແລະ ພາສາອັງກິດ.' : 'Get focused support for study, careers, AI, and English.'} />
          <Feature icon={Target} title={lo ? 'ຄວາມທ້າທາຍທີ່ຊັດເຈນ' : 'Clear weekly challenges'} text={lo ? 'ປ່ຽນຄວາມຮູ້ເປັນການກະທຳ.' : 'Turn useful knowledge into consistent action.'} />
          <Feature icon={ListChecks} title={lo ? 'ນິໄສທີ່ຕິດຕາມໄດ້' : 'Habits you can track'} text={lo ? 'ສ້າງຄວາມຄືບໜ້າເທື່ອລະມື້.' : 'Build momentum one completed day at a time.'} />
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">{lo ? 'ໜຶ່ງການຮຽນທີ່ສົມບູນ' : 'One complete learning rhythm'}</p>
            <h2 className="mt-4 text-4xl font-black">{lo ? 'ຮຽນ. ຝຶກ. ກັບມາເຮັດຕໍ່.' : 'Learn. Practice. Return stronger.'}</h2>
          </div>
          <div className="space-y-4">
            {[
              [Sparkles, lo ? 'ເລືອກຈາກ 8 ເສັ້ນທາງການຮຽນ' : 'Choose from eight practical learning paths'],
              [Check, lo ? 'ສຳເລັດບົດຮຽນ ແລະ ການທົດສອບ' : 'Complete short lessons and knowledge checks'],
              [Trophy, lo ? 'ສ້າງ XP, streak ແລະ ຄວາມຄືບໜ້າ' : 'Build XP, streaks, and visible progress'],
            ].map(([Icon, text]) => (
              <div key={String(text)} className="flex items-center gap-4 border-b border-white/10 pb-4"><span className="grid h-11 w-11 place-items-center rounded-full bg-amber-400/10 text-amber-300"><Icon className="h-5 w-5" /></span><p className="font-bold text-slate-200">{String(text)}</p></div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

function Feature({ icon: Icon, title, text }: { icon: typeof Brain; title: string; text: string }) {
  return <div><Icon className="h-7 w-7 text-amber-300" /><h2 className="mt-5 text-xl font-black">{title}</h2><p className="mt-3 text-sm leading-7 text-slate-400">{text}</p></div>
}
