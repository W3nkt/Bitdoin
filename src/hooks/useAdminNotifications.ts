import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'

const LS_KEY = 'admin_seen_notification_ids'

function loadSeenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? new Set<string>(JSON.parse(raw)) : new Set<string>()
  } catch {
    return new Set<string>()
  }
}

function saveSeenIds(ids: Set<string>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...ids]))
  } catch {
    // Ignore storage failures; badges still work for the current session.
  }
}

export function useAdminNotifications() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [seenIds, setSeenIds] = useState<Set<string>>(loadSeenIds)

  // Query IDs (not just counts) so we can subtract seenIds precisely
  const { data: pendingOrderIds = [] } = useQuery({
    queryKey: ['admin', 'badge', 'orders'],
    queryFn: async () => {
      const { data } = await supabase
        .from('orders')
        .select('id')
        .in('status', ['PENDING_PAYMENT', 'PAYMENT_REVIEW'])
      return (data ?? []).map((r: { id: string }) => r.id)
    },
    refetchInterval: 60_000,
  })

  const { data: pendingPaymentIds = [] } = useQuery({
    queryKey: ['admin', 'badge', 'payments'],
    queryFn: async () => {
      const { data } = await supabase
        .from('payments')
        .select('id')
        .in('verification_status', ['PENDING', 'REQUIRES_REVIEW'])
      return (data ?? []).map((r: { id: string }) => r.id)
    },
    refetchInterval: 60_000,
  })

  const { data: pendingDeliveryIds = [] } = useQuery({
    queryKey: ['admin', 'badge', 'deliveries'],
    queryFn: async () => {
      const { data } = await supabase
        .from('deliveries')
        .select('id')
        .eq('status', 'NOT_ASSIGNED')
      return (data ?? []).map((r: { id: string }) => r.id)
    },
    refetchInterval: 60_000,
  })

  // Prune seenIds that are no longer pending so they don't suppress future items
  useEffect(() => {
    const allPending = new Set([...pendingOrderIds, ...pendingPaymentIds, ...pendingDeliveryIds])
    setSeenIds(prev => {
      const cleaned = new Set([...prev].filter(id => allPending.has(id)))
      if (cleaned.size !== prev.size) {
        saveSeenIds(cleaned)
        return cleaned
      }
      return prev
    })
  }, [pendingOrderIds, pendingPaymentIds, pendingDeliveryIds])

  // Realtime subscriptions for push notifications
  useEffect(() => {
    const channel = supabase
      .channel('admin-realtime-badges')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        qc.invalidateQueries({ queryKey: ['admin', 'badge', 'orders'] })
        qc.invalidateQueries({ queryKey: ['admin', 'orders'] })
        const orderNum = (payload.new as { order_number?: string })?.order_number
        toastRef.current(orderNum ? `New order ${orderNum}` : 'New order received', 'info')
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payments' }, () => {
        qc.invalidateQueries({ queryKey: ['admin', 'badge', 'payments'] })
        qc.invalidateQueries({ queryKey: ['admin', 'payments'] })
        toastRef.current('New payment submitted — needs review', 'info')
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
        qc.invalidateQueries({ queryKey: ['admin', 'badge', 'orders'] })
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'payments' }, () => {
        qc.invalidateQueries({ queryKey: ['admin', 'badge', 'payments'] })
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'deliveries' }, () => {
        qc.invalidateQueries({ queryKey: ['admin', 'badge', 'deliveries'] })
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'deliveries' }, () => {
        qc.invalidateQueries({ queryKey: ['admin', 'badge', 'deliveries'] })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [qc])

  function markSeen(id: string) {
    setSeenIds(prev => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      saveSeenIds(next)
      return next
    })
  }

  const orderBadge   = pendingOrderIds.filter(id => !seenIds.has(id)).length
  const paymentBadge = pendingPaymentIds.filter(id => !seenIds.has(id)).length
  const deliveryBadge = pendingDeliveryIds.filter(id => !seenIds.has(id)).length

  return { orderBadge, paymentBadge, deliveryBadge, markSeen }
}
