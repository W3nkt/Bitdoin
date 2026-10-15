import type { CSSProperties } from 'react'
import { PartyPopper } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const confettiColors = ['#10b981', '#fbbf24', '#38bdf8', '#fb7185', '#a78bfa']

export function ReturningCustomerWelcome({ name }: { name: string }) {
  const { t } = useTranslation()

  return (
    <div className="checkout-welcome relative isolate overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-4 dark:border-emerald-900 dark:from-emerald-950/60 dark:via-gray-900 dark:to-amber-950/20">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 20 }, (_, index) => (
          <span
            key={index}
            className="checkout-welcome-confetti absolute -top-3 h-2 w-1.5 rounded-sm"
            style={{
              left: `${(index * 37 + 5) % 100}%`,
              backgroundColor: confettiColors[index % confettiColors.length],
              animationDelay: `${(index % 5) * 65}ms`,
              '--confetti-drift': `${(index % 7 - 3) * 12}px`,
              '--confetti-spin': `${index % 2 ? 360 : -360}deg`,
            } as CSSProperties}
          />
        ))}
      </div>
      <div className="relative flex items-start gap-3">
        <span aria-hidden="true" className="checkout-welcome-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
          <PartyPopper className="h-6 w-6" />
        </span>
        <div className="min-w-0 space-y-1">
          <p className="break-words text-base font-bold text-emerald-900 dark:text-emerald-200">
            {name ? t('checkout.welcomeBackName', { name }) : t('checkout.welcomeBack')}
          </p>
          <p className="text-sm text-emerald-800 dark:text-emerald-300">{t('checkout.welcomeThanks')}</p>
          <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">{t('checkout.customerLookup.found')}</p>
        </div>
      </div>
    </div>
  )
}
