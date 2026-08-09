import { supabase } from '@/lib/supabase'

// Best-effort: the subscription/payment row is already saved regardless of
// whether the admin gets emailed, so failures are only logged, never thrown.
export function notifyAdminOfAcademySubscription(subscriptionId: string) {
  supabase.functions.invoke('notify-admin-academy', {
    body: { event: 'SUBSCRIPTION_REQUEST', subscription_id: subscriptionId },
  }).catch(notifyError => console.error('[notify-admin-academy] Subscription saved, but admin email failed', notifyError))
}

export function notifyAdminOfAcademyPayment(subscriptionId: string, paymentId: string) {
  supabase.functions.invoke('notify-admin-academy', {
    body: { event: 'PAYMENT_SUBMITTED', subscription_id: subscriptionId, payment_id: paymentId },
  }).catch(notifyError => console.error('[notify-admin-academy] Payment proof saved, but admin email failed', notifyError))
}
