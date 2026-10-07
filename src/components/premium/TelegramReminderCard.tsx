import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BellRing, Check, Loader2, Send, Unlink } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

// Bot username from @BotFather, without "@". Hidden until configured.
const BOT_USERNAME = (import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined)?.replace(/^@/, '') ?? ''

/** Whether Telegram reminders are set up for this deployment. */
export const telegramRemindersAvailable = Boolean(BOT_USERNAME)

type Slot = 'MORNING' | 'AFTERNOON' | 'EVENING'

interface TelegramLink {
  chat_id: number | null
  telegram_username: string | null
  reminders_enabled: boolean
  reminder_slot: Slot
}

const SLOTS: Array<{ value: Slot; lo: string; en: string }> = [
  { value: 'MORNING', lo: 'ເຊົ້າ 07:30', en: 'Morning 7:30' },
  { value: 'AFTERNOON', lo: 'ບ່າຍ 12:30', en: 'Afternoon 12:30' },
  { value: 'EVENING', lo: 'ແລງ 19:30', en: 'Evening 19:30' },
]

/** Lets a member connect Telegram and choose when the daily reminder arrives. */
export function TelegramReminderCard({ lo }: { lo: boolean }) {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const { error } = useToast()
  const [connectUrl, setConnectUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const queryKey = ['academy', 'telegram-link', profile?.id]
  const sectionRef = useRef<HTMLElement>(null)

  // Opened from the profile menu's "Daily reminder on Telegram" link.
  useEffect(() => {
    if (window.location.hash === '#telegram') sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  const { data: link, isLoading } = useQuery({
    queryKey,
    enabled: Boolean(profile && BOT_USERNAME),
    queryFn: async () => {
      const { data, error: linkError } = await supabase
        .from('premium_telegram_links')
        .select('chat_id,telegram_username,reminders_enabled,reminder_slot')
        .eq('user_id', profile!.id)
        .maybeSingle()
      if (linkError) throw linkError
      return data as TelegramLink | null
    },
    // While the member is pressing Start in Telegram, watch for the link.
    refetchInterval: query => (connectUrl && !query.state.data?.chat_id ? 3000 : false),
  })

  const connected = Boolean(link?.chat_id)

  async function connect() {
    // Open the tab synchronously so pop-up blockers allow it, then point it at the bot.
    const tab = window.open('', '_blank')
    setBusy(true)
    try {
      const { data: token, error: tokenError } = await supabase.rpc('create_telegram_link_token')
      if (tokenError) throw tokenError
      const url = `https://t.me/${BOT_USERNAME}?start=${token}`
      setConnectUrl(url)
      if (tab) tab.location.href = url
      await qc.invalidateQueries({ queryKey })
    } catch (err) {
      tab?.close()
      console.error(err)
      error(lo ? 'ບໍ່ສາມາດເຊື່ອມຕໍ່ Telegram ໄດ້. ກະລຸນາລອງໃໝ່.' : 'Could not start the Telegram connection. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function saveSettings(enabled: boolean, slot: Slot) {
    setBusy(true)
    try {
      const { error: saveError } = await supabase.rpc('update_telegram_reminder_settings', { p_enabled: enabled, p_slot: slot })
      if (saveError) throw saveError
      await qc.invalidateQueries({ queryKey })
    } catch (err) {
      console.error(err)
      error(lo ? 'ບັນທຶກບໍ່ສຳເລັດ.' : 'Could not save your reminder settings.')
    } finally {
      setBusy(false)
    }
  }

  async function disconnect() {
    setBusy(true)
    try {
      const { error: disconnectError } = await supabase.rpc('disconnect_telegram')
      if (disconnectError) throw disconnectError
      setConnectUrl(null)
      await qc.invalidateQueries({ queryKey })
    } catch (err) {
      console.error(err)
      error(lo ? 'ຍົກເລີກການເຊື່ອມຕໍ່ບໍ່ສຳເລັດ.' : 'Could not disconnect Telegram.')
    } finally {
      setBusy(false)
    }
  }

  if (!BOT_USERNAME) return null

  return (
    <section id="telegram" ref={sectionRef} className="mt-8 scroll-mt-24 rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-900 p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#229ED9]/10 text-[#229ED9]">
          <Send className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-black">{lo ? 'ການແຈ້ງເຕືອນປະຈຳວັນທາງ Telegram' : 'Daily reminder on Telegram'}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {lo
              ? 'ຮັບຂໍ້ຄວາມສັ້ນໆທຸກມື້ ພ້ອມຄຳຄົມ ແລະ ຄວາມທ້າທາຍປະຈຳວັນ ເພື່ອຮັກສານິໄສການຮຽນ.'
              : 'Get one short message a day with the daily quote and challenge to keep your learning habit going.'}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-5 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
      ) : !connected ? (
        <div className="mt-5 space-y-3">
          <button
            type="button"
            onClick={() => void connect()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full bg-[#229ED9] px-5 py-3 text-sm font-black text-white transition hover:bg-[#1b8cc2] disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {lo ? 'ເຊື່ອມຕໍ່ Telegram' : 'Connect Telegram'}
          </button>
          {connectUrl && (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {lo ? 'ໃນ Telegram, ກົດ ' : 'In Telegram, press '}
              <b>Start</b>
              {lo ? '. ໜ້ານີ້ຈະອັບເດດເອງ. ' : '. This page updates by itself. '}
              <a href={connectUrl} target="_blank" rel="noreferrer" className="font-bold text-[#229ED9] hover:underline">
                {lo ? 'ເປີດ Telegram ອີກຄັ້ງ' : 'Open Telegram again'}
              </a>
            </p>
          )}
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <p className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-300">
            <Check className="h-4 w-4" />
            {lo ? 'ເຊື່ອມຕໍ່ແລ້ວ' : 'Connected'}{link?.telegram_username ? ` · @${link.telegram_username}` : ''}
          </p>

          <label className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-bold">
              <BellRing className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              {lo ? 'ສົ່ງການແຈ້ງເຕືອນທຸກມື້' : 'Send me a daily reminder'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={link?.reminders_enabled}
              disabled={busy}
              onClick={() => void saveSettings(!link?.reminders_enabled, link?.reminder_slot ?? 'MORNING')}
              className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60', link?.reminders_enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600')}
            >
              <span className={cn('absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform', link?.reminders_enabled ? 'translate-x-5' : 'translate-x-0')} />
            </button>
          </label>

          {link?.reminders_enabled && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{lo ? 'ເວລາ (ເວລາລາວ)' : 'Time (Laos time)'}</p>
              <div className="grid grid-cols-3 gap-2">
                {SLOTS.map(slot => (
                  <button
                    key={slot.value}
                    type="button"
                    disabled={busy}
                    onClick={() => void saveSettings(true, slot.value)}
                    className={cn(
                      'rounded-xl px-2 py-2.5 text-xs font-bold transition-colors disabled:opacity-60',
                      link.reminder_slot === slot.value
                        ? 'bg-[#229ED9] text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700',
                    )}
                  >
                    {lo ? slot.lo : slot.en}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => void disconnect()}
            disabled={busy}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
          >
            <Unlink className="h-3.5 w-3.5" /> {lo ? 'ຍົກເລີກການເຊື່ອມຕໍ່ Telegram' : 'Disconnect Telegram'}
          </button>
        </div>
      )}
    </section>
  )
}
