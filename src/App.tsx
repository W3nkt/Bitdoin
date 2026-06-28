import { Suspense, lazy } from 'react'
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { CartProvider } from '@/context/CartContext'
import { LanguageProvider } from '@/context/LanguageContext'
import { ToastProvider } from '@/components/ui/Toast'
import { CustomerLayout } from '@/components/layout/CustomerLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import '@/i18n'

// Customer pages
const Home       = lazy(() => import('@/pages/customer/Home').then(m => ({ default: m.Home })))
const Catalog    = lazy(() => import('@/pages/customer/Catalog').then(m => ({ default: m.Catalog })))
const BookDetail = lazy(() => import('@/pages/customer/BookDetail').then(m => ({ default: m.BookDetail })))
const Cart       = lazy(() => import('@/pages/customer/Cart').then(m => ({ default: m.Cart })))
const Checkout   = lazy(() => import('@/pages/customer/Checkout').then(m => ({ default: m.Checkout })))
const Orders     = lazy(() => import('@/pages/customer/Orders').then(m => ({ default: m.Orders })))
const OrderDetail = lazy(() => import('@/pages/customer/OrderDetail').then(m => ({ default: m.OrderDetail })))
const TrackOrder = lazy(() => import('@/pages/customer/TrackOrder').then(m => ({ default: m.TrackOrder })))
const Profile    = lazy(() => import('@/pages/customer/Profile').then(m => ({ default: m.Profile })))
const Contacts        = lazy(() => import('@/pages/customer/Contacts').then(m => ({ default: m.default || m })))
const Knowledge       = lazy(() => import('@/pages/customer/Knowledge').then(m => ({ default: m.Knowledge })))
const KnowledgeDetail = lazy(() => import('@/pages/customer/KnowledgeDetail').then(m => ({ default: m.KnowledgeDetail })))
const Auth       = lazy(() => import('@/pages/Auth').then(m => ({ default: m.Auth })))

// Admin pages
const AdminDashboard  = lazy(() => import('@/pages/admin/Dashboard').then(m => ({ default: m.AdminDashboard })))
const AdminBooks      = lazy(() => import('@/pages/admin/Books').then(m => ({ default: m.AdminBooks })))
const AdminBookstores = lazy(() => import('@/pages/admin/Bookstores').then(m => ({ default: m.AdminBookstores })))
const AdminPricing    = lazy(() => import('@/pages/admin/Pricing').then(m => ({ default: m.AdminPricing })))
const AdminOrders     = lazy(() => import('@/pages/admin/AdminOrders').then(m => ({ default: m.AdminOrders })))
const AdminPayments   = lazy(() => import('@/pages/admin/Payments').then(m => ({ default: m.AdminPayments })))
const AdminDeliveries = lazy(() => import('@/pages/admin/Deliveries').then(m => ({ default: m.AdminDeliveries })))
const AdminAnalytics  = lazy(() => import('@/pages/admin/Analytics').then(m => ({ default: m.AdminAnalytics })))
const AdminSettings   = lazy(() => import('@/pages/admin/Settings').then(m => ({ default: m.AdminSettings })))
const AdminAuditLogs  = lazy(() => import('@/pages/admin/AuditLogs').then(m => ({ default: m.AdminAuditLogs })))
const AdminKnowledge  = lazy(() => import('@/pages/admin/Knowledge').then(m => ({ default: m.AdminKnowledge })))

const qc = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 2, retry: 1 },
  },
})

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  const location = useLocation()
  if (loading) return <PageLoader />
  if (!profile) return <Navigate to="/auth" state={{ from: location.pathname }} replace />
  if (profile.role === 'CUSTOMER') return <Navigate to="/" replace />
  return <>{children}</>
}

export function App() {
  return (
    <QueryClientProvider client={qc}>
      <HashRouter>
        <AuthProvider>
          <LanguageProvider>
            <CartProvider>
              <ToastProvider>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Customer Routes */}
                    <Route element={<CustomerLayout><Suspense fallback={<PageLoader />}><div /></Suspense></CustomerLayout>} path="__unused__" />

                    <Route path="/" element={<CustomerLayout><Home /></CustomerLayout>} />
                    <Route path="/books" element={<CustomerLayout><Catalog /></CustomerLayout>} />
                    <Route path="/contacts" element={<CustomerLayout><Contacts /></CustomerLayout>} />
                    <Route path="/knowledge" element={<CustomerLayout><Knowledge /></CustomerLayout>} />
                    <Route path="/knowledge/:id" element={<CustomerLayout><KnowledgeDetail /></CustomerLayout>} />
                    <Route path="/books/:id" element={<CustomerLayout><BookDetail /></CustomerLayout>} />
                    <Route path="/cart" element={<CustomerLayout><Cart /></CustomerLayout>} />
                    <Route path="/checkout" element={<CustomerLayout><Checkout /></CustomerLayout>} />
                    <Route path="/orders" element={<CustomerLayout><Orders /></CustomerLayout>} />
                    <Route path="/orders/:id" element={<CustomerLayout><OrderDetail /></CustomerLayout>} />
                    <Route path="/track" element={<CustomerLayout><TrackOrder /></CustomerLayout>} />
                    <Route path="/profile" element={<CustomerLayout><Profile /></CustomerLayout>} />
                    <Route path="/auth" element={<Auth />} />

                    {/* Admin Routes */}
                    <Route path="/admin" element={
                      <AdminGuard><AdminLayout><AdminDashboard /></AdminLayout></AdminGuard>
                    } />
                    <Route path="/admin/books" element={
                      <AdminGuard><AdminLayout><AdminBooks /></AdminLayout></AdminGuard>
                    } />
                    <Route path="/admin/bookstores" element={
                      <AdminGuard><AdminLayout><AdminBookstores /></AdminLayout></AdminGuard>
                    } />
                    <Route path="/admin/pricing" element={
                      <AdminGuard><AdminLayout><AdminPricing /></AdminLayout></AdminGuard>
                    } />
                    <Route path="/admin/orders" element={
                      <AdminGuard><AdminLayout><AdminOrders /></AdminLayout></AdminGuard>
                    } />
                    <Route path="/admin/payments" element={
                      <AdminGuard><AdminLayout><AdminPayments /></AdminLayout></AdminGuard>
                    } />
                    <Route path="/admin/deliveries" element={
                      <AdminGuard><AdminLayout><AdminDeliveries /></AdminLayout></AdminGuard>
                    } />
                    <Route path="/admin/analytics" element={
                      <AdminGuard><AdminLayout><AdminAnalytics /></AdminLayout></AdminGuard>
                    } />
                    <Route path="/admin/settings" element={
                      <AdminGuard><AdminLayout><AdminSettings /></AdminLayout></AdminGuard>
                    } />
                    <Route path="/admin/audit-logs" element={
                      <AdminGuard><AdminLayout><AdminAuditLogs /></AdminLayout></AdminGuard>
                    } />
                    <Route path="/admin/knowledge" element={
                      <AdminGuard><AdminLayout><AdminKnowledge /></AdminLayout></AdminGuard>
                    } />

                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </ToastProvider>
            </CartProvider>
          </LanguageProvider>
        </AuthProvider>
      </HashRouter>
    </QueryClientProvider>
  )
}
