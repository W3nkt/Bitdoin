import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Mail, Phone, Moon, Sun } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmailAuthForm } from '@/components/auth/EmailAuthForm'
import { publicAsset } from '@/lib/assets'
import { resolvePostLoginDestination, sanitizeAuthReturnPath } from '@/lib/authRedirect'
import { useTheme } from '@/lib/theme'

type Method = 'email' | 'phone'
type PhoneStep = 'phone' | 'otp'

// Toggle back to true when phone OTP is ready to re-enable.
const PHONE_OTP_ENABLED = false

export function Auth() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, loading: authLoading, signInWithOtp, verifyOtp } = useAuth()
  const { error: showError, success } = useToast()
  const theme = useTheme(state => state.theme)
  const toggleTheme = useTheme(state => state.toggleTheme)

  const from = sanitizeAuthReturnPath((location.state as { from?: string })?.from)

  const [method, setMethod] = useState<Method>('email')
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('phone')
  const [loading, setLoading] = useState(false)

  // Phone form state
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')

  useEffect(() => {
    if (!authLoading && profile) {
      navigate(resolvePostLoginDestination(from, profile.role), { replace: true })
    }
  }, [authLoading, profile, from, navigate])

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await signInWithOtp(phone)
    setLoading(false)
    if (error) { showError(error); return }
    setPhoneStep('otp')
    success(t('auth.otpSent'))
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error, role } = await verifyOtp(phone, otp)
    setLoading(false)
    if (error) { showError(error); return }
    navigate(resolvePostLoginDestination(from, role), { replace: true })
  }

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate('/')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-5 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-semibold text-gray-500 dark:text-gray-400 transition-colors hover:bg-white dark:hover:bg-gray-900 hover:text-primary-700 dark:hover:text-primary-300"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('common.back')}
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-white dark:text-amber-300 dark:hover:bg-gray-900"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>

        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src={publicAsset('icons/Bitdoin-Logo.png')}
            alt={t('appName')}
            className="mx-auto mb-3 h-24 w-48 object-contain dark:brightness-0 dark:invert"
          />
          <h1 className="text-2xl font-bold text-primary-700 dark:text-primary-300">{t('appName')}</h1>
          <p className="text-sm text-gray-400 mt-1">{t('auth.signIn')} / {t('auth.signUp')}</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-5">

          {/* Method tabs */}
          {PHONE_OTP_ENABLED && (
            <div className="flex gap-1 rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
              <button
                onClick={() => setMethod('email')}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
                  method === 'email' ? 'bg-white dark:bg-gray-900 shadow-sm text-primary-700 dark:text-primary-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <Mail className="h-3.5 w-3.5" />
                {t('auth.emailMethod')}
              </button>
              <button
                onClick={() => setMethod('phone')}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
                  method === 'phone' ? 'bg-white dark:bg-gray-900 shadow-sm text-primary-700 dark:text-primary-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <Phone className="h-3.5 w-3.5" />
                {t('auth.phoneOtpMethod')}
              </button>
            </div>
          )}

          {/* ── Email mode ── */}
          {method === 'email' && (
            <EmailAuthForm
              returnPath={from}
              onSignedIn={role => navigate(resolvePostLoginDestination(from, role), { replace: true })}
            />
          )}

          {/* ── Phone OTP mode ── */}
          {PHONE_OTP_ENABLED && method === 'phone' && (
            phoneStep === 'phone' ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('auth.signInWithPhone')}</h2>
                <Input
                  label={t('auth.phone')}
                  type="tel"
                  placeholder="+856 20 xxxxxxxx"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                />
                <Button type="submit" fullWidth loading={loading} size="lg">
                  {t('auth.sendOtp')}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('auth.otp')}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('auth.codeSentTo', { phone })}</p>
                <Input
                  label={t('auth.otp')}
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  required
                />
                <Button type="submit" fullWidth loading={loading} size="lg">
                  {t('auth.verifyOtp')}
                </Button>
                <button
                  type="button"
                  onClick={() => { setPhoneStep('phone'); setOtp('') }}
                  className="w-full text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {t('common.back')}
                </button>
              </form>
            )
          )}
        </div>
      </div>
    </div>
  )
}
