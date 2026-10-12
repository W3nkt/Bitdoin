import { useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { ArrowDown, ArrowUp, CheckCircle2, MoreHorizontal, PlusSquare, Share, Smartphone } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import {
  canPromptInstall,
  iosBrowser,
  isIos,
  isIpad,
  isStandalone,
  promptInstall,
  subscribeInstallPrompt,
  wasJustInstalled,
} from '@/lib/installPrompt'
import { cn } from '@/lib/utils'

function useInstallState() {
  const canPrompt = useSyncExternalStore(subscribeInstallPrompt, canPromptInstall, () => false)
  const installed = useSyncExternalStore(subscribeInstallPrompt, wasJustInstalled, () => false)
  return { canPrompt, installed }
}

/**
 * "Add to Home Screen" button. One tap opens the browser's install dialog on
 * Chrome / Edge; on iPhone / iPad (no install API) it opens a short guide that
 * points at the Share button. Renders nothing once the app is installed or
 * when neither is possible.
 */
export function InstallAppButton({ lo, className }: { lo: boolean; className?: string }) {
  const toast = useToast()
  const { canPrompt, installed } = useInstallState()
  const [guideOpen, setGuideOpen] = useState(false)
  const ios = isIos()

  if (isStandalone()) return null
  if (installed) {
    return (
      <p className={cn('inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300', className)}>
        <CheckCircle2 className="h-4 w-4" />
        {lo ? 'ຕິດຕັ້ງແລ້ວ. ເປີດ Bitdoin ຈາກໜ້າຈໍໂຮມ.' : 'Installed. Open Bitdoin from your Home Screen.'}
      </p>
    )
  }
  if (!canPrompt && !ios) return null

  async function onClick() {
    if (canPrompt) {
      const outcome = await promptInstall()
      if (outcome === 'accepted') toast.success(lo ? 'ກຳລັງເພີ່ມ Bitdoin ໃສ່ໜ້າຈໍໂຮມ' : 'Adding Bitdoin to your Home Screen')
      return
    }
    setGuideOpen(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void onClick()}
        className={cn(
          'inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-amber-600 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2',
          className,
        )}
      >
        <PlusSquare className="h-4 w-4" />
        {lo ? 'ເພີ່ມໃສ່ໜ້າຈໍໂຮມ' : 'Add to Home Screen'}
      </button>
      {ios && <IosInstallGuide open={guideOpen} onClose={() => setGuideOpen(false)} lo={lo} />}
    </>
  )
}

/** Step-by-step Share → Add to Home Screen guide, with an arrow at the Share button. */
function IosInstallGuide({ open, onClose, lo }: { open: boolean; onClose: () => void; lo: boolean }) {
  const browser = iosBrowser()
  // Safari on iPhone keeps its toolbar at the bottom; iPad Safari and the
  // other iOS browsers put Share at the top right.
  const shareAtBottom = browser === 'safari' && !isIpad()

  const shareWhere = shareAtBottom
    ? (lo ? 'ຢູ່ລຸ່ມສຸດຂອງ Safari' : 'at the bottom of Safari')
    : browser === 'safari'
      ? (lo ? 'ຢູ່ເທິງຂວາຂອງ Safari' : 'at the top right of Safari')
      : (lo ? 'ຢູ່ແຖບທີ່ຢູ່ (ເທິງຂວາ)' : 'in the address bar (top right)')

  const steps = [
    {
      icon: <Share className="h-5 w-5" />,
      title: lo ? 'ກົດປຸ່ມແບ່ງປັນ' : 'Tap the Share button',
      detail: lo
        ? `${shareWhere}. ຖ້າບໍ່ເຫັນ, ກົດ ••• ກ່ອນ.`
        : `${shareWhere}. Don't see it? Tap ••• first.`,
    },
    {
      icon: <PlusSquare className="h-5 w-5" />,
      title: lo ? 'ເລືອກ "ເພີ່ມໃສ່ໜ້າຈໍໂຮມ"' : 'Choose "Add to Home Screen"',
      detail: lo ? 'ເລື່ອນລົງ ຫຼື ກົດ "ເພີ່ມເຕີມ" ຖ້າບໍ່ເຫັນ.' : 'Scroll down or tap "More" if you don\'t see it.',
    },
    {
      icon: <Smartphone className="h-5 w-5" />,
      title: lo ? 'ກົດ "ເພີ່ມ" ແລ້ວເປີດ Bitdoin ຈາກໜ້າຈໍໂຮມ' : 'Tap "Add", then open Bitdoin from your Home Screen',
      detail: lo ? 'ຈາກນັ້ນເປີດການແຈ້ງເຕືອນໃນໂປຣໄຟລ໌ໄດ້ເລີຍ.' : 'Then turn on notifications in your profile.',
    },
  ]

  return (
    <>
      <Modal open={open} onClose={onClose} title={lo ? 'ເພີ່ມ Bitdoin ໃສ່ໜ້າຈໍໂຮມ' : 'Add Bitdoin to your Home Screen'} size="sm">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {lo
            ? 'iPhone ຕ້ອງເພີ່ມດ້ວຍຕົນເອງ ໃຊ້ເວລາບໍ່ເຖິງ 10 ວິນາທີ:'
            : 'On iPhone this takes 3 quick taps:'}
        </p>
        <ol className="mt-4 space-y-3">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                {step.icon}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                  <span className="mr-1 text-amber-600 dark:text-amber-400">{index + 1}.</span>{step.title}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {index === 0 && <MoreHorizontal className="mr-1 inline h-3.5 w-3.5 align-text-bottom" />}
                  {step.detail}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-full bg-amber-500 py-3 text-sm font-black text-white transition hover:bg-amber-600"
        >
          {lo ? 'ເຂົ້າໃຈແລ້ວ' : 'Got it'}
        </button>
      </Modal>

      {/* Bouncing arrow toward where the browser's Share button is. */}
      {open && createPortal(
        <div
          aria-hidden
          className={cn(
            'pointer-events-none fixed z-[60] flex flex-col items-center gap-1 text-white',
            shareAtBottom ? 'bottom-2 left-1/2 -translate-x-1/2' : 'right-3 top-2',
          )}
        >
          {!shareAtBottom && <ArrowUp className="h-9 w-9 animate-bounce drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]" />}
          <span className="flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-xs font-black shadow-lg">
            <Share className="h-3.5 w-3.5" /> {lo ? 'ແບ່ງປັນ' : 'Share'}
          </span>
          {shareAtBottom && <ArrowDown className="h-9 w-9 animate-bounce drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]" />}
        </div>,
        document.body,
      )}
    </>
  )
}
