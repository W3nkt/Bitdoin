import { type ReactNode, useState } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard, BookOpen, Store, Tag, ShoppingBag, ClipboardList,
  CreditCard, Truck, BarChart3, Settings, LogOut, Menu, X, ChevronLeft, DollarSign, ScrollText, Lightbulb
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { AdminNotificationsContext } from '@/context/AdminNotificationsContext'
import { useAdminNotifications } from '@/hooks/useAdminNotifications'
import { cn } from '@/lib/utils'
import { publicAsset } from '@/lib/assets'

interface AdminLayoutProps { children: ReactNode }

export function AdminLayout({ children }: AdminLayoutProps) {
  const { t } = useTranslation()
  const { signOut, profile } = useAuth()
  const { language, setLanguage, currency, setCurrency } = useLanguage()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { orderBadge, paymentBadge, deliveryBadge, markSeen } = useAdminNotifications()

  const badgeCounts: Record<string, number> = {
    '/admin/orders':    orderBadge,
    '/admin/payments':  paymentBadge,
    '/admin/deliveries': deliveryBadge,
  }

  const navItems = [
    { to: '/admin',              icon: LayoutDashboard, label: t('admin.dashboard'),  end: true },
    { to: '/admin/books',        icon: BookOpen,        label: t('admin.books') },
    { to: '/admin/book-intake',  icon: ClipboardList,   label: 'Book Intake' },
    { to: '/admin/bookstores',   icon: Store,           label: t('admin.bookstores') },
    { to: '/admin/pricing',      icon: Tag,             label: t('admin.pricing') },
    { to: '/admin/orders',       icon: ShoppingBag,     label: t('admin.orders') },
    { to: '/admin/payments',     icon: CreditCard,      label: t('admin.payments') },
    { to: '/admin/deliveries',   icon: Truck,           label: t('admin.deliveries') },
    { to: '/admin/analytics',    icon: BarChart3,       label: t('admin.analytics') },
    { to: '/admin/knowledge',     icon: Lightbulb,       label: 'Knowledge Hub' },
    { to: '/admin/settings',     icon: Settings,        label: t('admin.settings') },
    { to: '/admin/audit-logs',   icon: ScrollText,      label: 'Audit Logs', adminOnly: true },
  ]

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  const Sidebar = () => (
    <aside className="flex flex-col h-full bg-primary-900">
      {/* Logo area */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-white/10 flex-shrink-0">
        <img
          src={publicAsset('icons/Bitdoin Logo H.png')}
          alt="Bitdoin"
          className="h-10 w-10 rounded-lg bg-white object-contain"
        />
        <span className="text-xl font-bold text-white tracking-tight">Bitdoin</span>
        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary-200 uppercase tracking-wider">
          Admin
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-hide py-4 px-3 space-y-0.5">
        {navItems.filter(item => !item.adminOnly || profile?.role === 'ADMIN').map(({ to, icon: Icon, label, end }) => {
          const badge = badgeCounts[to] ?? 0
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-primary-200 hover:bg-white/8 hover:text-white',
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {badge > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-accent-500 text-[10px] font-bold text-white px-1 leading-none">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Display preferences */}
      <div className="border-t border-white/10 px-3 py-3">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setLanguage(language === 'lo' ? 'en' : 'lo')}
            className="flex h-9 items-center justify-center gap-2 rounded-xl bg-white/10 px-2 text-xs font-semibold text-primary-100 transition-colors hover:bg-white/15 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            title="Switch language"
            aria-label={`Switch language to ${language === 'lo' ? 'English' : 'Lao'}`}
          >
            <LanguageFlag target={language === 'lo' ? 'en' : 'lo'} />
            <span>{language === 'lo' ? 'EN' : 'ລາວ'}</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrency(currency === 'LAK' ? 'USD' : 'LAK')}
            className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-white/10 px-2 text-xs font-semibold text-primary-100 transition-colors hover:bg-white/15 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            title="Switch currency"
            aria-label={`Switch currency to ${currency === 'LAK' ? 'USD' : 'LAK'}`}
          >
            {currency === 'LAK' ? (
              <DollarSign className="h-3.5 w-3.5" />
            ) : (
              <span className="text-sm leading-none" aria-hidden="true">₭</span>
            )}
            <span>{currency === 'LAK' ? 'USD' : 'LAK'}</span>
          </button>
        </div>
      </div>

      {/* User footer */}
      <div className="p-3 border-t border-white/10 flex-shrink-0 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/10">
          <div className="h-8 w-8 rounded-full bg-accent-500 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-white">
              {profile?.name?.charAt(0).toUpperCase() ?? 'A'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{profile?.name ?? 'Admin'}</p>
            <p className="text-xs text-primary-300 truncate capitalize">{profile?.role?.toLowerCase()}</p>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="p-1.5 rounded-lg hover:bg-white/10 text-primary-300 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <Link
          to="/"
          className="flex items-center gap-2 px-3 py-1.5 text-xs text-primary-300 hover:text-white transition-colors rounded-lg hover:bg-white/8"
        >
          <ChevronLeft className="h-3 w-3" />
          View store
        </Link>
      </div>
    </aside>
  )

  return (
    <AdminNotificationsContext.Provider value={{ markSeen }}>
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <div className="hidden md:flex w-60 flex-shrink-0 flex-col">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-60 z-50 shadow-2xl">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <header className="md:hidden flex items-center gap-3 px-4 h-14 bg-white border-b border-gray-100 shadow-sm flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </button>
          <img
            src={publicAsset('icons/Bitdoin Logo H.png')}
            alt="Bitdoin"
            className="h-9 w-9 rounded-lg bg-white object-contain"
          />
          <span className="text-lg font-bold text-primary-900 tracking-tight">Bitdoin</span>
          <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-semibold text-primary-700 uppercase tracking-wider">
            Admin
          </span>
          <div className="ml-auto flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setLanguage(language === 'lo' ? 'en' : 'lo')}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-600 transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              title="Switch language"
              aria-label={`Switch language to ${language === 'lo' ? 'English' : 'Lao'}`}
            >
              <LanguageFlag target={language === 'lo' ? 'en' : 'lo'} />
            </button>
            <button
              type="button"
              onClick={() => setCurrency(currency === 'LAK' ? 'USD' : 'LAK')}
              className="flex h-9 items-center gap-1 rounded-xl px-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              title="Switch currency"
              aria-label={`Switch currency to ${currency === 'LAK' ? 'USD' : 'LAK'}`}
            >
              {currency === 'LAK' ? (
                <span className="text-sm leading-none" aria-hidden="true">₭</span>
              ) : (
                <DollarSign className="h-3.5 w-3.5" />
              )}
              {currency}
            </button>
          </div>
          {sidebarOpen && (
            <button
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
    </AdminNotificationsContext.Provider>
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
