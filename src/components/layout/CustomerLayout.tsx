import { type ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Home, BookOpen, ShoppingCart, Package, User, Search, DollarSign } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { cn } from '@/lib/utils'
import { publicAsset } from '@/lib/assets'

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
    { to: '/',       icon: Home,        label: t('nav.home'),    end: true  },
    { to: '/books',  icon: BookOpen,    label: t('nav.catalog'), end: false },
    { to: '/cart',   icon: ShoppingCart,label: t('nav.cart'),    end: false, badge: cartCount },
    { to: '/orders', icon: Package,     label: t('nav.orders'),  end: false },
    { to: profile ? '/profile' : '/auth', icon: User,
      label: profile ? t('nav.profile') : t('nav.signIn'),        end: false },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Top header ── */}
      <header className="sticky top-0 z-30 glass border-b border-white/60 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 md:h-16 flex items-center gap-3">

          {/* Logo */}
          <Link to="/" className="flex flex-shrink-0 items-center" aria-label={t('appName')}>
            <img
              src={publicAsset('icons/Bitdoin-Logo.png')}
              alt={t('appName')}
              className="h-10 w-28 object-contain object-left md:h-12 md:w-32"
            />
          </Link>

          {/* Search bar — md+ only */}
          <button
            onClick={() => navigate('/search')}
            className="hidden md:flex h-10 w-48 flex-none items-center gap-2.5 rounded-2xl border border-gray-200 bg-gray-100/80 px-3.5 text-sm text-gray-400 transition-all hover:border-primary-300 hover:bg-white lg:w-72 xl:w-80"
          >
            <Search className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
            <span className="truncate text-xs">{t('home.searchPlaceholder')}</span>
          </button>

          {/* Nav links — md+ only */}
          <nav className="hidden md:flex min-w-0 flex-1 items-center gap-1 overflow-x-auto scrollbar-hide">
            {navLinks.map(({ to, icon: Icon, label, end, badge }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => cn(
                  'relative flex h-9 flex-shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors',
                  isActive
                    ? 'bg-primary-700 text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-primary-800',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
                {(badge ?? 0) > 0 && (
                  <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[9px] font-bold text-white">
                    {(badge ?? 0) > 9 ? '9+' : badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Spacer on mobile (nav is in bottom bar) */}
          <div className="flex-1 md:hidden" />

          {/* Controls */}
          <div className="flex flex-shrink-0 items-center gap-0.5">
            {/* Mobile search icon */}
            <button
              onClick={() => navigate('/search')}
              className="md:hidden flex h-9 w-9 items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label={t('common.search')}
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Language toggle */}
            <button
              onClick={() => setLanguage(language === 'lo' ? 'en' : 'lo')}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-lg hover:bg-gray-100 transition-colors"
              title="Switch language"
              aria-label="Switch language"
            >
              <LanguageFlag target={language === 'lo' ? 'en' : 'lo'} />
            </button>

            {/* Currency toggle — md+ */}
            <button
              onClick={() => setCurrency(currency === 'LAK' ? 'USD' : 'LAK')}
              className="hidden md:flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              title="Switch currency"
            >
              {currency === 'LAK' ? (
                <span className="text-sm leading-none" aria-hidden="true">₭</span>
              ) : (
                <DollarSign className="h-3.5 w-3.5" />
              )}
              <span>{currency}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Page content ── */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-4 pb-4">
        {children}
      </main>

      {/* ── Mobile bottom tab bar — hidden on md+ ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-sm border-t border-gray-200">
        <div className="flex items-stretch h-14">
          {navLinks.map(({ to, icon: Icon, label, end, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 py-1 transition-colors',
                isActive ? 'text-primary-700' : 'text-gray-400 active:text-gray-600',
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {(badge ?? 0) > 0 && (
                  <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[9px] font-bold text-white">
                    {(badge ?? 0) > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold leading-none">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

    </div>
  )
}

function LanguageFlag({ target }: { target: 'lo' | 'en' }) {
  if (target === 'lo') {
    return (
      <span className="relative block h-4 w-6 overflow-hidden rounded-sm border border-gray-200 bg-[#002868] shadow-sm" aria-hidden="true">
        <span className="absolute inset-x-0 top-0 h-1/4 bg-[#ce1126]" />
        <span className="absolute inset-x-0 bottom-0 h-1/4 bg-[#ce1126]" />
        <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
      </span>
    )
  }
  return (
    <span className="relative block h-4 w-6 overflow-hidden rounded-sm border border-gray-200 bg-white shadow-sm" aria-hidden="true">
      <span className="absolute left-1/2 top-0 h-full w-1 -translate-x-1/2 bg-[#ce1126]" />
      <span className="absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 bg-[#ce1126]" />
    </span>
  )
}
