import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useToast } from '@/components/ui/Toast'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { formatPrice, generateOrderNumber } from '@/lib/utils'
import type { CheckoutForm, PaymentMethod } from '@/types'

const schema = z.object({
  full_name: z.string().min(2),
  phone: z.string().min(8),
  delivery_address: z.string().min(10),
  notes: z.string().optional(),
  payment_method: z.enum(['QR_PAYMENT', 'BANK_TRANSFER', 'CASH_ON_DELIVERY']),
  language: z.enum(['lo', 'en']),
})

export function Checkout() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { items, subtotal, clearCart } = useCart()
  const { profile } = useAuth()
  const { currency, language } = useLanguage()
  const { success, error } = useToast()
  const [placing, setPlacing] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<CheckoutForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: profile?.name ?? '',
      phone: profile?.phone ?? '',
      language,
      payment_method: 'QR_PAYMENT',
    },
  })

  const paymentMethod = watch('payment_method')

  if (items.length === 0) {
    navigate('/cart')
    return null
  }

  async function onSubmit(form: CheckoutForm) {
    if (!profile) { navigate('/auth'); return }
    setPlacing(true)
    try {
      const orderNumber = generateOrderNumber()
      const total = subtotal()

      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_id: profile.id,
          status: 'PENDING_PAYMENT',
          payment_status: 'PENDING',
          subtotal_amount: total,
          total_amount: total,
          currency,
          customer_name: form.full_name,
          customer_phone: form.phone,
          delivery_address: form.delivery_address,
          notes: form.notes,
        })
        .select()
        .single()

      if (orderErr || !order) throw orderErr

      const orderItems = items.map(item => ({
        order_id: order.id,
        book_id: item.book_id,
        bookstore_id: item.bookstore_id,
        quantity: item.quantity,
        bookstore_price: item.unit_price ?? 0,
        margin_percent: 0,
        final_price: item.unit_price ?? 0,
        fulfillment_status: 'PROCESSING',
      }))

      await supabase.from('order_items').insert(orderItems)

      await supabase.from('payments').insert({
        order_id: order.id,
        user_id: profile.id,
        method: form.payment_method as PaymentMethod,
        amount: total,
        currency,
        verification_status: 'PENDING',
      })

      clearCart()
      success('Order placed! #' + orderNumber)
      navigate(`/orders/${order.id}`)
    } catch {
      error(t('common.error'))
    } finally {
      setPlacing(false)
    }
  }

  const paymentOptions: { value: PaymentMethod; label: string }[] = [
    { value: 'QR_PAYMENT',       label: t('checkout.paymentMethods.QR_PAYMENT') },
    { value: 'BANK_TRANSFER',    label: t('checkout.paymentMethods.BANK_TRANSFER') },
    { value: 'CASH_ON_DELIVERY', label: t('checkout.paymentMethods.CASH_ON_DELIVERY') },
  ]

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
            required
            error={errors.phone?.message}
            {...register('phone')}
          />
          <Textarea
            label={t('checkout.address')}
            required
            rows={3}
            error={errors.delivery_address?.message}
            {...register('delivery_address')}
          />
          <Textarea
            label={t('checkout.notes')}
            rows={2}
            {...register('notes')}
          />
        </section>

        {/* Payment */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">{t('checkout.paymentMethod')}</h2>
          <div className="space-y-2">
            {paymentOptions.map(opt => (
              <label
                key={opt.value}
                className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                  paymentMethod === opt.value ? 'border-primary-400 bg-primary-50' : 'border-gray-200'
                }`}
              >
                <input type="radio" value={opt.value} {...register('payment_method')} className="text-primary-700" />
                <span className="text-sm font-medium text-gray-800">{opt.label}</span>
              </label>
            ))}
          </div>
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
    </div>
  )
}
