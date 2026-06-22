import { supabase } from '@/lib/supabase'
import type { CartItem, Currency, Order, PaymentMethod } from '@/types'

export interface GuestOrderAccess {
  order_id: string
  order_number: string
  customer_phone: string
  access_token: string
  payment_id: string
}

export async function createCheckoutOrder(input: {
  customerName: string
  customerPhone: string
  deliveryAddress: string
  notes?: string
  currency: Currency
  paymentMethod: PaymentMethod
  items: CartItem[]
}) {
  const { data, error } = await supabase.rpc('create_checkout_order', {
    p_customer_name: input.customerName,
    p_customer_phone: input.customerPhone,
    p_delivery_address: input.deliveryAddress,
    p_notes: input.notes ?? null,
    p_currency: input.currency,
    p_payment_method: input.paymentMethod,
    p_items: input.items.map(item => ({
      book_id: item.book_id,
      bookstore_id: item.bookstore_id,
      quantity: item.quantity,
    })),
  })
  if (error) throw new Error(error.message)

  const result = data as GuestOrderAccess

  // Fire-and-forget admin email — never blocks or fails the checkout
  supabase.functions.invoke('notify-admin', {
    body: {
      order_number:    result.order_number,
      customer_name:   input.customerName,
      customer_phone:  input.customerPhone,
      delivery_address: input.deliveryAddress,
      notes:           input.notes,
      total_amount:    input.items.reduce((sum, i) => sum + (i.unit_price ?? 0) * i.quantity, 0),
      currency:        input.currency,
      payment_method:  input.paymentMethod,
      item_count:      input.items.reduce((sum, i) => sum + i.quantity, 0),
    },
  }).catch(() => { /* silently ignore — order already succeeded */ })

  return result
}

export async function trackOrder(orderNumber: string, customerPhone: string) {
  const { data, error } = await supabase.rpc('track_order', {
    p_order_number: orderNumber.trim(),
    p_customer_phone: customerPhone.trim(),
  })
  if (error) throw new Error(error.message)
  return (data ?? null) as Order | null
}

export async function issueReceiptToken(orderNumber: string, customerPhone: string) {
  const { data, error } = await supabase.rpc('issue_guest_receipt_token', {
    p_order_number: orderNumber,
    p_customer_phone: customerPhone,
  })
  if (error) throw new Error(error.message)
  return data as { order_id: string; access_token: string }
}

export async function uploadGuestReceipt(input: {
  order: Order
  customerPhone: string
  accessToken?: string
  file: File
}) {
  const access = input.accessToken
    ? { order_id: input.order.id, access_token: input.accessToken }
    : await issueReceiptToken(input.order.order_number, input.customerPhone)

  const extension = input.file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `guest/${access.order_id}/${access.access_token}/${crypto.randomUUID()}.${extension}`
  const { error: uploadError } = await supabase.storage
    .from('receipts')
    .upload(path, input.file, { contentType: input.file.type, upsert: false })
  if (uploadError) throw new Error(uploadError.message)

  const receiptUrl = supabase.storage.from('receipts').getPublicUrl(path).data.publicUrl
  const { error: submitError } = await supabase.rpc('submit_guest_receipt', {
    p_order_number: input.order.order_number,
    p_customer_phone: input.customerPhone,
    p_access_token: access.access_token,
    p_receipt_path: path,
    p_receipt_url: receiptUrl,
  })
  if (submitError) throw new Error(submitError.message)

  return { receiptUrl, accessToken: access.access_token }
}
