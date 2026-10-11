import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { firstRelation } from '@/lib/supabaseRelations'

// A paid membership past ends_at is expired. The database then moves the
// member to the Free plan (migration 096: the paid row becomes EXPIRED and a
// Free row with downgraded_from_id is added). Until that runs, the paid row
// can still read ACTIVE, so "ACTIVE but past ends_at" also counts as expired.

/** Members (and admins) are warned this many days before a paid membership ends. */
export const EXPIRY_WARNING_DAYS = 5
const DAY_MS = 24 * 60 * 60 * 1000

export type PremiumStatus = 'FREE' | 'PENDING_APPROVAL' | 'PENDING_PAYMENT' | 'PAYMENT_REVIEW' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED'

interface ExpiringSubscription {
  status: PremiumStatus
  ends_at?: string | null
}

export function isMembershipExpired(subscription: ExpiringSubscription | null | undefined, nowMs = Date.now()) {
  if (!subscription) return false
  if (subscription.status === 'EXPIRED') return true
  return subscription.status === 'ACTIVE'
    && !!subscription.ends_at
    && new Date(subscription.ends_at).getTime() <= nowMs
}

/** Whole days left (rounded up) when an active membership ends within the warning window, else null. */
export function daysUntilExpiry(subscription: ExpiringSubscription | null | undefined, nowMs = Date.now()) {
  if (!subscription?.ends_at || subscription.status !== 'ACTIVE') return null
  const remaining = new Date(subscription.ends_at).getTime() - nowMs
  if (remaining <= 0 || remaining > EXPIRY_WARNING_DAYS * DAY_MS) return null
  return Math.ceil(remaining / DAY_MS)
}

/** When the member's Premium ended, if they are now on Free because it expired (or it just expired). */
export function premiumEndedAt(subscription: (ExpiringSubscription & {
  starts_at?: string | null
  downgraded_from_id?: string | null
}) | null | undefined, nowMs = Date.now()): string | null {
  if (!subscription) return null
  // The Free row created on expiry starts when the paid membership ended.
  if (subscription.status === 'ACTIVE' && subscription.downgraded_from_id) return subscription.starts_at ?? null
  return isMembershipExpired(subscription, nowMs) ? subscription.ends_at ?? null : null
}

export interface MenuSubscription {
  status: PremiumStatus
  ends_at?: string | null
  starts_at?: string | null
  /** Set on the Free membership a member was moved to when their Premium expired. */
  downgraded_from_id?: string | null
  /** Set while a cancelled paid membership is still running until ends_at. */
  cancelled_at?: string | null
  plan?: { name: string; price_lak?: number }
}

/**
 * The signed-in member's latest subscription, in the narrow shape the profile
 * menu and the membership banner need. Keep the key's data shape stable: the
 * Subscription page uses a different key ('subscription') for its fuller row.
 */
export function useMenuSubscription(enabled = true) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['premium', 'subscription-menu', profile?.id],
    enabled: enabled && !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('premium_subscriptions')
        .select('status,starts_at,ends_at,cancelled_at,downgraded_from_id,plan:premium_plans(name,price_lak)')
        .eq('user_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      if (!data) return null
      return { ...data, plan: firstRelation(data.plan) ?? undefined } as MenuSubscription
    },
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 1,
  })
}

/**
 * The scheduler moves lapsed members to Free every few minutes; when the
 * member's own latest row has just expired, do it now for them and refresh.
 */
export function useDowngradeExpiredMembership(subscription: MenuSubscription | null | undefined) {
  const queryClient = useQueryClient()
  const requested = useRef(false)
  const needsDowngrade = subscription?.status === 'ACTIVE' && isMembershipExpired(subscription)

  useEffect(() => {
    if (!needsDowngrade || requested.current) return
    requested.current = true
    void supabase.rpc('downgrade_expired_premium').then(({ error }) => {
      if (error) {
        console.error(error)
        return
      }
      void queryClient.invalidateQueries({ queryKey: ['premium'] })
    })
  }, [needsDowngrade, queryClient])
}
