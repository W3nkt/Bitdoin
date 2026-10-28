import type { ReactNode } from 'react'
import { Languages, Moon, Sun } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { PremiumProfileMenu } from '@/components/premium/ProfileMenu'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

const controlClass = 'flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-900/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-slate-200 dark:hover:bg-white/10'

/** Standard right-hand controls for every public and member Academy header. */
export function AcademyHeaderActions({ guestAction }: { guestAction?: ReactNode }) {
  const { profile } = useAuth()
  const { language, setLanguage } = useLanguage()
  const location = useLocation()
  const dark = useTheme(state => state.theme) === 'dark'
  const toggleTheme = useTheme(state => state.toggleTheme)
  const lo = language === 'lo'
  const switchTheme = dark
    ? (lo ? 'ປ່ຽນເປັນໂໝດສະຫວ່າງ' : 'Switch to light mode')
    : (lo ? 'ປ່ຽນເປັນໂໝດມືດ' : 'Switch to dark mode')

  return (
    <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1.5">
      <button data-no-premium-translate type="button" onClick={() => setLanguage(lo ? 'en' : 'lo')} aria-label={lo ? 'English' : 'ລາວ'} title={lo ? 'English' : 'ລາວ'} className={cn(controlClass, 'gap-1.5 px-2.5 text-xs font-bold sm:px-3')}>
        <Languages className="h-4 w-4" />
        <span className="hidden min-[420px]:inline">{lo ? 'English' : 'ລາວ'}</span>
      </button>
      <button data-no-premium-translate type="button" onClick={toggleTheme} aria-label={switchTheme} title={switchTheme} className={cn(controlClass, 'w-10 dark:text-amber-300')}>
        {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
      </button>
      {profile ? <PremiumProfileMenu variant="light" showPreferences={false} /> : guestAction ?? (
        <Link to="/auth" state={{ from: `${location.pathname}${location.search}${location.hash}` }} className="ml-1 whitespace-nowrap rounded-full bg-gradient-to-r from-[#fbb040] to-[#f7931a] px-3 py-2.5 text-sm font-black text-[#1f1207] shadow-[0_8px_22px_-8px_rgba(247,147,26,0.8)] transition hover:from-[#ffc766] hover:to-[#fbb040] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 sm:px-4">
          {lo ? 'ເຂົ້າສູ່ລະບົບ' : 'Sign in'}
        </Link>
      )}
    </div>
  )
}
