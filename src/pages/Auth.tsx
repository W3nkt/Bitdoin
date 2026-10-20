import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Mail, Moon, Phone, Sun } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFacebook, faTiktok, faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmailAuthForm, type EmailStep } from '@/components/auth/EmailAuthForm'
import { publicAsset } from '@/lib/assets'
import { resolvePostLoginDestination, sanitizeAuthReturnPath } from '@/lib/authRedirect'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { AuthIllustration } from '@/components/auth/AuthIllustration'

type Method = 'email' | 'phone'
type PhoneStep = 'phone' | 'otp'

// Toggle back to true when phone OTP is ready to re-enable.
const PHONE_OTP_ENABLED = false

const SOCIAL_LINKS: { href: string; label: string; labelKey?: 'auth.whatsappChannel'; icon: IconDefinition; color: string }[] = [
  { href: 'https://www.facebook.com/bitdoin25', label: 'Facebook', icon: faFacebook, color: '#1877F2' },
  { href: 'https://tiktok.com/@bitdoin0', label: 'TikTok', icon: faTiktok, color: '#000000' },
  { href: 'https://whatsapp.com/channel/0029VbDS68a90x2sMgXUwt0S', label: 'WhatsApp Channel', labelKey: 'auth.whatsappChannel', icon: faWhatsapp, color: '#25D366' },
]

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
  // The Academy landing's "Create free account" buttons open the Sign up tab.
  const [emailStep, setEmailStep] = useState<EmailStep>(() => (location.state as { mode?: string } | null)?.mode === 'signup' ? 'signup' : 'signin')
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

  const tabs: { step: EmailStep; label: string }[] = [
    { step: 'signin', label: t('auth.signIn') },
    { step: 'signup', label: t('auth.signUp') },
  ]
  const copyright = t('auth.copyright', { year: new Date().getFullYear() })

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-8 dark:bg-gray-950">
      <div className="w-full max-w-4xl">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-semibold text-gray-500 dark:text-gray-400 transition-colors hover:bg-white dark:hover:bg-gray-900 hover:text-orange-600 dark:hover:text-orange-300"
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

        <div className="relative flex flex-col rounded-3xl bg-white shadow-[0_40px_90px_-35px_rgba(15,23,42,0.3)] dark:bg-gray-900 dark:shadow-[0_40px_90px_-40px_rgba(0,0,0,0.9)] md:h-[600px] md:flex-row">
          {/* Left: brand panel with links and the vertical Sign in / Sign up tabs */}
          <aside className="relative hidden w-[46%] shrink-0 flex-col justify-between text-white md:flex">
            <div aria-hidden className="absolute inset-0 overflow-hidden rounded-l-3xl bg-gradient-to-br from-[#fbb040] via-[#f7931a] to-[#e2650f] dark:from-[#3a220f] dark:via-[#1f140b] dark:to-[#0f0a06]">
              <div className="absolute -left-28 top-24 h-80 w-72 rounded-[45%] bg-gradient-to-b from-[#ffc76b]/60 to-transparent dark:from-[#f7931a]/20" />
              <div className="absolute -right-24 -top-16 h-72 w-72 rounded-[45%] bg-gradient-to-bl from-[#ffd28a]/50 to-transparent dark:from-[#fbb040]/15" />
              <div className="absolute -bottom-32 -left-10 h-80 w-80 rounded-full bg-gradient-to-t from-[#d9540a]/50 to-transparent dark:from-[#f7931a]/25" />
              {/* Dark mode: a night sky with a crescent moon and stars over the orange glow. */}
              <div className="absolute inset-0 hidden dark:block">
                <div className="absolute right-12 top-10 h-10 w-10 rounded-full shadow-[inset_-9px_-5px_0_0_#fbbf6b]" />
                {[[18, 30], [42, 14], [64, 26], [80, 46], [30, 52], [56, 40], [88, 18]].map(([left, top]) => (
                  <span key={`${left}-${top}`} className="absolute h-1 w-1 rounded-full bg-amber-100/70" style={{ left: `${left}%`, top: `${top}%` }} />
                ))}
              </div>
              <AuthIllustration className="absolute bottom-10 left-4 w-[62%] max-w-[300px] text-white opacity-95 [--auth-accent:#f7931a] dark:text-[#f7b25a] dark:opacity-90 dark:[--auth-accent:#2a190c]" />
            </div>

            <div className="relative pt-7">
              <p className="px-6 text-lg font-semibold">{t('auth.followUs')}</p>
              <nav className="mt-4 space-y-1">
                {SOCIAL_LINKS.map(link => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-6 py-2 text-sm font-medium text-white/95 transition-colors hover:bg-white/15 hover:text-white dark:hover:bg-white/10"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm">
                      <FontAwesomeIcon icon={link.icon} className="h-4 w-4" style={{ color: link.color }} />
                    </span>
                    {link.labelKey ? t(link.labelKey) : link.label}
                  </a>
                ))}
              </nav>
            </div>

            {method === 'email' && (
              <div role="tablist" aria-orientation="vertical" className="relative ml-auto w-44 space-y-2">
                {/* The white tab slides between Sign in and Create account; its concave corners join it to the form panel. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute right-0 top-0 h-[52px] w-full rounded-l-2xl bg-white transition-transform duration-300 ease-out motion-reduce:transition-none dark:bg-gray-900"
                  style={{ transform: `translateY(${emailStep === 'signup' ? 60 : 0}px)` }}
                >
                  <span className="absolute bottom-full right-0 h-5 w-5 rounded-br-[20px] shadow-[6px_6px_0_6px_#fff] dark:shadow-[6px_6px_0_6px_#111827]" />
                  <span className="absolute right-0 top-full h-5 w-5 rounded-tr-[20px] shadow-[6px_-6px_0_6px_#fff] dark:shadow-[6px_-6px_0_6px_#111827]" />
                </span>
                {tabs.map(tab => {
                  const active = emailStep === tab.step
                  return (
                    <button
                      key={tab.step}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setEmailStep(tab.step)}
                      className={cn(
                        'relative block h-[52px] w-full pl-6 text-left text-sm font-semibold transition-colors duration-300',
                        active ? 'text-orange-600 dark:text-orange-300' : 'text-white/90 hover:text-white',
                      )}
                    >
                      {tab.label}
                    </button>
                  )
                })}
              </div>
            )}

            <p className="relative px-6 pb-6 text-[11px] text-white/80">{copyright}</p>
          </aside>

          {/* Phones: the brand panel shrinks to a header strip */}
          <div aria-hidden className="relative h-24 overflow-hidden rounded-t-3xl bg-gradient-to-br from-[#fbb040] via-[#f7931a] to-[#e2650f] dark:from-[#3a220f] dark:via-[#1f140b] dark:to-[#0f0a06] md:hidden">
            <div className="absolute -left-16 top-4 h-40 w-40 rounded-full bg-[#ffc76b]/50 dark:bg-[#f7931a]/20" />
            <AuthIllustration className="absolute -bottom-1 right-3 h-24 text-white [--auth-accent:#f7931a] dark:text-[#f7b25a] dark:[--auth-accent:#2a190c]" />
          </div>

          {/* Right: logo and form */}
          <main className="flex flex-1 flex-col items-center px-6 py-8 md:px-12 md:pt-14">
            <h1 className="mb-6 md:mb-8">
              <img
                src={publicAsset('icons/Bitdoin-Logo.png')}
                alt={t('appName')}
                className="mx-auto h-24 w-56 object-contain dark:brightness-0 dark:invert"
              />
            </h1>

            <div className="w-full max-w-[18rem] space-y-6">
              {PHONE_OTP_ENABLED && (
                <div className="flex gap-1 rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
                  <button
                    onClick={() => setMethod('email')}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
                      method === 'email' ? 'bg-white dark:bg-gray-900 shadow-sm text-orange-600 dark:text-orange-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {t('auth.emailMethod')}
                  </button>
                  <button
                    onClick={() => setMethod('phone')}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
                      method === 'phone' ? 'bg-white dark:bg-gray-900 shadow-sm text-orange-600 dark:text-orange-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {t('auth.phoneOtpMethod')}
                  </button>
                </div>
              )}

              {/* Sign in / Sign up tabs on phones; the left panel holds them on wider screens */}
              {method === 'email' && (
                <div role="tablist" className="relative flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800 md:hidden">
                  <span
                    aria-hidden
                    className={cn(
                      'absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-lg bg-white shadow-sm transition-transform duration-300 ease-out motion-reduce:transition-none dark:bg-gray-900',
                      emailStep === 'signup' && 'translate-x-full',
                    )}
                  />
                  {tabs.map(tab => (
                    <button
                      key={tab.step}
                      type="button"
                      role="tab"
                      aria-selected={emailStep === tab.step}
                      onClick={() => setEmailStep(tab.step)}
                      className={cn(
                        'relative flex-1 rounded-lg py-2 text-sm font-semibold transition-colors duration-300',
                        emailStep === tab.step ? 'text-orange-600 dark:text-orange-300' : 'text-gray-500 dark:text-gray-400',
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}

              {method === 'email' && (
                <EmailAuthForm
                  variant="split"
                  step={emailStep}
                  onStepChange={setEmailStep}
                  returnPath={from}
                  onSignedIn={role => navigate(resolvePostLoginDestination(from, role), { replace: true })}
                />
              )}

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

            <p className="mt-auto pt-10 text-[11px] text-gray-400 md:hidden">{copyright}</p>
          </main>
        </div>
      </div>
    </div>
  )
}
