import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Mail, Phone, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { publicAsset } from '@/lib/assets'

type Method = 'email' | 'phone'
type EmailStep = 'signin' | 'signup'
type PhoneStep = 'phone' | 'otp'

export function Auth() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { signInWithEmail, signUpWithEmail, signInWithOtp, verifyOtp, signInWithGoogle } = useAuth()
  const { error: showError, success } = useToast()

  const from = (location.state as { from?: string })?.from ?? '/'

  const [method, setMethod] = useState<Method>('email')
  const [emailStep, setEmailStep] = useState<EmailStep>('signin')
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('phone')
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)

  // Email form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')

  // Phone form state
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await signInWithEmail(email, password)
    setLoading(false)
    if (error) { showError(error); return }
    navigate(from, { replace: true })
  }

  async function handleEmailSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await signUpWithEmail(email, password, name)
    setLoading(false)
    if (error) { showError(error); return }
    success(t('auth.accountCreated'))
    setEmailStep('signin')
  }

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
    const { error } = await verifyOtp(phone, otp)
    setLoading(false)
    if (error) { showError(error); return }
    navigate(from, { replace: true })
  }

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate('/')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <button
          type="button"
          onClick={handleBack}
          className="mb-5 inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-semibold text-gray-500 transition-colors hover:bg-white hover:text-primary-700"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </button>

        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src={publicAsset('icons/Bitdoin-Logo.png')}
            alt={t('appName')}
            className="mx-auto mb-3 h-24 w-48 object-contain"
          />
          <h1 className="text-2xl font-bold text-primary-700">{t('appName')}</h1>
          <p className="text-sm text-gray-400 mt-1">{t('auth.signIn')} / {t('auth.signUp')}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">

          {/* Method tabs */}
          <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
            <button
              onClick={() => setMethod('email')}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
                method === 'email' ? 'bg-white shadow-sm text-primary-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Mail className="h-3.5 w-3.5" />
              {t('auth.emailMethod')}
            </button>
            <button
              onClick={() => setMethod('phone')}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
                method === 'phone' ? 'bg-white shadow-sm text-primary-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Phone className="h-3.5 w-3.5" />
              {t('auth.phoneOtpMethod')}
            </button>
          </div>

          {/* ── Email mode ── */}
          {method === 'email' && (
            <>
              {/* Sign in / Sign up sub-tabs */}
              <div className="flex border-b border-gray-100">
                <button
                  onClick={() => setEmailStep('signin')}
                  className={`pb-2 px-1 mr-5 text-sm font-semibold transition-colors border-b-2 ${
                    emailStep === 'signin'
                      ? 'border-primary-700 text-primary-700'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {t('auth.signIn')}
                </button>
                <button
                  onClick={() => setEmailStep('signup')}
                  className={`pb-2 px-1 text-sm font-semibold transition-colors border-b-2 ${
                    emailStep === 'signup'
                      ? 'border-primary-700 text-primary-700'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {t('auth.signUp')}
                </button>
              </div>

              {emailStep === 'signin' ? (
                <form onSubmit={handleEmailSignIn} className="space-y-4">
                  <Input
                    label={t('auth.email')}
                    type="email"
                    placeholder={t('auth.emailPlaceholder')}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                  <div className="relative">
                    <Input
                      label={t('auth.password')}
                      type={showPw ? 'text' : 'password'}
                      placeholder={t('auth.passwordDots')}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button type="submit" fullWidth loading={loading} size="lg">
                    {t('auth.signIn')}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleEmailSignUp} className="space-y-4">
                  <Input
                    label={t('auth.name')}
                    type="text"
                    placeholder={t('auth.namePlaceholder')}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                  <Input
                    label={t('auth.email')}
                    type="email"
                    placeholder={t('auth.emailPlaceholder')}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                  <div className="relative">
                    <Input
                      label={t('auth.password')}
                      type={showPw ? 'text' : 'password'}
                      placeholder={t('auth.passwordPlaceholder')}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button type="submit" fullWidth loading={loading} size="lg">
                    {t('auth.signUp')}
                  </Button>
                </form>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs text-gray-400">
                  <span className="bg-white px-3">{t('auth.or')}</span>
                </div>
              </div>

              <Button type="button" variant="outline" fullWidth onClick={signInWithGoogle}>
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Google"
                  className="h-4 w-4"
                />
                {t('auth.continueWithGoogle')}
              </Button>
            </>
          )}

          {/* ── Phone OTP mode ── */}
          {method === 'phone' && (
            phoneStep === 'phone' ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <h2 className="text-sm font-semibold text-gray-700">{t('auth.signInWithPhone')}</h2>
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
                <h2 className="text-sm font-semibold text-gray-700">{t('auth.otp')}</h2>
                <p className="text-xs text-gray-500">{t('auth.codeSentTo', { phone })}</p>
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
                  className="w-full text-xs text-gray-400 hover:text-gray-600"
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
