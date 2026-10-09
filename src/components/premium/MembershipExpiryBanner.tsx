import { useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Clock, X } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { daysUntilExpiry, premiumEndedAt, useDowngradeExpiredMembership, useMenuSubscription } from '@/lib/academyMembership'
import { supabase } from '@/lib/supabase'
import { cn, formatDate } from '@/lib/utils'

// Academy headers pinned to the top (fixed or sticky) sit this far down so the
// banner never covers them: top-[var(--academy-banner-h,0px)].
const HEIGHT_VAR = '--academy-banner-h'

// The Academy home/membership page shows its own "expires soon" card with a
// direct renew button, so this banner only covers the expired case there.
const PAGES_WITH_OWN_WARNING = new Set(['/academy/home', '/academy/subscription'])

// Expired members are on the Free plan and may be happy there, so they can
// hide the notice. Remembered per expiry (by its date): a later expiry shows again.
const DISMISSED_KEY = 'academy_expired_banner_dismissed'

function readDismissed() {
  try {
    return localStorage.getItem(DISMISSED_KEY)
  } catch {
    return null
  }
}

function writeDismissed(endedAt: string) {
  try {
    localStorage.setItem(DISMISSED_KEY, endedAt)
  } catch {
    // Blocked storage: the banner just comes back on the next visit.
  }
}

/**
 * Reminder pinned above every Academy page: red once a paid membership has
 * expired, amber in the last few days before it does.
 */
export function MembershipExpiryBanner() {
  const { pathname } = useLocation()
  const { language } = useLanguage()
  // Mounted once for the whole app; only Academy member pages (not the admin) show it.
  const onAcademyPage = /^\/academy(\/|$)/.test(pathname)
  const { data: subscription } = useMenuSubscription(onAcademyPage)

  const barRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)
  const [dismissedFor, setDismissedFor] = useState(readDismissed)

  useDowngradeExpiredMembership(onAcademyPage ? subscription : null)

  // Premium ended: either just now, or the member is on the Free plan it fell back to.
  const endedAt = premiumEndedAt(subscription)
  const expired = !!endedAt
  const daysLeft = expired ? null : daysUntilExpiry(subscription)
  const visible = onAcademyPage
    && (expired
      ? dismissedFor !== endedAt
      : !!subscription?.ends_at && daysLeft != null && !PAGES_WITH_OWN_WARNING.has(pathname))

  // Record the member's Close on the server for the admin's Renewals list —
  // right after they press it, or on their next visit if it was pressed before
  // this was recorded.
  const reportedRef = useRef(false)
  const closedHere = expired && dismissedFor === endedAt
  useLayoutEffect(() => {
    if (!closedHere || reportedRef.current) return
    reportedRef.current = true
    void supabase.rpc('dismiss_premium_expiry_notice').then(({ error }) => {
      if (error) console.error(error)
    })
  }, [closedHere])

  // Publish the bar's height (it wraps to two lines on phones) for pinned headers.
  useLayoutEffect(() => {
    const root = document.documentElement
    const bar = barRef.current
    if (!visible || !bar) {
      root.style.removeProperty(HEIGHT_VAR)
      setHeight(0)
      return
    }
    const update = () => {
      const next = bar.offsetHeight
      root.style.setProperty(HEIGHT_VAR, `${next}px`)
      setHeight(next)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(bar)
    return () => {
      observer.disconnect()
      root.style.removeProperty(HEIGHT_VAR)
    }
  }, [visible])

  const dateIso = endedAt ?? subscription?.ends_at
  if (!visible || !dateIso) return null

  const lao = language === 'lo'
  const date = formatDate(dateIso, language)
  const title = expired
    ? (lao ? `ສະມາຊິກພຣີມຽມຂອງທ່ານໝົດອາຍຸແລ້ວ (${date})` : `Your Premium membership expired on ${date}`)
    : lao
      ? `ສະມາຊິກຂອງທ່ານຈະໝົດອາຍຸໃນອີກ ${daysLeft} ມື້ (${date})`
      : `Your membership expires in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} (${date})`
  const detail = expired
    ? (lao ? 'ຕອນນີ້ທ່ານໃຊ້ແຜນຟຣີ. ສະໝັກອີກຄັ້ງ ເພື່ອກັບມາໃຊ້ພຣີມຽມຄົບທຸກຢ່າງ.' : "You're on the Free plan now. Subscribe again to get full Premium back.")
    : (lao ? 'ຕໍ່ອາຍຸດຽວນີ້ ເພື່ອບໍ່ໃຫ້ການຮຽນຂາດຕອນ.' : 'Renew now so your learning isn’t interrupted.')
  const action = expired ? (lao ? 'ສະໝັກອີກຄັ້ງ' : 'Subscribe again') : (lao ? 'ຕໍ່ອາຍຸ' : 'Renew')

  function dismiss() {
    if (!endedAt) return
    writeDismissed(endedAt)
    // The effect above then records it for the admin's Renewals list.
    setDismissedFor(endedAt)
  }

  return (
    <>
    {/* Holds the bar's space in the page, so content starts below it. */}
    <div aria-hidden="true" style={{ height }} />
    <div
      ref={barRef}
      role={expired ? 'alert' : 'status'}
      className={cn('fixed inset-x-0 top-0 z-[60] text-white shadow-md', expired ? 'bg-red-600' : 'bg-amber-500')}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 items-start gap-2.5">
          {expired
            ? <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
            : <Clock className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />}
          <p className="text-sm leading-5">
            <span className="font-black">{title}.</span>{' '}
            <span className={expired ? 'text-red-50' : 'text-amber-50'}>{detail}</span>
          </p>
        </div>
        <div className="flex w-full flex-shrink-0 items-center justify-between gap-2 sm:w-auto sm:justify-end">
          {/* Expired: start the Subscribe flow for their last paid plan (see ?renew in Subscription.tsx). */}
          <Link
            to={expired ? '/academy/subscription?renew=1' : '/academy/subscription#plans'}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-white px-3.5 py-1.5 text-xs font-black transition hover:bg-white/90',
              expired ? 'text-red-700' : 'text-amber-800',
            )}
          >
            {action}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          {expired && (
            <button
              type="button"
              onClick={dismiss}
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg bg-orange-500 px-2.5 py-1.5 text-xs font-black text-white shadow-sm transition hover:bg-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              {lao ? 'ປິດ' : 'Dismiss'}
            </button>
          )}
        </div>
      </div>
    </div>
    </>
  )
}
