import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { User, Globe, DollarSign, LogOut, Shield, Package } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export function Profile() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const { language, setLanguage, currency, setCurrency } = useLanguage()

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

  return (
    <div className="space-y-4 max-w-md mx-auto">
      {/* Avatar */}
      <div className="flex flex-col items-center py-6">
        <div className="h-20 w-20 rounded-full bg-primary-100 flex items-center justify-center">
          <span className="text-3xl font-bold text-primary-700">
            {profile.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <h2 className="mt-3 text-lg font-bold text-gray-900">{profile.name}</h2>
        <p className="text-sm text-gray-400">{profile.email ?? profile.phone}</p>
        <span className="mt-1 rounded-full bg-primary-100 px-3 py-0.5 text-xs font-medium text-primary-700">
          {profile.role}
        </span>
      </div>

      {/* Orders shortcut */}
      <Card hover onClick={() => navigate('/orders')} className="flex items-center gap-3">
        <div className="rounded-xl bg-blue-50 p-2.5">
          <Package className="h-5 w-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-800">{t('orders.title')}</p>
          <p className="text-xs text-gray-400">View all your orders</p>
        </div>
      </Card>

      {/* Language & Currency */}
      <Card padding>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Preferences</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-700">Language</span>
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
                  {lang === 'lo' ? 'ລາວ' : 'ENG'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-700">Currency</span>
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

      {/* Admin link */}
      {profile.role !== 'CUSTOMER' && (
        <Card hover onClick={() => navigate('/admin')} className="flex items-center gap-3">
          <div className="rounded-xl bg-purple-50 p-2.5">
            <Shield className="h-5 w-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">Admin Dashboard</p>
            <p className="text-xs text-gray-400">Manage the platform</p>
          </div>
        </Card>
      )}

      {/* Sign out */}
      <Button variant="outline" fullWidth icon={<LogOut className="h-4 w-4" />} onClick={handleSignOut}>
        {t('nav.signOut')}
      </Button>
    </div>
  )
}
