import { type ReactNode, useState } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard, BookOpen, Store, Tag, ShoppingBag,
  CreditCard, Truck, BarChart3, Settings, LogOut, Menu, X, ChevronRight
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

interface AdminLayoutProps { children: ReactNode }

export function AdminLayout({ children }: AdminLayoutProps) {
  const { t } = useTranslation()
  const { signOut, profile } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navItems = [
    { to: '/admin',             icon: LayoutDashboard, label: t('admin.dashboard'),  end: true },
    { to: '/admin/books',       icon: BookOpen,        label: t('admin.books') },
    { to: '/admin/bookstores',  icon: Store,           label: t('admin.bookstores') },
    { to: '/admin/pricing',     icon: Tag,             label: t('admin.pricing') },
    { to: '/admin/orders',      icon: ShoppingBag,     label: t('admin.orders') },
    { to: '/admin/payments',    icon: CreditCard,      label: t('admin.payments') },
    { to: '/admin/deliveries',  icon: Truck,           label: t('admin.deliveries') },
    { to: '/admin/analytics',   icon: BarChart3,       label: t('admin.analytics') },
    { to: '/admin/settings',    icon: Settings,        label: t('admin.settings') },
  ]

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  const Sidebar = () => (
    <aside className="flex flex-col h-full bg-primary-700">
      <div className="flex items-center gap-3 px-5 h-16 border-b border-primary-600">
        <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center">
          <BookOpen className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">Pwen Books</p>
          <p className="text-[10px] text-primary-200">Admin</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium mb-0.5 transition-colors',
              isActive
                ? 'bg-white/20 text-white'
                : 'text-primary-200 hover:bg-white/10 hover:text-white',
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-primary-600">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/10">
          <div className="h-8 w-8 rounded-full bg-primary-200 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-primary-800">
              {profile?.name?.charAt(0).toUpperCase() ?? 'A'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{profile?.name ?? 'Admin'}</p>
            <p className="text-xs text-primary-200 truncate">{profile?.role}</p>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="p-1 rounded-lg hover:bg-white/10 text-primary-200 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <Link
          to="/"
          className="mt-2 flex items-center gap-2 px-3 py-2 text-xs text-primary-200 hover:text-white transition-colors"
        >
          <ChevronRight className="h-3 w-3 rotate-180" />
          View store
        </Link>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <div className="hidden md:flex w-56 flex-shrink-0 flex-col">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 z-50">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center gap-3 px-4 h-14 bg-white border-b border-gray-100">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl hover:bg-gray-100">
            <Menu className="h-5 w-5 text-gray-600" />
          </button>
          <span className="font-semibold text-gray-800">Pwen Books Admin</span>
          {sidebarOpen && (
            <button className="ml-auto p-2 rounded-xl hover:bg-gray-100" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5 text-gray-600" />
            </button>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
