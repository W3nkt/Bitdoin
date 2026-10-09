import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, HelpCircle, Loader2, RefreshCw, Sparkles, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

type CheckStatus = 'pass' | 'fail' | 'unknown'

export interface PaymentAiReview {
  payment_id: string
  status: 'PENDING' | 'DONE' | 'FAILED'
  receipt_ref: string | null
  suggested_action: 'APPROVE' | 'DECLINE' | 'MANUAL' | null
  checks: Array<{ key: string; status: CheckStatus; label: string; detail: string }>
  extracted: { notes?: string; confidence?: number; sender_name?: string | null; transaction_id?: string | null } | null
  decline_reason_lo: string | null
  decline_reason_en: string | null
  error: string | null
  updated_at: string
}

/** AI checks (migration 098) for the payments in the admin's review queue. */
export function usePaymentAiReviews(paymentIds: string[]) {
  const key = [...paymentIds].sort()
  return useQuery({
    queryKey: ['premium-admin', 'payment-ai-reviews', key],
    enabled: key.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('premium_payment_ai_reviews')
        .select('payment_id,status,receipt_ref,suggested_action,checks,extracted,decline_reason_lo,decline_reason_en,error,updated_at')
        .in('payment_id', key)
      if (error) throw error
      return new Map((data ?? []).map(row => [row.payment_id as string, row as PaymentAiReview]))
    },
    // The check runs right after upload and takes a few seconds; keep looking
    // while any result is missing or still running.
    refetchInterval: query => {
      const reviews = query.state.data
      const waiting = key.some(id => !reviews?.get(id) || reviews.get(id)!.status === 'PENDING')
      return waiting ? 8000 : false
    },
  })
}

/** The AI's drafted decline reason in the member's language (falls back to the other language), if any. */
export function draftedDeclineReason(review: PaymentAiReview | undefined, memberLanguage: 'lo' | 'en'): string {
  if (!review || review.status !== 'DONE') return ''
  return (memberLanguage === 'lo' ? review.decline_reason_lo : review.decline_reason_en)
    ?? review.decline_reason_lo
    ?? review.decline_reason_en
    ?? ''
}

const SUGGESTION = {
  APPROVE: { label: 'AI suggests: Approve', className: 'bg-emerald-600 text-white', icon: CheckCircle2 },
  DECLINE: { label: 'AI suggests: Decline', className: 'bg-red-600 text-white', icon: XCircle },
  MANUAL: { label: 'AI suggests: Check manually', className: 'bg-amber-500 text-white', icon: AlertTriangle },
} as const

const CHECK_ICON: Record<CheckStatus, { icon: typeof CheckCircle2; className: string }> = {
  pass: { icon: CheckCircle2, className: 'text-emerald-600 dark:text-emerald-400' },
  fail: { icon: XCircle, className: 'text-red-600 dark:text-red-400' },
  unknown: { icon: HelpCircle, className: 'text-amber-500' },
}

interface PaymentAiReviewCardProps {
  review: PaymentAiReview | undefined
  /** The proof currently on the payment; an older result is shown as outdated. */
  receiptRef: string
  memberLanguage: 'lo' | 'en'
  running: boolean
  onRun: () => void
  onDeclineWithReason: (reason: string) => void
}

/** The AI's reading of a payment proof, as advice for the admin's decision. */
export function PaymentAiReviewCard({ review, receiptRef, memberLanguage, running, onRun, onDeclineWithReason }: PaymentAiReviewCardProps) {
  const outdated = review && review.receipt_ref && review.receipt_ref !== receiptRef
  const pending = running || review?.status === 'PENDING'

  // Clicks here must not open the member details behind the card.
  return (
    <div
      onClick={event => event.stopPropagation()}
      onKeyDown={event => event.stopPropagation()}
      className="rounded-xl border border-violet-200 dark:border-violet-500/30 bg-white/80 dark:bg-gray-900/60 p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-violet-700 dark:text-violet-300">
          <Sparkles className="h-3.5 w-3.5" /> AI payment check
        </p>
        {!pending && (
          <button
            type="button"
            onClick={onRun}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-violet-700 dark:text-violet-300 transition hover:bg-violet-50 dark:hover:bg-violet-500/10"
          >
            <RefreshCw className="h-3 w-3" /> {review ? 'Re-run' : 'Run check'}
          </button>
        )}
      </div>

      {pending ? (
        <p className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading the receipt…
        </p>
      ) : !review ? (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Not checked yet. Run the check to read the receipt.</p>
      ) : review.status === 'FAILED' ? (
        <p className="mt-2 text-xs font-semibold text-red-700 dark:text-red-300">The AI check failed: {review.error ?? 'unknown error'}. Re-run it, or check the proof yourself.</p>
      ) : (
        <>
          {outdated && (
            <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-300">The member uploaded a new proof after this check. Re-run it.</p>
          )}
          {review.suggested_action && (
            <SuggestionBadge action={review.suggested_action} confidence={review.extracted?.confidence} />
          )}
          <ul className="mt-2 space-y-1">
            {review.checks.map(check => {
              const { icon: Icon, className } = CHECK_ICON[check.status]
              return (
                <li key={check.key} className="flex items-start gap-2 text-xs">
                  <Icon className={cn('mt-0.5 h-3.5 w-3.5 flex-shrink-0', className)} />
                  <span className="min-w-0">
                    <span className="font-bold text-gray-800 dark:text-gray-100">{check.label}:</span>{' '}
                    <span className="text-gray-600 dark:text-gray-300">{check.detail}</span>
                  </span>
                </li>
              )
            })}
          </ul>
          {(review.extracted?.sender_name || review.extracted?.transaction_id || review.extracted?.notes) && (
            <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
              {[
                review.extracted?.sender_name && `From ${review.extracted.sender_name}`,
                review.extracted?.transaction_id && `Ref ${review.extracted.transaction_id}`,
                review.extracted?.notes,
              ].filter(Boolean).join(' · ')}
            </p>
          )}
          {review.suggested_action === 'DECLINE' && (review.decline_reason_lo || review.decline_reason_en) && (
            <div className="mt-3 rounded-lg bg-red-50 dark:bg-red-500/10 p-2.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-red-700 dark:text-red-300">Drafted reason for the member</p>
              <p className="mt-1 text-xs leading-5 text-red-900 dark:text-red-100">
                {draftedDeclineReason(review, memberLanguage)}
              </p>
              <button
                type="button"
                onClick={() => onDeclineWithReason(draftedDeclineReason(review, memberLanguage))}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-black text-white transition hover:bg-red-700"
              >
                <XCircle className="h-3.5 w-3.5" /> Decline with this reason
              </button>
            </div>
          )}
          <p className="mt-2 text-[10px] text-gray-400">AI advice only — you make the final decision.</p>
        </>
      )}
    </div>
  )
}

function SuggestionBadge({ action, confidence }: { action: keyof typeof SUGGESTION; confidence?: number }) {
  const { label, className, icon: Icon } = SUGGESTION[action]
  return (
    <p className={cn('mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black', className)}>
      <Icon className="h-3.5 w-3.5" />
      {label}
      {confidence != null && <span className="font-semibold opacity-80">· {confidence}% clear</span>}
    </p>
  )
}
