import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown, Languages, LogOut, Moon, Settings, Sun } from 'lucide-react'
import { AdminPlatformSwitch } from '@/components/admin/AdminPlatformSwitch'
import { AdminProfileModal } from '@/components/admin/AdminProfileModal'
import { PwenLogoLockup } from '@/components/brand/PwenLogo'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

/** Top bar shared by the Academy admin pages; `title` sits in the centre. */
export function AcademyAdminHeader({ title, backTo }: { title?: ReactNode; backTo?: string }) {
  const navigate = useNavigate()
  const { language, setLanguage } = useLanguage()
  const theme = useTheme(state => state.theme)
  const toggleTheme = useTheme(state => state.toggleTheme)
  const { profile, signOut } = useAuth()
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!profileMenuOpen) return

    function closeProfileMenu(event: MouseEvent) {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setProfileMenuOpen(false)
      }
    }

    function closeProfileMenuOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setProfileMenuOpen(false)
    }

    document.addEventListener('mousedown', closeProfileMenu)
    document.addEventListener('keydown', closeProfileMenuOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeProfileMenu)
      document.removeEventListener('keydown', closeProfileMenuOnEscape)
    }
  }, [profileMenuOpen])

  async function handleSignOut() {
    setProfileMenuOpen(false)
    await signOut()
    navigate('/')
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-primary-900/95 text-white shadow-lg shadow-primary-950/20 backdrop-blur supports-[backdrop-filter]:bg-primary-900/85">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <div className="flex min-w-0 items-center gap-3">
            {backTo && (
              <Link
                to={backTo}
                aria-label="Back to Academy admin"
                title="Back to Academy admin"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
            )}
            <PwenLogoLockup
              textClassName="text-white"
              subTextClassName="text-primary-200"
              markClassName="rounded-xl bg-white/10 p-1"
            />
          </div>
          {/* Phones have no room beside the controls, so the title is read out only. */}
          {title && <h1 className="sr-only md:not-sr-only md:flex md:items-center md:gap-2 md:text-xl md:font-black">{title}</h1>}
          <div className="flex items-center gap-2 md:col-start-3 md:justify-self-end">
            <AdminPlatformSwitch platform="academy" />
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-primary-100 transition-colors hover:bg-white/15 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 dark:text-amber-300"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <div ref={profileMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen(open => !open)}
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
                aria-label="Open admin profile menu"
                className="flex items-center gap-2 rounded-full bg-white/10 p-1.5 pr-3 text-white transition-colors hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-amber-400 font-black text-primary-950 ring-2 ring-white/20">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    profile?.name?.charAt(0).toUpperCase() ?? 'A'
                  )}
                </span>
                <span className="hidden max-w-32 truncate text-sm font-bold sm:block">{profile?.name ?? 'Admin'}</span>
                <ChevronDown className={cn('h-4 w-4 transition-transform', profileMenuOpen && 'rotate-180')} />
              </button>

              {profileMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-900 p-2 text-slate-900 dark:text-slate-100 shadow-2xl"
                >
                  <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 px-3 py-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-amber-100 dark:bg-amber-500/15 font-black text-amber-800 dark:text-amber-300">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        profile?.name?.charAt(0).toUpperCase() ?? 'A'
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black">{profile?.name ?? 'Admin'}</span>
                      <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{profile?.email ?? profile?.role}</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setProfileMenuOpen(false); setProfileSettingsOpen(true) }}
                    className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Settings className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    Profile settings
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => setLanguage(language === 'lo' ? 'en' : 'lo')}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Languages className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <span className="flex-1">Language</span>
                    <span className="text-xs font-black text-primary-700 dark:text-primary-300">{language === 'lo' ? 'ລາວ' : 'English'}</span>
                  </button>
                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <AdminProfileModal open={profileSettingsOpen} onClose={() => setProfileSettingsOpen(false)} />
    </>
  )
}
