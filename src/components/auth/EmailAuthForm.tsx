import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, Loader2, Lock, Mail, User } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faApple } from '@fortawesome/free-brands-svg-icons'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { publicAsset } from '@/lib/assets'
import type { UserRole } from '@/types'

export type EmailStep = 'signin' | 'signup'

interface EmailAuthFormProps {
  /** Where Google/Facebook sign-in returns to; they leave the page, so onSignedIn won't run for them. */
  returnPath: string
  onSignedIn: (role: UserRole | null) => void
  /** Set with onStepChange when the parent draws its own Sign in / Sign up tabs. */
  step?: EmailStep
  onStepChange?: (step: EmailStep) => void
  /** 'card' (login modal): boxed inputs and tabs. 'split' (Auth page): underlined inputs, no tabs. */
  variant?: 'card' | 'split'
}

const GOOGLE_ICON = 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg'

/** An underlined input with a leading icon, as on the Auth page. */
function LineField({ icon, label, trailing, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { icon: ReactNode; label: string; trailing?: ReactNode }) {
  return (
    <label className="flex items-center gap-3 border-b border-gray-200 py-2.5 text-gray-400 transition-colors focus-within:border-orange-500 focus-within:text-orange-500 dark:border-gray-700 dark:focus-within:border-orange-400 dark:focus-within:text-orange-400">
      {icon}
      <input
        {...props}
        aria-label={label}
        placeholder={props.placeholder ?? label}
        className="min-w-0 flex-1 bg-transparent text-base text-gray-800 outline-none placeholder:text-gray-400 sm:text-sm dark:text-gray-100 dark:placeholder:text-gray-500"
      />
      {trailing}
    </label>
  )
}

/** Email sign in / sign up plus Google, Facebook and Apple. Used by the Auth page and the login modal. */
export function EmailAuthForm({ returnPath, onSignedIn, step, onStepChange, variant = 'card' }: EmailAuthFormProps) {
  const { t } = useTranslation()
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithFacebook, signInWithApple } = useAuth()
  const { error: showError, success } = useToast()

  const [ownStep, setOwnStep] = useState<EmailStep>('signin')
  const emailStep = step ?? ownStep
  const setEmailStep = (next: EmailStep) => {
    setOwnStep(next)
    onStepChange?.(next)
  }
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error, role } = await signInWithEmail(email, password)
    setLoading(false)
    if (error) { showError(error); return }
    onSignedIn(role)
  }

  async function handleEmailSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await signUpWithEmail(email, password, name)
    setLoading(false)
    if (error) { showError(error); return }
    // Long message (verify your email first), so it stays longer than the default 4 seconds.
    success(t('auth.accountCreated'), 10000)
    setEmailStep('signin')
  }

  const isSignIn = emailStep === 'signin'
  const toggleShowPw = (
    <button
      type="button"
      onClick={() => setShowPw(v => !v)}
      aria-label={showPw ? 'Hide password' : 'Show password'}
      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
    >
      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  )

  if (variant === 'split') {
    return (
      <div className="space-y-7">
        <form onSubmit={isSignIn ? handleEmailSignIn : handleEmailSignUp} className="space-y-5">
          {/* The name field slides open for Create account; disabled (so not required) while signing in. */}
          <div
            aria-hidden={isSignIn}
            className={`!mt-0 grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
              isSignIn ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
            }`}
          >
            <div className="overflow-hidden">
              <div>
                <LineField
                  icon={<User className="h-4 w-4 shrink-0" />}
                  label={t('auth.name')}
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  disabled={isSignIn}
                  autoComplete="name"
                />
              </div>
            </div>
          </div>
          <LineField
            icon={<Mail className="h-4 w-4 shrink-0" />}
            label={t('auth.email')}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <LineField
            icon={<Lock className="h-4 w-4 shrink-0" />}
            label={t('auth.password')}
            placeholder={isSignIn ? t('auth.password') : `${t('auth.password')} · ${t('auth.passwordPlaceholder')}`}
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete={isSignIn ? 'current-password' : 'new-password'}
            trailing={toggleShowPw}
          />
          <button
            type="submit"
            disabled={loading}
            className="!mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f7931a] to-[#e0600d] py-3 text-sm font-bold text-white shadow-[0_14px_30px_-10px_rgba(240,120,20,0.7)] transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 disabled:opacity-70 dark:focus-visible:ring-offset-gray-900"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            <span key={emailStep} className="animate-fade-in">{isSignIn ? t('auth.signIn') : t('auth.signUp')}</span>
          </button>
        </form>

        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          {t('auth.or')}
          <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Google', aria: t('auth.continueWithGoogle'), onClick: () => signInWithGoogle(returnPath), icon: <img src={GOOGLE_ICON} alt="" className="h-4 w-4" /> },
            { label: 'Facebook', aria: t('auth.continueWithFacebook'), onClick: () => signInWithFacebook(returnPath), icon: <img src={publicAsset('icons/Facebook-Logosu.png')} alt="" className="h-9 w-9 max-w-none object-contain" /> },
            { label: 'Apple', aria: t('auth.continueWithApple'), onClick: () => signInWithApple(returnPath), icon: <FontAwesomeIcon icon={faApple} className="h-4 w-4 text-black dark:text-white" /> },
          ].map(provider => (
            <button
              key={provider.label}
              type="button"
              onClick={provider.onClick}
              aria-label={provider.aria}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-gray-600 transition-colors hover:bg-orange-50 hover:text-orange-600 dark:text-gray-300 dark:hover:bg-orange-500/10 dark:hover:text-orange-300"
            >
              <span className="flex h-6 w-6 items-center justify-center">{provider.icon}</span>
              {provider.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Sign in / Sign up sub-tabs */}
      <div className="flex border-b border-gray-100 dark:border-gray-800">
        <button
          type="button"
          onClick={() => setEmailStep('signin')}
          className={`pb-2 px-1 mr-5 text-sm font-semibold transition-colors border-b-2 ${
            emailStep === 'signin'
              ? 'border-primary-700 dark:border-primary-400 text-primary-700 dark:text-primary-300'
              : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
          }`}
        >
          {t('auth.signIn')}
        </button>
        <button
          type="button"
          onClick={() => setEmailStep('signup')}
          className={`pb-2 px-1 text-sm font-semibold transition-colors border-b-2 ${
            emailStep === 'signup'
              ? 'border-primary-700 dark:border-primary-400 text-primary-700 dark:text-primary-300'
              : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
          }`}
        >
          {t('auth.signUp')}
        </button>
      </div>

      {isSignIn ? (
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
            <div className="absolute right-3 top-8">{toggleShowPw}</div>
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
            <div className="absolute right-3 top-8">{toggleShowPw}</div>
          </div>
          <Button type="submit" fullWidth loading={loading} size="lg">
            {t('auth.signUp')}
          </Button>
        </form>
      )}

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200 dark:border-gray-700" />
        </div>
        <div className="relative flex justify-center text-xs text-gray-400">
          <span className="bg-white dark:bg-gray-900 px-3">{t('auth.or')}</span>
        </div>
      </div>

      <div className="flex justify-center gap-4">
        <button
          type="button"
          onClick={() => signInWithGoogle(returnPath)}
          aria-label={t('auth.continueWithGoogle')}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
        >
          <img src={GOOGLE_ICON} alt="Google" className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => signInWithFacebook(returnPath)}
          aria-label={t('auth.continueWithFacebook')}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
        >
          <img
            src={publicAsset('icons/Facebook-Logosu.png')}
            alt="Facebook"
            className="h-12 w-12 object-contain"
          />
        </button>

        <button
          type="button"
          onClick={() => signInWithApple(returnPath)}
          aria-label={t('auth.continueWithApple')}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-black dark:text-white transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
        >
          <FontAwesomeIcon icon={faApple} className="h-5 w-5" />
        </button>
      </div>
    </>
  )
}
