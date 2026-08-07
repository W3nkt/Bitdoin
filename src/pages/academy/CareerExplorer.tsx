import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, ArrowRight, BookOpen, BriefcaseBusiness, CheckCircle2, ChevronRight,
  CircleDollarSign, CircleGauge, ExternalLink, Globe2, GraduationCap, Lock, MapPin, Search, Sparkles, Target, X,
} from 'lucide-react'
import {
  careerPaths, certificatesForSkill, jobSearchPlatforms, organizationsByCareer, salaryByCareer,
  type CareerPath, type CareerRegion,
} from '@/data/careerPaths'
import { PremiumProfileMenu } from '@/components/premium/ProfileMenu'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { supabase } from '@/lib/supabase'
import { firstRelation } from '@/lib/supabaseRelations'
import { cn } from '@/lib/utils'
import { careerPathsLo } from '@/data/careerPathsLo'

const regions: Array<'All' | CareerRegion> = ['All', 'Laos', 'Asia', 'Global']
const fields = ['All', ...new Set(careerPaths.map(item => item.field))]
// Free accounts get full detail on the first 3 careers (a fixed, stable set
// by dataset order, not by search/filter order) — everything else needs Premium.
const FREE_CAREER_LIMIT = 3
const FREE_UNLOCKED_CAREER_IDS = new Set(careerPaths.slice(0, FREE_CAREER_LIMIT).map(career => career.id))
const laoLabels: Record<string, string> = {
  All: 'ທັງໝົດ', Laos: 'ລາວ', Asia: 'ອາຊີ', Global: 'ທົ່ວໂລກ',
  Technology: 'ເຕັກໂນໂລຊີ', Engineering: 'ວິສະວະກຳ', Healthcare: 'ສາທາລະນະສຸກ',
  Business: 'ທຸລະກິດ', Sustainability: 'ການພັດທະນາຍືນຍົງ', Finance: 'ການເງິນ',
  Design: 'ການອອກແບບ', 'Artificial Intelligence': 'ປັນຍາປະດິດ',
  High: 'ສູງ', Growing: 'ກຳລັງເຕີບໂຕ', Steady: 'ຄົງທີ່',
  'Laos employer': 'ນາຍຈ້າງໃນລາວ', 'Global employer': 'ນາຍຈ້າງລະດັບໂລກ',
  'Asia employer': 'ນາຍຈ້າງໃນອາຊີ', 'Laos public sector': 'ພາກລັດລາວ',
  'International development': 'ອົງກອນພັດທະນາສາກົນ', 'Regional development': 'ອົງກອນພັດທະນາພາກພື້ນ',
  'Global professional services': 'ບໍລິການວິຊາຊີບລະດັບໂລກ', Conservation: 'ອົງກອນອະນຸລັກ',
  'Global health': 'ສາທາລະນະສຸກສາກົນ', 'AI employer': 'ນາຍຈ້າງດ້ານ AI',
  'International policy': 'ນະໂຍບາຍສາກົນ', 'Privacy and AI governance': 'ຄວາມສ່ວນຕົວ ແລະ ການກຳກັບ AI',
  'Global consulting': 'ທີ່ປຶກສາລະດັບໂລກ', 'AI data services': 'ບໍລິການຂໍ້ມູນ AI',
}
const copy = {
  en: {
    field: 'Field', market: 'Market', empty: 'No matching career paths. Try a broader search.',
    majors: 'Majors that can lead here', skills: 'Skills employers look for',
    certificates: 'Where to earn skill certificates', pathway: 'Your study-to-career path',
    salary: 'Estimated salary range', organizations: 'Organizations to explore',
    openings: 'Find current openings', signal: 'Job-market signal', assess: 'Assess this career with AI Coach',
    salaryNote: 'Indicative gross ranges for early-to-mid career roles. Actual pay varies by country, experience, organization, benefits, and employment type.',
    certificateNote: 'Check the provider’s language, prerequisites, assessment format, and fees before enrolling. A certificate supports—but does not replace—projects and practical experience.',
    opportunities: 'illustrative opportunities across selected markets',
    signalNote: 'Market signals are directional sample data in this MVP, not a live or exhaustive count. Source dates and direct posting links will appear here when job feeds are connected.',
    demand: 'demand',
    lockedBadge: 'Premium career',
    lockedTitle: 'Unlock full details for this career',
    lockedBody: `You’ve explored ${FREE_CAREER_LIMIT} careers in full on the Free plan. Subscribe to Premium to unlock majors, skills, certificates, salary ranges, organizations, and job-market signal for every career path.`,
    lockedCta: 'Subscribe to unlock',
  },
  lo: {
    field: 'ຂະແໜງ', market: 'ຕະຫຼາດ', empty: 'ບໍ່ພົບອາຊີບທີ່ກົງກັນ. ລອງຄົ້ນຫາແບບກວ້າງຂຶ້ນ.',
    majors: 'ສາຂາຮຽນທີ່ພາໄປສູ່ອາຊີບນີ້', skills: 'ທັກສະທີ່ນາຍຈ້າງຕ້ອງການ',
    certificates: 'ບ່ອນຮຽນ ແລະ ຮັບໃບຢັ້ງຢືນທັກສະ', pathway: 'ເສັ້ນທາງຈາກການຮຽນສູ່ອາຊີບ',
    salary: 'ຊ່ວງເງິນເດືອນໂດຍປະມານ', organizations: 'ອົງກອນທີ່ຄວນສຳຫຼວດ',
    openings: 'ຄົ້ນຫາຕຳແໜ່ງວ່າງປັດຈຸບັນ', signal: 'ສັນຍານຕະຫຼາດວຽກ', assess: 'ປະເມີນອາຊີບນີ້ກັບ AI Coach',
    salaryNote: 'ຕົວເລກລວມໂດຍປະມານສຳລັບລະດັບເລີ່ມຕົ້ນຫາກາງ. ເງິນເດືອນຈິງຂຶ້ນກັບປະເທດ, ປະສົບການ ແລະ ອົງກອນ.',
    certificateNote: 'ກວດສອບພາສາ, ເງື່ອນໄຂ, ການປະເມີນ ແລະ ຄ່າຮຽນກ່ອນລົງທະບຽນ. ໃບຢັ້ງຢືນບໍ່ສາມາດທົດແທນປະສົບການຈິງ.',
    opportunities: 'ໂອກາດວຽກຕົວຢ່າງໃນຕະຫຼາດທີ່ເລືອກ',
    signalNote: 'ຂໍ້ມູນນີ້ເປັນພຽງສັນຍານຕົວຢ່າງ, ບໍ່ແມ່ນຈຳນວນວຽກແບບສົດ ຫຼື ຄົບຖ້ວນ.',
    demand: 'ຄວາມຕ້ອງການ',
    lockedBadge: 'ອາຊີບສະມາຊິກ',
    lockedTitle: 'ປົດລັອກລາຍລະອຽດເຕັມຮູບແບບ',
    lockedBody: `ທ່ານໄດ້ເບິ່ງລາຍລະອຽດເຕັມຮູບແບບ ${FREE_CAREER_LIMIT} ອາຊີບໃນແຜນຟຣີແລ້ວ. ສະໝັກສະມາຊິກເພື່ອປົດລັອກສາຂາຮຽນ, ທັກສະ, ໃບຢັ້ງຢືນ, ຊ່ວງເງິນເດືອນ, ອົງກອນ ແລະ ສັນຍານຕະຫຼາດວຽກສຳລັບທຸກອາຊີບ.`,
    lockedCta: 'ສະໝັກເພື່ອປົດລັອກ',
  },
}

export function CareerExplorer() {
  const { language, setLanguage } = useLanguage()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState<(typeof regions)[number]>('All')
  const [field, setField] = useState('All')
  const [selectedId, setSelectedId] = useState(careerPaths[0].id)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
  const lo = language === 'lo'
  const text = copy[language]

  // An ACTIVE subscription on the $0 Free plan still has status = 'ACTIVE',
  // so the paywall must check that the active plan is actually paid, not
  // just that a subscription row exists.
  const access = useQuery({
    queryKey: ['premium', 'paid-access', profile?.id],
    enabled: Boolean(profile),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('premium_subscriptions')
        .select('id,plan:premium_plans(price_lak)')
        .eq('user_id', profile!.id).eq('status', 'ACTIVE')
        .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (error) throw error
      const plan = firstRelation(data?.plan)
      return Boolean(data) && (plan?.price_lak ?? 0) > 0
    },
    staleTime: 0,
    refetchOnMount: 'always',
  })
  const isPremium = Boolean(access.data)
  const isLocked = (career: CareerPath) => !isPremium && !FREE_UNLOCKED_CAREER_IDS.has(career.id)

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return careerPaths.filter(career => {
      const laoCareer = careerPathsLo[career.id]
      const matchesQuery = !normalized || [
        career.title, career.field, career.summary, ...career.majors, ...career.skills,
        laoCareer?.title ?? '', laoCareer?.summary ?? '', ...(laoCareer?.majors ?? []), ...(laoCareer?.skills ?? []),
      ].some(value => value.toLowerCase().includes(normalized))
      return matchesQuery
        && (region === 'All' || career.regions.includes(region))
        && (field === 'All' || career.field === field)
    })
  }, [field, query, region])

  const selected = filtered.find(item => item.id === selectedId) ?? filtered[0]

  function goBack() {
    // Go back in history (preserves the Learning Hub's scroll position) when we
    // arrived from within the app; otherwise fall back to the Learning Hub itself.
    if (window.history.state?.idx > 0) navigate(-1)
    else navigate('/academy/learn')
  }

  return (
    <div className="min-h-screen bg-[#f5f6f2] text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-900/10 bg-[#f5f6f2]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <button type="button" onClick={goBack} className="grid h-10 w-10 place-items-center rounded-full hover:bg-slate-900/5" aria-label="Back to Academy">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700">Bitdoin Academy</p>
            <h1 className="truncate text-base font-black sm:text-lg">{lo ? 'ສຳຫຼວດອາຊີບ' : 'Career Explorer'}</h1>
          </div>
          {profile ? (
            <PremiumProfileMenu variant="light" />
          ) : (
            <button onClick={() => setLanguage(lo ? 'en' : 'lo')} className="rounded-full border border-slate-900/10 px-3 py-2 text-xs font-black">
              {lo ? 'EN' : 'ລາວ'}
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <section className="relative -mx-4 overflow-hidden bg-[#092c25] px-4 py-12 text-white sm:mx-0 sm:mt-6 sm:rounded-[2rem] sm:px-10 sm:py-14">
          <div className="pointer-events-none absolute -right-12 -top-24 h-72 w-72 rounded-full border-[46px] border-emerald-300/10 motion-safe:animate-[spin_28s_linear_infinite]" />
          <div className="relative max-w-3xl motion-safe:animate-fade-in">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
              <Sparkles className="h-4 w-4" /> {lo ? 'ເລືອກອະນາຄົດດ້ວຍຂໍ້ມູນ' : 'Choose with evidence'}
            </p>
            <h2 className="mt-4 max-w-2xl text-4xl font-black leading-[1.02] sm:text-6xl">
              {lo ? 'ຈາກວິຊາຮຽນ ໄປສູ່ວຽກທີ່ເໝາະກັບເຈົ້າ.' : 'See where a major can take you.'}
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-6 text-emerald-50/75 sm:text-base">
              {lo ? 'ຄົ້ນຫາອາຊີບ, ວິຊາຮຽນ, ທັກສະ ແລະ ເສັ້ນທາງຈາກໂຮງຮຽນໄປສູ່ວຽກທຳ.' : 'Compare careers, study options, practical skills, and the steps from school to your first role.'}
            </p>
          </div>
        </section>

        <section className="relative z-10 -mt-5 border-b border-slate-900/10 bg-white px-4 py-4 shadow-[0_14px_40px_-24px_rgba(15,23,42,0.45)] sm:mx-8 sm:rounded-2xl sm:border">
          <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_auto_auto]">
            <label className="flex h-12 items-center gap-3 rounded-xl bg-slate-100 px-4">
              <Search className="h-4 w-4 text-slate-400" />
              <input value={query} onChange={event => setQuery(event.target.value)} placeholder={lo ? 'ຄົ້ນຫາວຽກ, ສາຂາຮຽນ ຫຼື ທັກສະ' : 'Search a job, major, or skill'} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
              {query && <button onClick={() => setQuery('')} aria-label="Clear search"><X className="h-4 w-4 text-slate-400" /></button>}
            </label>
            <FilterSelect value={field} onChange={setField} label={text.field} options={fields} lo={lo} />
            <FilterSelect value={region} onChange={value => setRegion(value as typeof region)} label={text.market} options={regions} lo={lo} />
          </div>
        </section>

        <div className="mt-9 grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(420px,1.15fr)]">
          <section>
            <div className="mb-3 flex items-end justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">{lo ? 'ອາຊີບທີ່ພົບ' : 'Career matches'}</p>
                <h2 className="mt-1 text-2xl font-black">{filtered.length} {lo ? 'ເສັ້ນທາງ' : 'paths to explore'}</h2>
              </div>
              <p className="hidden text-xs text-slate-500 sm:block">{lo ? 'ເລືອກເພື່ອເບິ່ງລາຍລະອຽດ' : 'Select one for details'}</p>
            </div>
            <div className="divide-y divide-slate-900/10 border-y border-slate-900/10">
              {filtered.map(career => {
                const locked = isLocked(career)
                return (
                  <button key={career.id} onClick={() => {
                    setSelectedId(career.id)
                    if (window.matchMedia('(max-width: 1023px)').matches) setMobileDetailOpen(true)
                  }} className={cn(
                    'group grid w-full grid-cols-[1fr_auto] items-center gap-4 px-1 py-5 text-left transition hover:px-3',
                    selected?.id === career.id && 'bg-white px-3',
                    locked && 'opacity-70',
                  )}>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black">{lo ? careerPathsLo[career.id]?.title ?? career.title : career.title}</h3>
                        <DemandBadge demand={career.demand} lo={lo} />
                        {locked && (
                          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-800">
                            <Lock className="h-3 w-3" /> {text.lockedBadge}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">{lo ? careerPathsLo[career.id]?.summary ?? career.summary : career.summary}</p>
                      <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-slate-400">
                        <GraduationCap className="h-3.5 w-3.5" /> {lo ? careerPathsLo[career.id]?.majors[0] ?? career.majors[0] : career.majors[0]}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-emerald-700" />
                  </button>
                )
              })}
              {!filtered.length && <div className="py-16 text-center text-sm text-slate-500">{text.empty}</div>}
            </div>
          </section>

          <div className="hidden lg:block">
            {selected && <CareerDetail career={selected} language={language} locked={isLocked(selected)} />}
          </div>
        </div>
      </main>

      {selected && (
        <CareerDetailSheet
          open={mobileDetailOpen}
          onClose={() => setMobileDetailOpen(false)}
          career={selected}
          language={language}
          locked={isLocked(selected)}
        />
      )}
    </div>
  )
}

function CareerDetailSheet({ open, onClose, career, language, locked }: { open: boolean; onClose: () => void; career: CareerPath; language: 'lo' | 'en'; locked: boolean }) {
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    const handler = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handler)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:hidden" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-[1.75rem] bg-white shadow-2xl motion-safe:animate-slide-up">
        <div className="sticky top-0 z-10 flex justify-center bg-slate-950 pb-1 pt-3">
          <div className="h-1 w-10 rounded-full bg-white/30" />
        </div>
        <button
          onClick={onClose}
          aria-label="Close career details"
          className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </button>
        <CareerDetail career={career} language={language} locked={locked} />
      </div>
    </div>
  )
}

function FilterSelect({ value, onChange, label, options, lo }: { value: string; onChange: (value: string) => void; label: string; options: readonly string[]; lo: boolean }) {
  return (
    <label className="grid grid-cols-[auto_1fr] items-center gap-3 rounded-xl border border-slate-200 bg-white px-4">
      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</span>
      <select value={value} onChange={event => onChange(event.target.value)} className="h-12 min-w-0 bg-transparent text-sm font-bold outline-none">
        {options.map(option => <option key={option} value={option}>{lo ? laoLabels[option] ?? option : option}</option>)}
      </select>
    </label>
  )
}

function DemandBadge({ demand, lo }: { demand: CareerPath['demand']; lo: boolean }) {
  return <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide', demand === 'High' ? 'bg-emerald-100 text-emerald-800' : demand === 'Growing' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600')}>{lo ? laoLabels[demand] : demand}</span>
}

function CareerDetail({ career, language, locked }: { career: CareerPath; language: 'lo' | 'en'; locked: boolean }) {
  const lo = language === 'lo'
  const text = copy[language]
  const localized = careerPathsLo[career.id]
  const title = lo ? localized?.title ?? career.title : career.title
  const summary = lo ? localized?.summary ?? career.summary : career.summary
  const majors = lo ? localized?.majors ?? career.majors : career.majors
  const skills = lo ? localized?.skills ?? career.skills : career.skills
  const pathway = lo ? localized?.pathway ?? career.pathway : career.pathway
  return (
    <aside key={career.id} className="self-start overflow-hidden bg-white shadow-[0_20px_70px_-40px_rgba(15,23,42,0.45)] motion-safe:animate-fade-in lg:sticky lg:top-24 lg:rounded-[1.75rem]">
      <div className="bg-slate-950 px-6 py-7 text-white sm:px-8">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">{lo ? laoLabels[career.field] ?? career.field : career.field}</p>
            <h2 className="mt-2 text-3xl font-black">{title}</h2>
          </div>
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-300 text-slate-950"><BriefcaseBusiness className="h-6 w-6" /></span>
        </div>
        <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">{summary}</p>
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-slate-300">
          <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-emerald-300" />{career.regions.map(region => lo ? laoLabels[region] : region).join(' · ')}</span>
          <span className="flex items-center gap-1.5"><CircleGauge className="h-4 w-4 text-emerald-300" />{lo ? laoLabels[career.demand] : career.demand} {text.demand}</span>
        </div>
      </div>

      {locked ? (
        <div className="px-6 py-7 sm:px-8">
          <CareerPaywall text={text} />
        </div>
      ) : (
      <div className="space-y-8 px-6 py-7 sm:px-8">
        <DetailSection icon={GraduationCap} title={text.majors}>
          <div className="flex flex-wrap gap-2">{majors.map(major => <span key={major} className="rounded-full bg-[#edf2e9] px-3 py-2 text-xs font-bold text-slate-700">{major}</span>)}</div>
        </DetailSection>
        <DetailSection icon={Target} title={text.skills}>
          <ul className="grid gap-2 sm:grid-cols-2">{skills.map(skill => <li key={skill} className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-emerald-600" />{skill}</li>)}</ul>
        </DetailSection>
        <DetailSection icon={GraduationCap} title={text.certificates}>
          <div className="divide-y divide-slate-100 border-y border-slate-100">
            {career.skills.map((skill, index) => (
              <div key={skill} className="py-3">
                <p className="text-sm font-black">{skills[index] ?? skill}</p>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                  {certificatesForSkill(skill).map(certificate => (
                    <a key={`${skill}-${certificate.name}`} href={certificate.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline">
                      {certificate.name} <span className="font-medium text-slate-400">· {certificate.provider}</span><ExternalLink className="h-3 w-3" />
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-4 text-slate-400">{text.certificateNote}</p>
        </DetailSection>
        <DetailSection icon={BookOpen} title={text.pathway}>
          <ol className="relative ml-2 border-l border-emerald-200">
            {pathway.map((step, index) => <li key={step} className="relative pb-4 pl-6 last:pb-0"><span className="absolute -left-3 grid h-6 w-6 place-items-center rounded-full bg-emerald-700 text-[10px] font-black text-white">{index + 1}</span><p className="pt-0.5 text-sm font-semibold leading-5">{step}</p></li>)}
          </ol>
        </DetailSection>
        <DetailSection icon={CircleDollarSign} title={text.salary}>
          <div className="divide-y divide-slate-100 border-y border-slate-100">
            {[
              [lo ? laoLabels.Laos : 'Laos', salaryByCareer[career.id]?.laos],
              [lo ? laoLabels.Asia : 'Asia', salaryByCareer[career.id]?.asia],
              [lo ? laoLabels.Global : 'Global', salaryByCareer[career.id]?.global],
            ].map(([market, salary]) => (
              <div key={market} className="flex items-center justify-between gap-4 py-3 text-sm">
                <span className="font-bold text-slate-500">{market}</span>
                <span className="text-right font-black">{salary}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-4 text-slate-400">{text.salaryNote}</p>
        </DetailSection>
        <DetailSection icon={BriefcaseBusiness} title={text.organizations}>
          <div className="divide-y divide-slate-100 border-y border-slate-100">
            {(organizationsByCareer[career.id] ?? []).map(organization => (
              <a key={organization.name} href={organization.url} target="_blank" rel="noreferrer" className="group flex items-center justify-between gap-4 py-3">
                <span><span className="block text-sm font-black group-hover:text-emerald-700">{organization.name}</span><span className="text-[11px] text-slate-400">{lo ? laoLabels[organization.type] ?? organization.type : organization.type}</span></span>
                <ExternalLink className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-emerald-700" />
              </a>
            ))}
          </div>
        </DetailSection>
        <DetailSection icon={Search} title={text.openings}>
          <div className="flex flex-wrap gap-2">
            {jobSearchPlatforms.map(platform => (
              <a key={platform.name} href={platform.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-2 text-xs font-bold transition hover:border-emerald-600 hover:text-emerald-700">
                {platform.name}<ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </div>
        </DetailSection>
        <DetailSection icon={Globe2} title={text.signal}>
          <div className="flex items-end justify-between gap-4 border-y border-slate-100 py-4">
            <div><p className="text-3xl font-black">{career.openingsSignal.toLocaleString()}+</p><p className="mt-1 text-xs text-slate-500">{text.opportunities}</p></div>
            <DemandBadge demand={career.demand} lo={lo} />
          </div>
          <p className="mt-3 text-[11px] leading-4 text-slate-400">{text.signalNote}</p>
        </DetailSection>
        <Link to={`/academy/coach?career=${encodeURIComponent(career.id)}`} className="group flex items-center justify-between rounded-2xl bg-emerald-700 px-5 py-4 text-sm font-black text-white transition hover:bg-emerald-800">
          {text.assess} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
        </Link>
      </div>
      )}
    </aside>
  )
}

function DetailSection({ icon: Icon, title, children }: { icon: typeof Target; title: string; children: React.ReactNode }) {
  return <section><h3 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500"><Icon className="h-4 w-4 text-emerald-700" />{title}</h3>{children}</section>
}

function CareerPaywall({ text }: { text: (typeof copy)['en'] }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-[#092c25] px-6 py-8 text-center text-white">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-300 text-slate-950"><Lock className="h-6 w-6" /></span>
      <h3 className="mt-4 text-lg font-black">{text.lockedTitle}</h3>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-emerald-50/80">{text.lockedBody}</p>
      <Link to="/academy/subscription#plans" className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-200">
        {text.lockedCta} <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}
