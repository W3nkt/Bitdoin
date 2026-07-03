import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { User, Globe, DollarSign, LogOut, LayoutDashboard, Package, ChevronRight, Sparkles } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

export function Profile() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const { language, setLanguage, currency, setCurrency } = useLanguage()
  const roleLabel = profile?.role === 'ADMIN'
    ? t('nav.admin')
    : profile?.role === 'CUSTOMER'
      ? t('nav.profile')
      : profile?.role

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <User className="h-16 w-16 text-gray-300" />
        <p className="text-gray-500">{t('auth.signIn')}</p>
        <Button onClick={() => navigate('/auth')}>{t('nav.signIn')}</Button>
      </div>
    )
  }

  const isAdmin = profile.role !== 'CUSTOMER'

  return (
    <div className="-mx-4 -mt-4 pb-6">
      {/* Header banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-800 via-primary-700 to-indigo-600 px-4 pb-8 pt-10 text-center">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-14 -left-10 h-48 w-48 rounded-full bg-accent-500/20 blur-2xl" />

        <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/15 ring-4 ring-white/30 backdrop-blur-sm">
          <span className="text-3xl font-black text-white">
            {profile.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <h2 className="relative mt-3 text-lg font-bold text-white">{profile.name}</h2>
        <p className="relative text-sm text-white/70">{profile.email ?? profile.phone}</p>
        <span className={cn(
          'relative mt-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold',
          isAdmin ? 'bg-amber-400 text-amber-950' : 'bg-white/20 text-white',
        )}>
          {isAdmin && <Sparkles className="h-3 w-3" />}
          {roleLabel}
        </span>
      </div>

      <div className="mx-auto max-w-md space-y-4 px-4 pt-4">
        {/* Admin dashboard CTA — the primary action for staff, styled to stand out */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="group flex w-full items-center gap-4 rounded-3xl bg-gradient-to-r from-indigo-600 to-primary-600 p-5 text-left shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.99]"
          >
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white/20">
              <LayoutDashboard className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-white">{t('admin.dashboard')}</p>
              <p className="text-xs text-white/70">{t('profile.managePlatform')}</p>
            </div>
            <ChevronRight className="h-5 w-5 flex-shrink-0 text-white transition-transform group-hover:translate-x-1" />
          </button>
        )}

        {/* Orders shortcut */}
        <Card hover onClick={() => navigate('/orders')} className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 p-2.5 shadow-sm">
            <Package className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">{t('orders.title')}</p>
            <p className="text-xs text-gray-400">{t('orders.manageAll')}</p>
          </div>
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-300" />
        </Card>

        {/* Language & Currency */}
        <Card padding>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('profile.preferences')}</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-blue-50 p-1.5">
                  <Globe className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <span className="text-sm text-gray-700">{t('book.language')}</span>
              </div>
              <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                {(['lo', 'en'] as const).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      language === lang ? 'bg-primary-700 text-white' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {lang === 'lo' ? t('sidebar.lao') : t('sidebar.english')}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-green-50 p-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-green-600" />
                </div>
                <span className="text-sm text-gray-700">{t('profile.currency')}</span>
              </div>
              <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                {(['LAK', 'USD'] as const).map(cur => (
                  <button
                    key={cur}
                    onClick={() => setCurrency(cur)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      currency === cur ? 'bg-primary-700 text-white' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {cur}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Sign out */}
        <Button
          variant="outline"
          fullWidth
          icon={<LogOut className="h-4 w-4" />}
          onClick={handleSignOut}
          className="border-red-200 text-red-600 hover:bg-red-50"
        >
          {t('nav.signOut')}
        </Button>
      </div>
    </div>
  )
}
