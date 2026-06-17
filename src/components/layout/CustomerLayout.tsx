import { type ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Home, BookOpen, ShoppingCart, Package, User, Search, Globe, DollarSign } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { cn } from '@/lib/utils'

interface CustomerLayoutProps {
  children: ReactNode
}

export function CustomerLayout({ children }: CustomerLayoutProps) {
  const { t } = useTranslation()
  const { totalItems } = useCart()
  const { profile } = useAuth()
  const { language, setLanguage, currency, setCurrency } = useLanguage()
  const navigate = useNavigate()

  const cartCount = totalItems()

  const navLinks = [
    { to: '/',        icon: Home,      label: t('nav.home'),    end: true },
    { to: '/books',   icon: BookOpen,  label: t('nav.catalog'), end: false },
    { to: '/cart',    icon: ShoppingCart, label: t('nav.cart'), end: false },
    { to: '/orders',  icon: Package,   label: t('nav.orders'),  end: false },
    { to: profile ? '/profile' : '/auth', icon: User, label: profile ? t('nav.profile') : t('nav.signIn'), end: false },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="h-8 w-8 rounded-xl bg-primary-700 flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-primary-700 text-base">Pwen Books</span>
          </Link>

          <button
            onClick={() => navigate('/search')}
            className="flex-1 flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-400 hover:border-primary-400 transition-colors bg-gray-50"
          >
            <Search className="h-4 w-4" />
            <span>{t('home.searchPlaceholder')}</span>
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setLanguage(language === 'lo' ? 'en' : 'lo')}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
              title="Switch language"
            >
              <Globe className="h-4 w-4" />
              {language.toUpperCase()}
            </button>
            <button
              onClick={() => setCurrency(currency === 'LAK' ? 'USD' : 'LAK')}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
              title="Switch currency"
            >
              <DollarSign className="h-3.5 w-3.5" />
              {currency}
            </button>
          </div>

          {profile?.role !== 'CUSTOMER' && (
            <Link
              to="/admin"
              className="hidden sm:flex items-center gap-1 rounded-lg bg-primary-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-800"
            >
              Admin
            </Link>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-4">
        {children}
      </main>

      {/* Bottom Navigation (mobile) */}
      <nav className="sticky bottom-0 z-30 bg-white border-t border-gray-100 shadow-up">
        <div className="max-w-5xl mx-auto flex">
          {navLinks.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => cn(
                'flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs transition-colors relative',
                isActive ? 'text-primary-700' : 'text-gray-400 hover:text-gray-600',
              )}
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.5px]')} />
                    {to === '/cart' && cartCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 h-4 w-4 flex items-center justify-center rounded-full bg-accent-500 text-[9px] font-bold text-white">
                        {cartCount > 9 ? '9+' : cartCount}
                      </span>
                    )}
                  </div>
                  <span>{label}</span>
                  {isActive && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-primary-700" />}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
