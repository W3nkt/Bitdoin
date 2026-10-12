import { useEffect, useRef } from 'react'
import { Bell, BellOff, BellRing, Loader2, Share, Smartphone } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { useWebPush } from '@/hooks/useWebPush'
import { snoozePushPrompt } from '@/components/notifications/PushOptInPrompt'
import type { PushPlatform, ReminderSlot } from '@/lib/webPush'
import { cn } from '@/lib/utils'

const SLOTS: Array<{ value: ReminderSlot; lo: string; en: string }> = [
  { value: 'MORNING', lo: 'ເຊົ້າ 07:30', en: 'Morning 7:30' },
  { value: 'AFTERNOON', lo: 'ບ່າຍ 12:30', en: 'Afternoon 12:30' },
  { value: 'EVENING', lo: 'ແລງ 19:30', en: 'Evening 19:30' },
]

const COPY = {
  BOOKSTORE: {
    title: { lo: 'ການແຈ້ງເຕືອນ', en: 'Notifications' },
    description: {
      lo: 'ຮູ້ກ່ອນໃຜເມື່ອມີປຶ້ມໃໝ່ ແລະ ຟັງຊັນໃໝ່ ເຖິງວ່າຈະປິດແອັບຢູ່ກໍຕາມ. ບໍ່ສົ່ງຫຼາຍເກີນໄປ.',
      en: 'Be the first to hear about new books and new features, even when the app is closed. No spam.',
    },
    toggle: { lo: 'ປຶ້ມໃໝ່ ແລະ ຂ່າວອັບເດດ', en: 'New books and updates' },
  },
  ACADEMY: {
    title: { lo: 'ການແຈ້ງເຕືອນໃນແອັບ', en: 'App notifications' },
    description: {
      lo: 'ຮັບຂໍ້ຄວາມສັ້ນໆມື້ລະຄັ້ງ: ບົດຮຽນໃໝ່, ຄວາມທ້າທາຍມື້ນີ້ ຫຼື ກຳລັງໃຈ, ພ້ອມຂ່າວຟັງຊັນໃໝ່. ເຮັດວຽກເຖິງວ່າຈະປິດແອັບຢູ່.',
      en: "One short message a day: a new lesson, today's challenge or a quick nudge, plus news about new features. Works even when the app is closed.",
    },
    toggle: { lo: 'ການແຈ້ງເຕືອນປະຈຳວັນ', en: 'Daily reminder' },
  },
} as const

/**
 * Lets a signed-in member turn on browser / home-screen notifications for one
 * platform on this device. Rendered on /bookstore/profile and /academy/profile.
 */
export function PushNotificationCard({ platform, lo, className }: { platform: PushPlatform; lo: boolean; className?: string }) {
  const { profile } = useAuth()
  const toast = useToast()
  const push = useWebPush(platform)
  const sectionRef = useRef<HTMLElement>(null)
  const copy = COPY[platform]
  const academy = platform === 'ACADEMY'
  const accent = academy ? 'text-amber-600 dark:text-amber-400' : 'text-primary-700 dark:text-primary-300'

  // Opened from a menu link such as /academy/profile#notifications.
  useEffect(() => {
    if (window.location.hash === '#notifications') sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  if (!profile || push.support === 'unconfigured') return null

  async function toggle() {
    const problem = push.enabled ? await push.disable() : await push.enable()
    if (problem === 'denied') {
      toast.error(lo ? 'ການແຈ້ງເຕືອນຖືກບລັອກ. ກະລຸນາອະນຸຍາດໃນການຕັ້ງຄ່າ.' : 'Notifications are blocked. Allow them in your settings.')
    } else if (problem) {
      toast.error(lo ? 'ບັນທຶກບໍ່ສຳເລັດ. ກະລຸນາລອງໃໝ່.' : 'Could not update notifications. Please try again.')
    } else if (!push.enabled) {
      toast.success(lo ? 'ເປີດການແຈ້ງເຕືອນແລ້ວ 🔔' : 'Notifications are on 🔔')
    } else {
      // They chose off here; don't offer it again on the home page for a while.
      snoozePushPrompt(platform)
    }
  }

  async function changeSlot(slot: ReminderSlot) {
    if (await push.setSlot(slot)) toast.error(lo ? 'ບັນທຶກບໍ່ສຳເລັດ.' : 'Could not save your reminder time.')
  }

  async function test() {
    const ok = await push.sendTest()
    if (ok) toast.success(lo ? 'ສົ່ງແລ້ວ. ກວດເບິ່ງການແຈ້ງເຕືອນຂອງທ່ານ.' : 'Sent. Check your notifications.')
    else toast.error(lo ? 'ສົ່ງບໍ່ສຳເລັດ.' : 'Could not send a test notification.')
  }

  return (
    <section
      id="notifications"
      ref={sectionRef}
      className={cn('scroll-mt-24 rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-900 p-5 sm:p-6', className)}
    >
      <div className="flex items-start gap-4">
        <span className={cn(
          'grid h-12 w-12 shrink-0 place-items-center rounded-2xl',
          academy ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' : 'bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300',
        )}>
          <BellRing className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-black">{lo ? copy.title.lo : copy.title.en}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{lo ? copy.description.lo : copy.description.en}</p>
        </div>
      </div>

      {push.support === 'ios-install' ? (
        <div className="mt-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-4 text-sm text-slate-700 dark:text-slate-200">
          <p className="flex items-center gap-2 font-bold"><Smartphone className="h-4 w-4" />{lo ? 'ໃນ iPhone / iPad' : 'On iPhone / iPad'}</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>{lo ? 'ກົດປຸ່ມ ' : 'Tap the '}<Share className="inline h-4 w-4 align-text-bottom" />{lo ? ' ແບ່ງປັນ ໃນ Safari' : ' Share button in Safari'}</li>
            <li>{lo ? 'ເລືອກ "ເພີ່ມໃສ່ໜ້າຈໍໂຮມ" (Add to Home Screen)' : 'Choose "Add to Home Screen"'}</li>
            <li>{lo ? 'ເປີດ Bitdoin ຈາກໜ້າຈໍໂຮມ ແລ້ວກັບມາເປີດການແຈ້ງເຕືອນຢູ່ບ່ອນນີ້' : 'Open Bitdoin from your Home Screen and turn notifications on here'}</li>
          </ol>
        </div>
      ) : push.support === 'denied' ? (
        <p className="mt-5 flex items-start gap-2 rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-4 text-sm text-slate-600 dark:text-slate-300">
          <BellOff className="mt-0.5 h-4 w-4 shrink-0" />
          {lo
            ? 'ການແຈ້ງເຕືອນຂອງ Bitdoin ຖືກບລັອກໄວ້. ເປີດໃນການຕັ້ງຄ່າຂອງບຣາວເຊີ ຫຼື ໂທລະສັບ, ແລ້ວໂຫຼດໜ້ານີ້ໃໝ່.'
            : 'Notifications for Bitdoin are blocked. Allow them in your browser or phone settings, then reload this page.'}
        </p>
      ) : push.support === 'unsupported' ? (
        <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">
          {lo ? 'ບຣາວເຊີນີ້ບໍ່ຮອງຮັບການແຈ້ງເຕືອນ. ລອງໃຊ້ Chrome, Edge, Firefox ຫຼື Safari.' : "This browser can't receive notifications. Try Chrome, Edge, Firefox or Safari."}
        </p>
      ) : push.loading ? (
        <div className="mt-5 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
      ) : (
        <div className="mt-5 space-y-4">
          <label className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-bold">
              <Bell className={cn('h-4 w-4', accent)} />
              {lo ? copy.toggle.lo : copy.toggle.en}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={push.enabled}
              disabled={push.busy}
              onClick={() => void toggle()}
              className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60', push.enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600')}
            >
              <span className={cn('absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform', push.enabled ? 'translate-x-5' : 'translate-x-0')} />
            </button>
          </label>

          {academy && push.enabled && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{lo ? 'ເວລາ (ເວລາລາວ)' : 'Time (Laos time)'}</p>
              <div className="grid grid-cols-3 gap-2">
                {SLOTS.map(slot => (
                  <button
                    key={slot.value}
                    type="button"
                    disabled={push.busy}
                    onClick={() => void changeSlot(slot.value)}
                    className={cn(
                      'rounded-xl px-2 py-2.5 text-xs font-bold transition-colors disabled:opacity-60',
                      push.slot === slot.value
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700',
                    )}
                  >
                    {lo ? slot.lo : slot.en}
                  </button>
                ))}
              </div>
            </div>
          )}

          {push.enabled && (
            <button
              type="button"
              onClick={() => void test()}
              disabled={push.busy}
              className={cn('text-xs font-bold hover:underline disabled:opacity-60', accent)}
            >
              {lo ? 'ສົ່ງການແຈ້ງເຕືອນທົດສອບ' : 'Send a test notification'}
            </button>
          )}
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {lo ? 'ການຕັ້ງຄ່ານີ້ໃຊ້ສະເພາະອຸປະກອນນີ້.' : 'This setting applies to this device only.'}
          </p>
        </div>
      )}
    </section>
  )
}
