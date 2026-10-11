import type { ComponentType } from 'react'
import { ArrowRight, CheckCircle2, Clock, CreditCard, Crown, QrCode, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { premiumText } from '@/i18n/premium'
import { cn } from '@/lib/utils'
import type { Language } from '@/types'

export type CheckoutPaymentMethod = 'BANK_QR' | 'UNIONPAY'

interface CheckoutPlan {
  name: string
  description: string
  interval: string
  features: string[]
}

interface CheckoutModule {
  icon: ComponentType<{ className?: string }>
  title: string
  detail: string
}

/** Step 1 of Start Premium: what the package costs and everything it includes. */
export function PlanDetailsModal({
  open,
  plan,
  priceLabel,
  savingsLabel,
  modules,
  language,
  onClose,
  onConfirm,
}: {
  open: boolean
  plan: CheckoutPlan | null
  priceLabel: string
  savingsLabel?: string
  modules: CheckoutModule[]
  language: Language
  onClose: () => void
  onConfirm: () => void
}) {
  const lo = language === 'lo'
  // Plans and modules are stored in English; the Premium dictionary has their Lao text.
  const t = (value: string) => premiumText(language, value)
  return (
    <Modal
      open={open && !!plan}
      onClose={onClose}
      title={lo ? 'ລາຍລະອຽດແພັກເກດ' : 'Package details'}
      size="lg"
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            onClick={onClose}
            className="border-transparent bg-orange-500 text-white hover:bg-orange-600 focus-visible:ring-orange-400"
          >
            {lo ? 'ຍັງບໍ່ແມ່ນຕອນນີ້' : 'Not now'}
          </Button>
          <Button
            type="button"
            icon={<Crown className="h-4 w-4" />}
            onClick={onConfirm}
            className="border-transparent bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-400"
          >
            {lo ? 'ຢືນຢັນ ແລະ ສະໝັກ' : 'Confirm & subscribe'}
          </Button>
        </div>
      }
    >
      {plan && (
        <div data-no-premium-translate className="space-y-5">
          <div className="overflow-hidden rounded-2xl bg-primary-950 text-white ring-1 ring-primary-800">
            <div className="bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.22),transparent_50%)] px-5 py-5">
              <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-amber-300">
                <Crown className="h-3.5 w-3.5" />
                Bitdoin Academy
              </p>
              <h3 className="mt-2 text-2xl font-black">{t(plan.name)}</h3>
              {plan.description && <p className="mt-1 text-sm leading-6 text-primary-100">{t(plan.description)}</p>}
              <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-3xl font-black">{priceLabel}</span>
                <span className="text-sm font-semibold text-primary-200">/{t(plan.interval)}</span>
                {savingsLabel && (
                  <span className="rounded-full bg-emerald-400/15 px-2.5 py-0.5 text-xs font-bold text-emerald-300 ring-1 ring-emerald-300/30">{savingsLabel}</span>
                )}
              </div>
            </div>
          </div>

          {plan.features.length > 0 && (
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-primary-600 dark:text-primary-400">{lo ? 'ສິ່ງທີ່ທ່ານໄດ້ຮັບ' : "What's included"}</p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {plan.features.map(feature => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                    <span>{t(feature)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="text-xs font-black uppercase tracking-wide text-primary-600 dark:text-primary-400">{lo ? 'ໂມດູນພຣີມຽມທັງໝົດ' : 'Every Premium module'}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {modules.map(module => {
                const Icon = module.icon
                return (
                  <div key={module.title} className="flex gap-3 rounded-2xl border border-gray-100 p-3 dark:border-gray-800">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{t(module.title)}</p>
                      <p className="mt-0.5 text-xs leading-5 text-gray-500 dark:text-gray-400">{t(module.detail)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <p className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
            <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-600 dark:text-primary-400" />
            {lo
              ? 'ພຣີມຽມຈະເປີດໃຊ້ຫຼັງຈາກແອັດມິນກວດສອບການຊຳລະຂອງທ່ານ. ທ່ານສາມາດຍົກເລີກຄຳຂໍໄດ້ກ່ອນຊຳລະ.'
              : 'Premium starts once an admin verifies your payment. You can cancel the request any time before you pay.'}
          </p>
        </div>
      )}
    </Modal>
  )
}

/** Step 3 of Start Premium: how the member will pay. Bank QR is the only live option. */
export function PaymentMethodModal({
  open,
  planName,
  priceLabel,
  method,
  busy,
  language,
  onChangeMethod,
  onClose,
  onConfirm,
}: {
  open: boolean
  planName: string
  priceLabel: string
  method: CheckoutPaymentMethod
  busy: boolean
  language: Language
  onChangeMethod: (method: CheckoutPaymentMethod) => void
  onClose: () => void
  onConfirm: () => void
}) {
  const lo = language === 'lo'
  const options: Array<{ id: CheckoutPaymentMethod; title: string; detail: string; icon: ComponentType<{ className?: string }>; comingSoon?: boolean }> = [
    {
      id: 'BANK_QR',
      title: lo ? 'QR ທະນາຄານ' : 'Bank QR code',
      detail: lo ? 'ສະແກນ QR ຫຼື ໂອນເງິນ, ແລ້ວອັບໂຫຼດຫຼັກຖານ.' : 'Scan the QR or transfer, then upload your proof.',
      icon: QrCode,
    },
    {
      id: 'UNIONPAY',
      title: 'UnionPay',
      detail: lo ? 'ຊຳລະດ້ວຍບັດ UnionPay.' : 'Pay with your UnionPay card.',
      icon: CreditCard,
      comingSoon: true,
    },
  ]

  return (
    <Modal
      open={open}
      onClose={() => { if (!busy) onClose() }}
      title={lo ? 'ເລືອກວິທີຊຳລະ' : 'Choose a payment method'}
      size="md"
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
            {lo ? 'ຍົກເລີກ' : 'Cancel'}
          </Button>
          <Button type="button" loading={busy} disabled={method !== 'BANK_QR'} onClick={onConfirm} icon={<ArrowRight className="h-4 w-4" />}>
            {lo ? 'ສືບຕໍ່ໄປຊຳລະ' : 'Continue to payment'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-primary-950 px-4 py-3 text-white">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-300">{lo ? 'ແຜນ' : 'Plan'}</p>
            <p className="truncate text-sm font-black">{premiumText(language, planName)}</p>
          </div>
          <p className="text-lg font-black">{priceLabel}</p>
        </div>
        <div role="radiogroup" aria-label={lo ? 'ວິທີຊຳລະ' : 'Payment method'} className="space-y-2">
          {options.map(option => {
            const Icon = option.icon
            const selected = method === option.id
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={option.comingSoon}
                onClick={() => onChangeMethod(option.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                  selected
                    ? 'border-primary-600 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/30'
                    : 'border-gray-200 hover:border-primary-300 dark:border-gray-700',
                  option.comingSoon && 'cursor-not-allowed opacity-60 hover:border-gray-200 dark:hover:border-gray-700',
                )}
              >
                <span className={cn(
                  'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl',
                  selected ? 'bg-primary-700 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300',
                )}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 text-sm font-black text-gray-900 dark:text-gray-100">
                    {option.title}
                    {option.comingSoon && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                        <Clock className="h-3 w-3" />
                        {lo ? 'ໄວໆນີ້' : 'Coming soon'}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-gray-500 dark:text-gray-400">{option.detail}</span>
                </span>
                <span className={cn(
                  'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2',
                  selected ? 'border-primary-600 dark:border-primary-400' : 'border-gray-300 dark:border-gray-600',
                )}>
                  {selected && <span className="h-2.5 w-2.5 rounded-full bg-primary-600 dark:bg-primary-400" />}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}
