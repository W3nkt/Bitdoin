import { Suspense, lazy, useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { CartProvider } from '@/context/CartContext'
import { LanguageProvider } from '@/context/LanguageContext'
import { ToastProvider } from '@/components/ui/Toast'
import { CustomerLayout } from '@/components/layout/CustomerLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { resolvePostLoginDestination, takeOAuthReturnPath } from '@/lib/authRedirect'
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
const Subscription = lazy(() => import('@/pages/premium/Subscription').then(m => ({ default: m.Subscription })))
const PremiumCoach = lazy(() => import('@/pages/premium/Coach').then(m => ({ default: m.PremiumCoach })))
const LearningHub = lazy(() => import('@/pages/premium/LearningHub').then(m => ({ default: m.LearningHub })))
const LearningCategoryPage = lazy(() => import('@/pages/premium/LearningHub').then(m => ({ default: m.LearningCategoryPage })))
const LessonReaderPage = lazy(() => import('@/pages/premium/LearningHub').then(m => ({ default: m.LessonReaderPage })))
const WeeklyChallengesPage = lazy(() => import('@/pages/premium/LearningHub').then(m => ({ default: m.WeeklyChallengesPage })))
const HabitTrackerPage = lazy(() => import('@/pages/premium/LearningHub').then(m => ({ default: m.HabitTrackerPage })))
const LearningProgressPage = lazy(() => import('@/pages/premium/LearningHub').then(m => ({ default: m.LearningProgressPage })))
const PremiumAdminDashboard = lazy(() => import('@/pages/premium/AdminDashboard').then(m => ({ default: m.PremiumAdminDashboard })))
const PremiumLearningAdmin = lazy(() => import('@/pages/premium/LearningAdmin').then(m => ({ default: m.PremiumLearningAdmin })))
const Contacts        = lazy(() => import('@/pages/customer/Contacts').then(m => ({ default: m.default || m })))
const Knowledge       = lazy(() => import('@/pages/customer/Knowledge').then(m => ({ default: m.Knowledge })))
const KnowledgeDetail = lazy(() => import('@/pages/customer/KnowledgeDetail').then(m => ({ default: m.KnowledgeDetail })))
const Auth       = lazy(() => import('@/pages/Auth').then(m => ({ default: m.Auth })))
const Landing    = lazy(() => import('@/pages/Landing').then(m => ({ default: m.Landing })))
const BookstorePriceEntry = lazy(() => import('@/pages/public/BookstorePriceEntry').then(m => ({ default: m.BookstorePriceEntry })))
const PlatformSelector = lazy(() => import('@/pages/PlatformSelector').then(m => ({ default: m.PlatformSelector })))
const AcademyLanding = lazy(() => import('@/pages/academy/AcademyLanding').then(m => ({ default: m.AcademyLanding })))
const AcademyProfile = lazy(() => import('@/pages/academy/AcademyProfile').then(m => ({ default: m.AcademyProfile })))

// Admin pages
const AdminDashboard  = lazy(() => import('@/pages/admin/Dashboard').then(m => ({ default: m.AdminDashboard })))
const AdminBooks      = lazy(() => import('@/pages/admin/Books').then(m => ({ default: m.AdminBooks })))
const AdminBookIntake = lazy(() => import('@/pages/admin/BookIntake').then(m => ({ default: m.AdminBookIntake })))
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
  if (profile.role === 'CUSTOMER') return <Navigate to="/bookstore" replace />
  return <>{children}</>
}

function LegacyRedirect({ to, appendParam }: { to: string; appendParam?: string }) {
  const location = useLocation()
  const params = useParams()
  const value = appendParam ? params[appendParam] : undefined
  return <Navigate to={`${to}${value ? `/${value}` : ''}${location.search}`} replace />
}

function PlatformTitle() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.title = pathname.startsWith('/academy')
      ? 'Bitdoin Academy'
      : pathname.startsWith('/bookstore')
        ? 'Bitdoin Bookstore'
        : 'Bitdoin'
  }, [pathname])
  return null
}

function OAuthReturnHandler() {
  const { profile, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading || !profile) return
    const returnPath = takeOAuthReturnPath()
    if (returnPath) {
      navigate(resolvePostLoginDestination(returnPath, profile.role), { replace: true })
    }
  }, [loading, navigate, profile])

  return null
}

export function App() {
  return (
    <QueryClientProvider client={qc}>
      <HashRouter>
        <AuthProvider>
          <LanguageProvider>
            <CartProvider>
              <ToastProvider>
                <PlatformTitle />
                <OAuthReturnHandler />
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Customer Routes */}
                    <Route element={<CustomerLayout><Suspense fallback={<PageLoader />}><div /></Suspense></CustomerLayout>} path="__unused__" />

                    <Route path="/" element={<PlatformSelector />} />
                    <Route path="/welcome" element={<Landing />} />

                    {/* Bitdoin Bookstore */}
                    <Route path="/bookstore" element={<CustomerLayout><Home /></CustomerLayout>} />
                    <Route path="/bookstore/books" element={<CustomerLayout><Catalog /></CustomerLayout>} />
                    <Route path="/bookstore/contacts" element={<CustomerLayout><Contacts /></CustomerLayout>} />
                    <Route path="/bookstore/knowledge" element={<CustomerLayout><Knowledge /></CustomerLayout>} />
                    <Route path="/bookstore/knowledge/:id" element={<CustomerLayout><KnowledgeDetail /></CustomerLayout>} />
                    <Route path="/bookstore/books/:id" element={<CustomerLayout><BookDetail /></CustomerLayout>} />
                    <Route path="/bookstore/cart" element={<CustomerLayout><Cart /></CustomerLayout>} />
                    <Route path="/bookstore/checkout" element={<CustomerLayout><Checkout /></CustomerLayout>} />
                    <Route path="/bookstore/orders" element={<CustomerLayout><Orders /></CustomerLayout>} />
                    <Route path="/bookstore/orders/:id" element={<CustomerLayout><OrderDetail /></CustomerLayout>} />
                    <Route path="/bookstore/track" element={<CustomerLayout><TrackOrder /></CustomerLayout>} />
                    <Route path="/bookstore/profile" element={<CustomerLayout><Profile /></CustomerLayout>} />

                    {/* Bitdoin Academy */}
                    <Route path="/academy" element={<AcademyLanding />} />
                    <Route path="/academy/home" element={<Subscription />} />
                    <Route path="/academy/subscription" element={<Subscription />} />
                    <Route path="/academy/coach" element={<PremiumCoach />} />
                    <Route path="/academy/learn" element={<LearningHub />} />
                    <Route path="/academy/learn/:categorySlug" element={<LearningCategoryPage />} />
                    <Route path="/academy/lesson/:lessonSlug" element={<LessonReaderPage />} />
                    <Route path="/academy/challenges" element={<WeeklyChallengesPage />} />
                    <Route path="/academy/habits" element={<HabitTrackerPage />} />
                    <Route path="/academy/progress" element={<LearningProgressPage />} />
                    <Route path="/academy/profile" element={<AcademyProfile />} />

                    {/* Legacy route compatibility */}
                    <Route path="/books" element={<LegacyRedirect to="/bookstore/books" />} />
                    <Route path="/books/:id" element={<LegacyRedirect to="/bookstore/books" appendParam="id" />} />
                    <Route path="/contacts" element={<LegacyRedirect to="/bookstore/contacts" />} />
                    <Route path="/knowledge" element={<LegacyRedirect to="/bookstore/knowledge" />} />
                    <Route path="/knowledge/:id" element={<LegacyRedirect to="/bookstore/knowledge" appendParam="id" />} />
                    <Route path="/cart" element={<LegacyRedirect to="/bookstore/cart" />} />
                    <Route path="/checkout" element={<LegacyRedirect to="/bookstore/checkout" />} />
                    <Route path="/orders" element={<LegacyRedirect to="/bookstore/orders" />} />
                    <Route path="/orders/:id" element={<LegacyRedirect to="/bookstore/orders" appendParam="id" />} />
                    <Route path="/track" element={<LegacyRedirect to="/bookstore/track" />} />
                    <Route path="/profile" element={<LegacyRedirect to="/bookstore/profile" />} />
                    <Route path="/subscription" element={<LegacyRedirect to="/academy/subscription" />} />
                    <Route path="/premium/coach" element={<LegacyRedirect to="/academy/coach" />} />
                    <Route path="/premium/learn" element={<LegacyRedirect to="/academy/learn" />} />
                    <Route path="/premium/learn/:categorySlug" element={<LegacyRedirect to="/academy/learn" appendParam="categorySlug" />} />
                    <Route path="/premium/lesson/:lessonSlug" element={<LegacyRedirect to="/academy/lesson" appendParam="lessonSlug" />} />
                    <Route path="/premium/challenges" element={<LegacyRedirect to="/academy/challenges" />} />
                    <Route path="/premium/habits" element={<LegacyRedirect to="/academy/habits" />} />
                    <Route path="/premium/progress" element={<LegacyRedirect to="/academy/progress" />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/bookstore-pricing/:token" element={<BookstorePriceEntry />} />

                    {/* Admin Routes */}
                    <Route path="/admin" element={
                      <AdminGuard><AdminLayout><AdminDashboard /></AdminLayout></AdminGuard>
                    } />
                    <Route path="/admin/books" element={
                      <AdminGuard><AdminLayout><AdminBooks /></AdminLayout></AdminGuard>
                    } />
                    <Route path="/admin/book-intake" element={
                      <AdminGuard><AdminLayout><AdminBookIntake /></AdminLayout></AdminGuard>
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
                    <Route path="/academy-admin" element={
                      <AdminGuard><PremiumAdminDashboard /></AdminGuard>
                    } />
                    <Route path="/academy-admin/learning" element={
                      <AdminGuard><PremiumLearningAdmin /></AdminGuard>
                    } />
                    <Route path="/premium-admin" element={<LegacyRedirect to="/academy-admin" />} />
                    <Route path="/premium-admin/learning" element={<LegacyRedirect to="/academy-admin/learning" />} />

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
