import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Bus } from 'lucide-react'
import { z } from 'zod'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useToast } from '@/components/ui/Toast'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { GuestPaymentPanel } from '@/components/order/GuestPaymentPanel'
import { LAOS_ADMIN_DIVISIONS } from '@/data/laosAdministrativeDivisions'
import { publicAsset } from '@/lib/assets'
import { formatPrice } from '@/lib/utils'
import { createCheckoutOrder, trackOrder, updateGuestPaymentMethod, type GuestOrderAccess } from '@/lib/guestOrders'
import { trackGoogleEvent } from '@/lib/googleAnalytics'
import type { CheckoutForm, Order, PaymentMethod } from '@/types'

const PHONE_PREFIX = '020'

const schema = z.object({
  full_name: z.string().min(2),
  phone: z.string().regex(/^\d{8}$/),
  logistics_provider: z.string().min(1),
  province: z.string().min(1),
  district: z.string().min(1),
  delivery_address: z.string().min(4),
  notes: z.string().optional(),
  payment_method: z.enum(['QR_PAYMENT', 'BANK_TRANSFER', 'CASH_ON_DELIVERY']),
  language: z.enum(['lo', 'en']),
})

const logisticsOptions = [
  {
    value: 'HAL Logistics',
    label_en: 'HAL Logistics',
    label_lo: 'ຮຸ່ງອາລຸນ ຂົນສົ່ງດ່ວນ',
    logo: publicAsset('icons/HAL.png'),
  },
  {
    value: 'Unitel Logistics',
    label_en: 'Unitel Logistics',
    label_lo: 'ຢູນີເທວ ຂົນສົ່ງດ່ວນ',
    logo: publicAsset('icons/Unitel.png'),
  },
  {
    value: 'Anousith Express',
    label_en: 'Anousith Express',
    label_lo: 'ອານຸສິດ ຂົນສົ່ງດ່ວນ',
    logo: publicAsset('icons/Anousith.png'),
  },
  {
    value: 'Bus',
    label_en: 'Bus',
    label_lo: 'ຝາກລົດເມ',
  },
]

export function Checkout() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { items, subtotal, clearCart } = useCart()
  const { profile } = useAuth()
  const { currency, language } = useLanguage()
  const { success, error } = useToast()
  const [placing, setPlacing] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [paymentStep, setPaymentStep] = useState<2 | 3>(2)
  const [checkoutDraft, setCheckoutDraft] = useState<CheckoutForm | null>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('QR_PAYMENT')
  const [placedAccess, setPlacedAccess] = useState<GuestOrderAccess | null>(null)
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null)
  const [loadingPlacedOrder, setLoadingPlacedOrder] = useState(false)
  const [paymentLoadError, setPaymentLoadError] = useState('')
  const [guestAccessToken, setGuestAccessToken] = useState<string>()
  const [placedPhone, setPlacedPhone] = useState('')

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CheckoutForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: profile?.name ?? '',
      phone: (profile?.phone ?? '').replace(/\D/g, '').slice(-8),
      language,
      payment_method: 'QR_PAYMENT',
      logistics_provider: '',
      province: '',
      district: '',
    },
  })

  const selectedProvinceId = watch('province')
  const selectedLogistics = watch('logistics_provider')

  const provinceOptions = useMemo(() => LAOS_ADMIN_DIVISIONS.map(province => ({
    value: province.id,
    label: language === 'lo' ? province.name_lo : province.name_en,
  })), [language])

  const selectedProvince = LAOS_ADMIN_DIVISIONS.find(province => province.id === selectedProvinceId)
  const districtOptions = selectedProvince?.districts.map(district => ({
    value: district.code,
    label: language === 'lo' ? district.name_lo : district.name_en,
  })) ?? []

  useEffect(() => {
    setValue('district', '')
  }, [selectedProvinceId, setValue])

  const shouldReturnToCart = items.length === 0 && !placedAccess && !paymentModalOpen

  useEffect(() => {
    if (shouldReturnToCart) navigate('/cart', { replace: true })
  }, [navigate, shouldReturnToCart])

  useEffect(() => {
    if (items.length > 0) trackGoogleEvent('begin_checkout', {
      currency,
      value: items.reduce((sum, item) => sum + (item.unit_price ?? 0) * item.quantity, 0),
      items: items.map(item => ({
        item_id: item.book_id,
        item_name: item.book?.title ?? item.book_id,
        item_variant: item.bookstore_id,
        price: item.unit_price ?? 0,
        quantity: item.quantity,
      })),
    })
    // Fire once for this visit to the checkout page only.
  }, [])

  async function onSubmit(form: CheckoutForm) {
    setCheckoutDraft(form)
    setSelectedPaymentMethod(form.payment_method)
    setPaymentStep(2)
    setPaymentModalOpen(true)
  }

  async function confirmOrder() {
    if (placedAccess) {
      await changePaymentMethod()
      return
    }
    if (!checkoutDraft) return
    setPaymentStep(3)
    setPlacing(true)
    try {
      const form = checkoutDraft
      const provinceLabel = selectedProvince
        ? language === 'lo' ? selectedProvince.name_lo : selectedProvince.name_en
        : form.province
      const selectedDistrict = selectedProvince?.districts.find(district => district.code === form.district)
      const districtLabel = selectedDistrict
        ? language === 'lo' ? selectedDistrict.name_lo : selectedDistrict.name_en
        : form.district
      const deliveryAddress = [
        `${t('checkout.logisticsProvider')}: ${form.logistics_provider}`,
        `${t('checkout.province')}: ${provinceLabel}`,
        `${t('checkout.district')}: ${districtLabel}`,
        `${t('checkout.address')}: ${form.delivery_address}`,
      ].join('\n')

      const customerPhone = `${PHONE_PREFIX}${form.phone}`
      const access = await createCheckoutOrder({
        customerName: form.full_name,
        customerPhone,
        deliveryAddress,
        notes: form.notes,
        currency,
        paymentMethod: selectedPaymentMethod,
        items,
      })
      setPlacedPhone(customerPhone)
      setGuestAccessToken(access.access_token)
      setPlacedAccess(access)
      trackGoogleEvent('purchase', {
        transaction_id: access.order_number,
        currency,
        value: items.reduce((sum, item) => sum + (item.unit_price ?? 0) * item.quantity, 0),
        payment_type: selectedPaymentMethod,
        items: items.map(item => ({
          item_id: item.book_id,
          item_name: item.book?.title ?? item.book_id,
          item_variant: item.bookstore_id,
          price: item.unit_price ?? 0,
          quantity: item.quantity,
        })),
      })
      success(t('checkout.orderPlaced', { orderNumber: access.order_number }))
      await loadPlacedOrder(access.order_number, customerPhone)
    } catch (checkoutError) {
      console.error('[checkout]', checkoutError)
      error(checkoutError instanceof Error ? checkoutError.message : t('common.error'))
      setPaymentStep(2)
    } finally {
      setPlacing(false)
    }
  }

  async function changePaymentMethod() {
    if (!placedAccess) return
    setPaymentStep(3)
    setPlacing(true)
    try {
      await updateGuestPaymentMethod({
        orderNumber: placedAccess.order_number,
        customerPhone: placedPhone,
        accessToken: placedAccess.access_token,
        paymentMethod: selectedPaymentMethod,
      })
      await loadPlacedOrder(placedAccess.order_number, placedPhone)
    } catch (changeError) {
      console.error('[change payment method]', changeError)
      error(changeError instanceof Error ? changeError.message : t('common.error'))
      setPaymentStep(2)
    } finally {
      setPlacing(false)
    }
  }

  function backToPaymentMethod() {
    setPaymentStep(2)
  }

  async function loadPlacedOrder(orderNumber: string, phone: string) {
    setLoadingPlacedOrder(true)
    setPaymentLoadError('')
    try {
      const order = await trackOrder(orderNumber, phone)
      if (!order) throw new Error('The order was created but could not be loaded')
      setPlacedOrder(order)
      if (order.payments?.[0]?.method === 'CASH_ON_DELIVERY') clearCart()
    } catch (loadError) {
      console.error('[load placed order]', loadError)
      setPaymentLoadError(loadError instanceof Error ? loadError.message : t('common.error'))
    } finally {
      setLoadingPlacedOrder(false)
    }
  }

  function closePayment() {
    const orderNumber = placedOrder?.order_number ?? placedAccess?.order_number
    if (!orderNumber) {
      setPaymentModalOpen(false)
      setPaymentStep(2)
      return
    }
    clearCart()
    sessionStorage.setItem(`pwen-track-phone:${orderNumber}`, placedPhone)
    navigate(`/track?order=${encodeURIComponent(orderNumber)}`)
  }

  function completeCheckout(order: Order) {
    setPlacedOrder(order)
    clearCart()
  }

  const paymentOptions: { value: PaymentMethod; label: string }[] = [
    { value: 'QR_PAYMENT',       label: t('checkout.paymentMethods.QR_PAYMENT') },
    { value: 'BANK_TRANSFER',    label: t('checkout.paymentMethods.BANK_TRANSFER') },
    // CASH_ON_DELIVERY temporarily disabled until fulfillment process is worked out
  ]

  if (shouldReturnToCart) return null

  return (
    <div className="max-w-lg mx-auto space-y-5 pb-8">
      <h1 className="text-lg font-bold text-gray-900">{t('checkout.title')}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Delivery */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">{t('checkout.deliveryInfo')}</h2>
          <Input
            label={t('checkout.fullName')}
            required
            error={errors.full_name?.message}
            {...register('full_name')}
          />
          <Input
            label={t('checkout.phone')}
            type="tel"
            inputMode="numeric"
            required
            maxLength={8}
            placeholder="XXXXXXXX"
            leftIcon={<span className="text-sm font-medium text-gray-500">{PHONE_PREFIX}-</span>}
            className="pl-14"
            error={errors.phone ? t('checkout.phoneInvalid') : undefined}
            {...register('phone', {
              onChange: (event: ChangeEvent<HTMLInputElement>) => {
                event.target.value = event.target.value.replace(/\D/g, '').slice(0, 8)
              },
            })}
          />

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              {t('checkout.logisticsProvider')}<span className="text-red-500 ml-0.5">*</span>
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {logisticsOptions.map(option => (
                <label
                  key={option.value}
                  className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                    selectedLogistics === option.value
                      ? 'border-primary-400 bg-primary-50 text-primary-900'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    value={option.value}
                    {...register('logistics_provider')}
                    className="h-4 w-4 shrink-0 text-primary-700"
                  />
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-100 bg-white">
                    {option.logo ? (
                      <img
                        src={option.logo}
                        alt=""
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <Bus className="h-6 w-6 text-primary-700" aria-hidden="true" />
                    )}
                  </span>
                  <span className="min-w-0 font-medium leading-snug">
                    {language === 'lo' ? option.label_lo : option.label_en}
                  </span>
                </label>
              ))}
            </div>
            {errors.logistics_provider?.message && (
              <p className="text-xs text-red-600">{errors.logistics_provider.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label={t('checkout.province')}
              required
              placeholder={t('checkout.selectProvince')}
              options={provinceOptions}
              error={errors.province?.message}
              {...register('province')}
            />
            <Select
              label={t('checkout.district')}
              required
              placeholder={t('checkout.selectDistrict')}
              options={districtOptions}
              disabled={!selectedProvince}
              error={errors.district?.message}
              {...register('district')}
            />
          </div>

          <Textarea
            label={t('checkout.address')}
            required
            rows={3}
            placeholder={t('checkout.addressDetail')}
            error={errors.delivery_address?.message}
            {...register('delivery_address')}
          />
          <Textarea
            label={t('checkout.notes')}
            rows={2}
            {...register('notes')}
          />
        </section>

        {/* Order summary */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
          <h2 className="text-sm font-semibold text-gray-700">{t('checkout.orderSummary')}</h2>
          {items.map(item => (
            <div key={`${item.book_id}-${item.bookstore_id}`} className="flex justify-between text-sm">
              <span className="text-gray-600 line-clamp-1 flex-1">{item.book?.title} × {item.quantity}</span>
              <span className="font-medium ml-4">{formatPrice((item.unit_price ?? 0) * item.quantity, currency)}</span>
            </div>
          ))}
          <div className="border-t pt-2 flex justify-between text-sm font-semibold">
            <span>{t('checkout.total')}</span>
            <span className="text-primary-700">{formatPrice(subtotal(), currency)}</span>
          </div>
          <p className="text-xs text-gray-400">{t('cart.deliveryFeeNote')}</p>
        </section>

        <Button type="submit" fullWidth size="lg" loading={placing}>
          {t('checkout.placeOrder')}
        </Button>
      </form>

      <Modal
        open={paymentModalOpen}
        onClose={closePayment}
        title={paymentStep === 2 ? t('checkout.choosePayment') : t('checkout.completePayment')}
        size="lg"
        footer={paymentStep === 3 && placedAccess ? (
          <Button type="button" variant="ghost" onClick={closePayment}>
            {t('tracking.viewTracking')}
          </Button>
        ) : undefined}
      >
        <CheckoutSteps current={paymentStep} />

        {paymentStep === 2 && (
          <div className="space-y-5">
            <div className="rounded-2xl bg-primary-50 px-4 py-3 text-center">
              <p className="text-xs text-primary-500">{t('checkout.total')}</p>
              <p className="mt-1 text-2xl font-bold text-primary-800">
                {formatPrice(subtotal(), currency)}
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700">{t('checkout.paymentMethod')}</h3>
              {paymentOptions.map(option => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${
                    selectedPaymentMethod === option.value
                      ? 'border-primary-400 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="modal_payment_method"
                    value={option.value}
                    checked={selectedPaymentMethod === option.value}
                    onChange={() => setSelectedPaymentMethod(option.value)}
                    className="text-primary-700"
                  />
                  <span className="text-sm font-medium text-gray-800">{option.label}</span>
                </label>
              ))}
            </div>

            <Button
              type="button"
              fullWidth
              size="lg"
              loading={placing}
              onClick={confirmOrder}
            >
              {t('checkout.confirmOrder')}
            </Button>
          </div>
        )}
        {paymentStep === 3 && !placedOrder && !paymentLoadError && (
          <div className="py-8 text-center">
            {loadingPlacedOrder && <LoadingSpinner />}
            <p className="mt-3 text-sm text-gray-500">{t('checkout.loadingPayment')}</p>
            <p className="mt-1 font-mono text-sm font-semibold text-primary-700">
              {placedAccess?.order_number}
            </p>
          </div>
        )}
        {paymentStep === 3 && !placedOrder && paymentLoadError && placedAccess && (
          <div className="space-y-4 py-5 text-center">
            <p className="text-sm font-semibold text-gray-800">{t('checkout.orderSaved')}</p>
            <p className="text-xs text-gray-500">{paymentLoadError}</p>
            <p className="font-mono text-sm font-bold text-primary-700">{placedAccess.order_number}</p>
            <Button
              type="button"
              fullWidth
              loading={loadingPlacedOrder}
              onClick={() => loadPlacedOrder(placedAccess.order_number, placedPhone)}
            >
              {t('common.retry')}
            </Button>
          </div>
        )}
        {paymentStep === 3 && placedOrder && placedAccess && (
          <div className="space-y-4">
            {placedOrder.payments?.[0]?.verification_status === 'PENDING' && (
              <button
                type="button"
                onClick={backToPaymentMethod}
                className="flex items-center gap-1 text-sm font-medium text-primary-700 hover:text-primary-800"
              >
                <ArrowLeft className="h-4 w-4" />
                {t('checkout.changePaymentMethod')}
              </button>
            )}
            <GuestPaymentPanel
              order={placedOrder}
              customerPhone={placedPhone}
              accessToken={guestAccessToken}
              onOrderChange={setPlacedOrder}
              onPaymentSubmitted={completeCheckout}
            />
          </div>
        )}
      </Modal>
    </div>
  )
}

function CheckoutSteps({ current }: { current: 2 | 3 }) {
  const { t } = useTranslation()
  const steps = [
    { number: 1, label: t('checkout.stepDelivery') },
    { number: 2, label: t('checkout.stepMethod') },
    { number: 3, label: t('checkout.stepPay') },
  ]

  return (
    <div className="mb-5 grid grid-cols-3 gap-2">
      {steps.map(step => {
        const active = step.number === current
        const complete = step.number < current
        return (
          <div key={step.number} className="min-w-0 text-center">
            <div className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
              active || complete ? 'bg-primary-700 text-white' : 'bg-gray-100 text-gray-400'
            }`}>
              {step.number}
            </div>
            <p className={`mt-1 truncate text-[10px] font-semibold ${
              active ? 'text-primary-700' : complete ? 'text-gray-600' : 'text-gray-400'
            }`}>
              {step.label}
            </p>
          </div>
        )
      })}
    </div>
  )
}
