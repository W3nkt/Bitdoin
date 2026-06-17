import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BookOpen } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

type Step = 'phone' | 'otp'

export function Auth() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { signInWithOtp, verifyOtp, signInWithGoogle } = useAuth()
  const { error: showError, success } = useToast()

  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await signInWithOtp(phone)
    setLoading(false)
    if (error) { showError(error); return }
    setStep('otp')
    success('OTP sent!')
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await verifyOtp(phone, otp)
    setLoading(false)
    if (error) { showError(error); return }
    navigate('/')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-700 mb-3">
            <BookOpen className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-primary-700">Pwen Books</h1>
          <p className="text-sm text-gray-400 mt-1">{t('appName')}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          {step === 'phone' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <h2 className="text-base font-semibold text-gray-800">{t('auth.signIn')}</h2>
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

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs text-gray-400">
                  <span className="bg-white px-3">{t('auth.or')}</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                fullWidth
                onClick={signInWithGoogle}
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="h-4 w-4" />
                {t('auth.continueWithGoogle')}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <h2 className="text-base font-semibold text-gray-800">{t('auth.otp')}</h2>
              <p className="text-xs text-gray-500">Code sent to {phone}</p>
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
                onClick={() => { setStep('phone'); setOtp('') }}
                className="w-full text-xs text-gray-400 hover:text-gray-600"
              >
                {t('common.back')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
