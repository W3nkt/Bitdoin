import type { ReactNode } from 'react'
import { ArrowLeft, GraduationCap, type LucideIcon } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { AcademyHeaderActions } from './AcademyHeaderActions'

/** Top bar shared by the member Academy pages: logo, centred title, standard controls. */
export function AcademyPageHeader({ title, detail, back, actions }: {
  title: string
  detail?: string
  back?: { to: string; label: string }
  /** Extra controls placed before the standard ones. */
  actions?: ReactNode
}) {
  const navigate = useNavigate()
  return (
    <header className="sticky top-[var(--academy-banner-h,0px)] z-30 pt-[var(--safe-top)] border-b border-slate-900/10 bg-white/85 backdrop-blur-xl dark:border-white/10 dark:bg-gray-950/85">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:h-[72px] sm:gap-3">
        {back && <button
          type="button"
          onClick={() => navigate(back.to)}
          aria-label={back.label}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-slate-900/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:bg-white/10"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>}
        <Link to="/academy" aria-label="Bitdoin Academy" className="flex flex-none items-center gap-2.5 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
          <span className="grid h-10 w-10 flex-none place-items-center rounded-2xl bg-gradient-to-br from-[#fbb040] to-[#f7931a] text-[#1f1207] shadow-[0_8px_20px_-8px_rgba(247,147,26,0.8)]"><GraduationCap className="h-6 w-6" /></span>
          <span className="hidden whitespace-nowrap font-black leading-tight sm:block" data-no-premium-translate>Bitdoin Academy</span>
        </Link>
        <div className="hidden min-w-0 flex-1 text-center md:block">
          <h1 className="truncate text-lg font-black lg:text-xl">{title}</h1>
          {detail && <p className="mt-0.5 truncate text-xs font-semibold text-slate-500 dark:text-slate-400 lg:text-sm">{detail}</p>}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1.5 md:ml-0">
          {actions}
          <AcademyHeaderActions />
        </div>
      </div>
    </header>
  )
}

/** The page title on phones, where the header has no room for it. */
export function AcademyPageTitle({ icon: Icon, color, title, detail }: { icon: LucideIcon; color: string; title: string; detail?: string }) {
  return (
    <div data-no-premium-translate className="flex items-center gap-3 md:hidden">
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white shadow-sm dark:bg-slate-900" style={{ color }}><Icon className="h-5 w-5" /></span>
      <div><h1 className="text-xl font-black">{title}</h1>{detail && <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{detail}</p>}</div>
    </div>
  )
}
