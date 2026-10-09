import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { publicAsset } from '@/lib/assets'
import type { UserRole } from '@/types'

type EmailStep = 'signin' | 'signup'

interface EmailAuthFormProps {
  /** Where Google/Facebook sign-in returns to; they leave the page, so onSignedIn won't run for them. */
  returnPath: string
  onSignedIn: (role: UserRole | null) => void
}

/** Email sign in / sign up tabs plus Google and Facebook buttons. Used by the Auth page and the login modal. */
export function EmailAuthForm({ returnPath, onSignedIn }: EmailAuthFormProps) {
  const { t } = useTranslation()
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithFacebook } = useAuth()
  const { error: showError, success } = useToast()

  const [emailStep, setEmailStep] = useState<EmailStep>('signin')
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
    success(t('auth.accountCreated'))
    setEmailStep('signin')
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
              className="absolute right-3 top-8 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
              className="absolute right-3 top-8 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
            className="h-5 w-5"
          />
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
      </div>
    </>
  )
}
