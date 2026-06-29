import { type ReactNode, useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Home, BookOpen, ShoppingCart, Package, PackageSearch, User, Search, DollarSign, X, Lightbulb } from 'lucide-react'
import { WhatsAppIcon, MessengerIcon, IPhoneIcon, GmailIcon } from '@/components/ui/ContactIcons'
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

  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50)
  }, [searchOpen])

  function openSearch() { setSearchOpen(true) }
  function closeSearch() { setSearchOpen(false); setSearchQuery('') }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = searchQuery.trim()
    if (q) navigate(`/books?q=${encodeURIComponent(q)}`)
    closeSearch()
  }

  const cartCount = totalItems()

  const navLinks = [
    { to: '/',           icon: Home,         label: t('nav.home'),      end: true  },
    { to: '/books',      icon: BookOpen,     label: t('nav.catalog'),   end: false },
    { to: '/knowledge',  icon: Lightbulb,    label: t('nav.knowledge'), end: false },
    { to: '/cart',       icon: ShoppingCart, label: t('nav.cart'),      end: false, badge: cartCount },
    { to: '/track',      icon: PackageSearch,label: t('nav.trackOrder'),end: false },
    ...(profile
      ? [{ to: '/orders', icon: Package, label: t('nav.orders'), end: false }]
      : []),
    { to: profile ? '/profile' : '/auth', icon: User,
      label: profile ? t('nav.profile') : t('nav.signIn'), end: false },
  ]

  const waNumber = (import.meta.env.VITE_ADMIN_WHATSAPP || '+8562095324510').replace(/\s+/g, '')
  const waHref = `https://wa.me/${waNumber.replace(/\D/g, '')}`
  const rawMessenger = import.meta.env.VITE_ADMIN_MESSENGER || 'm.me/620472337804971'
  const messengerHref = rawMessenger.startsWith('http') ? rawMessenger : `https://${rawMessenger.replace(/^\/+/, '')}`
  const phoneHref = `tel:${waNumber}`
  const email = 'ckateng25@gmail.com'
  const emailHref = `mailto:${email}`

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
            onClick={openSearch}
            className="hidden md:flex h-10 w-48 flex-none items-center gap-2.5 rounded-2xl border border-gray-200 bg-gray-100/80 px-3.5 text-sm text-gray-400 transition-all hover:border-primary-300 hover:bg-white lg:w-72 xl:w-80"
          >
            <Search className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
            <span className="truncate text-xs">{t('home.searchPlaceholder')}</span>
          </button>

          {/* Nav links — md+ only */}
          <nav className="hidden md:flex min-w-0 flex-1 items-center gap-2 overflow-x-auto scrollbar-hide">
            {navLinks.map(({ to, icon: Icon, label, end, badge }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => cn(
                  'relative flex flex-col flex-shrink-0 items-center justify-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] font-semibold transition-colors',
                  isActive
                    ? 'bg-primary-700 text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-primary-800',
                )}
              >
                <div className="relative">
                  <Icon className="h-4 w-4" />
                  {(badge ?? 0) > 0 && (
                    <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[9px] font-bold text-white">
                      {(badge ?? 0) > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Spacer on mobile (nav is in bottom bar) */}
          <div className="flex-1 md:hidden" />

          {/* Controls */}
          <div className="flex flex-shrink-0 items-center gap-0.5">
            {/* Mobile search icon */}
            <button
              onClick={openSearch}
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

      {/* ── Footer ── */}
      <footer className="bg-primary-900 text-white">
        <div className="max-w-6xl mx-auto px-4 pt-8 pb-24 md:pb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            {/* Brand */}
            <div>
              <img
                src={publicAsset('icons/Bitdoin-Logo.png')}
                alt={t('appName')}
                className="h-10 w-28 object-contain object-left brightness-0 invert mb-2"
              />
              <p className="text-xs text-primary-400">© {new Date().getFullYear()} Bitdoin. All rights reserved.</p>
            </div>

            {/* Contact links */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary-300 mb-3">
                {t('nav.contacts')}
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={waHref}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/20 transition-colors"
                >
                  <WhatsAppIcon className="h-4 w-4 text-green-400" />
                  <span>WhatsApp</span>
                </a>
                <a
                  href={messengerHref}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/20 transition-colors"
                >
                  <MessengerIcon className="h-4 w-4 text-blue-400" />
                  <span>Messenger</span>
                </a>
                <a
                  href={phoneHref}
                  className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/20 transition-colors"
                >
                  <IPhoneIcon className="h-4 w-4 text-gray-300" />
                  <span>{waNumber}</span>
                </a>
                <a
                  href={emailHref}
                  className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/20 transition-colors"
                >
                  <GmailIcon className="h-4 w-4 text-red-400" />
                  <span>{email}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Search overlay ── */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-20">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeSearch} />
          {/* Modal */}
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <form onSubmit={submitSearch} className="flex items-center gap-3 p-4">
              <Search className="h-5 w-5 flex-shrink-0 text-gray-400" />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('home.searchPlaceholder')}
                className="min-w-0 flex-1 bg-transparent text-base text-gray-800 placeholder:text-gray-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Clear"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button
                type="submit"
                disabled={!searchQuery.trim()}
                className="flex-shrink-0 rounded-xl bg-primary-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 hover:bg-primary-800 transition-colors"
              >
                {t('common.search', 'Search')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Mobile bottom tab bar — hidden on md+ ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-sm border-t border-gray-200">
        <div className="flex items-stretch h-14">
          {navLinks.map(({ to, icon: Icon, label, end, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => cn(
                'min-w-0 flex-1 flex flex-col items-center justify-center gap-0.5 py-1 transition-colors',
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
              <span className="max-w-full truncate px-0.5 text-[9px] font-semibold leading-none">{label}</span>
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
