import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { useAcademicCopy, type AcademicCopyKey } from '@/lib/academic/copy'
import { useAcademicSession } from '@/lib/academic/session'

const SUBSCRIPTION = '/academy/subscription'

/**
 * A locked premium feature (P3-BIL #51, PRD §30.4): what Academy Premium
 * adds, and the way to it. Students under 18 get "Ask a parent", which shares
 * the subscription link instead of a purchase prompt.
 */
export function PremiumNote({ body, vars }: { body: AcademicCopyKey; vars?: Record<string, string | number> }) {
  const { t } = useAcademicCopy()
  const toast = useToast()
  const minor = useAcademicSession().data?.profile?.age_band !== '18_plus'

  const askParent = async () => {
    const url = `${window.location.origin}${SUBSCRIPTION}`
    const text = t('premium.askParentText')
    try {
      if (navigator.share) await navigator.share({ title: t('premium.badge'), text, url })
      else {
        await navigator.clipboard.writeText(`${text} ${url}`)
        toast.success(t('premium.linkCopied'))
      }
    } catch {
      // Closing the share sheet is not an error.
    }
  }

  const action = 'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ring-1 ring-amber-300 text-amber-900 hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-amber-100 dark:ring-amber-500/40 dark:hover:bg-amber-500/20'
  return (
    <div role="note" className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-500/10 dark:text-amber-100">
      <Sparkles aria-hidden className="h-4 w-4 shrink-0" />
      <span className="min-w-[12rem] flex-1">{t(body, vars)}</span>
      {minor
        ? <button type="button" onClick={() => void askParent()} className={action}>{t('premium.askParent')}</button>
        : <Link to={SUBSCRIPTION} className={action}>{t('premium.see')}</Link>}
    </div>
  )
}
