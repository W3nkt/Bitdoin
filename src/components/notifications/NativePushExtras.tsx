import { Flame, Moon } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { useWebPush } from '@/hooks/useWebPush'
import { cn } from '@/lib/utils'

const COPY = {
  ENGAGEMENT: {
    title: { lo: 'ເຕືອນມື້ຮຽນຕໍ່ເນື່ອງ ແລະ ອັນດັບ', en: 'Streak and leaderboard reminders' },
    body: {
      lo: 'ເຕືອນເມື່ອມື້ຮຽນຕໍ່ເນື່ອງຈະຂາດ ຫຼື ເມື່ອໃກ້ຈະຂຶ້ນອັນດັບ. ບໍ່ເກີນ 2 ຄັ້ງຕໍ່ມື້.',
      en: "A nudge when your streak is about to end or you're close to moving up. No more than 2 a day.",
    },
    icon: Flame,
  },
  WELLBEING: {
    title: { lo: 'ເຕືອນໃຫ້ພັກຜ່ອນ', en: 'Rest and well-being' },
    body: {
      lo: 'ເຕືອນໃຫ້ພັກສາຍຕາເມື່ອໃຊ້ແອັບດົນ ແລະ ວາງໂທລະສັບໃນຕອນກາງຄືນ.',
      en: 'A reminder to take a break after a long session, and to put the phone down at night.',
    },
    icon: Moon,
  },
} as const

function ExtraSwitch({ target, lo }: { target: keyof typeof COPY; lo: boolean }) {
  const toast = useToast()
  const push = useWebPush(target)
  const copy = COPY[target]
  const Icon = copy.icon

  async function toggle() {
    const turningOn = !push.enabled
    const problem = turningOn ? await push.enable() : await push.disable()
    if (problem === 'denied') {
      toast.error(lo ? 'ການແຈ້ງເຕືອນຖືກບລັອກ. ກະລຸນາອະນຸຍາດໃນການຕັ້ງຄ່າ.' : 'Notifications are blocked. Allow them in your settings.')
    } else if (problem) {
      toast.error(lo ? 'ບັນທຶກບໍ່ສຳເລັດ. ກະລຸນາລອງໃໝ່.' : 'Could not update notifications. Please try again.')
    } else if (turningOn) {
      toast.success(lo ? 'ເປີດການແຈ້ງເຕືອນແລ້ວ 🔔' : 'Notifications are on 🔔')
    }
  }

  const labelId = `push-extra-${target.toLowerCase()}`
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 px-4 py-3">
      <div className="min-w-0">
        <p id={labelId} className="flex items-center gap-2 text-sm font-bold">
          <Icon className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          {lo ? copy.title.lo : copy.title.en}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{lo ? copy.body.lo : copy.body.en}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={push.enabled}
        aria-labelledby={labelId}
        disabled={push.busy || push.loading}
        onClick={() => void toggle()}
        className={cn('relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60', push.enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600')}
      >
        <span className={cn('absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform', push.enabled ? 'translate-x-5' : 'translate-x-0')} />
      </button>
    </div>
  )
}

/**
 * The two switches that only exist in the iOS / Android apps: reminders that keep a streak going or point out the
 * leaderboard, and nudges to take a break or put the phone down. Each is independent of the daily quote.
 */
export function NativePushExtras({ lo }: { lo: boolean }) {
  return (
    <>
      <ExtraSwitch target="ENGAGEMENT" lo={lo} />
      <ExtraSwitch target="WELLBEING" lo={lo} />
    </>
  )
}
