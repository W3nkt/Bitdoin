import { useState } from 'react'
import { BellRing, Loader2, X } from 'lucide-react'
import { InstallAppButton } from '@/components/notifications/InstallAppButton'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { useWebPush } from '@/hooks/useWebPush'
import type { PushPlatform } from '@/lib/webPush'
import { cn } from '@/lib/utils'

// "Not now" hides the prompt for this long on this device.
const SNOOZE_MS = 30 * 24 * 60 * 60 * 1000

const COPY = {
  BOOKSTORE: {
    title: { lo: 'ຢາກຮູ້ກ່ອນໃຜເມື່ອມີປຶ້ມໃໝ່ບໍ?', en: 'Want to know first when new books arrive?' },
    body: { lo: 'ເປີດການແຈ້ງເຕືອນເພື່ອຮັບຂ່າວປຶ້ມໃໝ່ ແລະ ຟັງຊັນໃໝ່. ປິດໄດ້ທຸກເວລາ.', en: 'Turn on notifications for new books and new features. Turn them off any time.' },
  },
  ACADEMY: {
    title: { lo: 'ຮັບກຳລັງໃຈມື້ລະຄັ້ງ', en: 'A little inspiration every day' },
    body: { lo: 'ຮັບຂໍ້ຄິດປະຈຳວັນ ຫຼື ຄຳຄົມໃຫ້ກຳລັງໃຈເປັນພາສາລາວ. ປ່ຽນເວລາ ຫຼື ປິດໄດ້ໃນໂປຣໄຟລ໌.', en: 'A daily quote or motivational quote in Lao. Change the time or turn it off in your profile.' },
  },
} as const

function snoozeKey(platform: PushPlatform) {
  return `bitdoin.push.prompt.${platform}`
}

/** Hides the prompt for a while on this device (also used when a member turns a platform off). */
export function snoozePushPrompt(platform: PushPlatform) {
  try { localStorage.setItem(snoozeKey(platform), String(Date.now() + SNOOZE_MS)) } catch { /* ignore */ }
}

function isSnoozed(platform: PushPlatform) {
  try {
    const until = Number(localStorage.getItem(snoozeKey(platform)) ?? 0)
    return until > Date.now()
  } catch {
    return false
  }
}

/**
 * A gentle, dismissible card that asks before the browser's permission prompt.
 * Shown to signed-in members who have not turned this platform on here: never
 * asked yet, or already allowed for the other platform (one tap, no browser
 * prompt). On iPhone Safari it explains Add to Home Screen first.
 */
export function PushOptInPrompt({ platform, lo, className }: { platform: PushPlatform; lo: boolean; className?: string }) {
  const { profile } = useAuth()
  const toast = useToast()
  const push = useWebPush(platform)
  const [hidden, setHidden] = useState(() => isSnoozed(platform))
  const copy = COPY[platform]
  const academy = platform === 'ACADEMY'

  const canAsk = push.support === 'ready' && typeof Notification !== 'undefined' && Notification.permission !== 'denied'
  const visible = profile && !hidden && !push.loading && !push.enabled && (canAsk || push.support === 'ios-install')
  if (!visible) return null

  function snooze() {
    snoozePushPrompt(platform)
    setHidden(true)
  }

  async function turnOn() {
    const problem = await push.enable()
    if (!problem) {
      toast.success(lo ? 'ເປີດການແຈ້ງເຕືອນແລ້ວ 🔔' : 'Notifications are on 🔔')
      setHidden(true)
    } else if (problem === 'denied') {
      setHidden(true)
    } else {
      toast.error(lo ? 'ເປີດບໍ່ສຳເລັດ. ກະລຸນາລອງໃໝ່.' : 'Could not turn on notifications. Please try again.')
    }
  }

  return (
    <div className={cn(
      'relative flex items-start gap-3 rounded-2xl border p-4',
      academy
        ? 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'
        : 'border-primary-100 bg-primary-50 dark:border-primary-500/30 dark:bg-primary-500/10',
      className,
    )}>
      <span className={cn(
        'grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white',
        academy ? 'bg-amber-500' : 'bg-primary-700',
      )}>
        <BellRing className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1 pr-6">
        <p className="text-sm font-black text-slate-900 dark:text-slate-100">{lo ? copy.title.lo : copy.title.en}</p>
        {push.support === 'ios-install' ? (
          <>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              {lo
                ? 'ໃນ iPhone, ການແຈ້ງເຕືອນເຮັດວຽກເມື່ອເພີ່ມ Bitdoin ໃສ່ໜ້າຈໍໂຮມແລ້ວເທົ່ານັ້ນ.'
                : 'On iPhone, notifications work once Bitdoin is on your Home Screen.'}
            </p>
            <InstallAppButton lo={lo} className="mt-3" />
          </>
        ) : (
          <>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{lo ? copy.body.lo : copy.body.en}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void turnOn()}
                disabled={push.busy}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-black text-white transition disabled:opacity-60',
                  academy ? 'bg-amber-500 hover:bg-amber-600' : 'bg-primary-700 hover:bg-primary-800',
                )}
              >
                {push.busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {lo ? 'ເປີດການແຈ້ງເຕືອນ' : 'Turn on notifications'}
              </button>
              <button
                type="button"
                onClick={snooze}
                className="rounded-full px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                {lo ? 'ບໍ່ແມ່ນຕອນນີ້' : 'Not now'}
              </button>
            </div>
          </>
        )}
      </div>
      <button
        type="button"
        onClick={snooze}
        aria-label={lo ? 'ປິດ' : 'Close'}
        className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-black/5 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
