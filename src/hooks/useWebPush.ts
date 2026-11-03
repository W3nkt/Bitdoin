import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import {
  disablePush,
  enablePush,
  getDevicePushState,
  getPushSupport,
  nativePushAvailable,
  refreshPushSupport,
  sendTestPush,
  setAcademyReminderSlot,
  type DevicePushState,
  type PushTarget,
  type PushSupport,
  type ReminderSlot,
} from '@/lib/webPush'

export type PushActionError = 'denied' | 'failed'

/** This device's notification state for one platform, plus actions to change it. */
export function useWebPush(platform: PushTarget) {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [support, setSupport] = useState<PushSupport>(() => getPushSupport())
  const [busy, setBusy] = useState(false)
  const queryKey = ['web-push', 'device', profile?.id]

  const { data: device, isLoading } = useQuery({
    queryKey,
    enabled: Boolean(profile) && support === 'ready',
    queryFn: getDevicePushState,
    staleTime: 60_000,
  })

  // In the app the person may allow notifications in the phone's Settings and come back.
  useEffect(() => {
    if (!nativePushAvailable) return
    const recheck = () => {
      if (document.visibilityState === 'visible') void refreshPushSupport().then(setSupport)
    }
    recheck()
    document.addEventListener('visibilitychange', recheck)
    return () => document.removeEventListener('visibilitychange', recheck)
  }, [])

  const enabled = Boolean(
    platform === 'ACADEMY' ? device?.academy_enabled
      : platform === 'MY_SCORES' ? device?.my_scores_enabled
        : platform === 'ENGAGEMENT' ? device?.engagement_enabled
          : platform === 'WELLBEING' ? device?.wellbeing_enabled
            : device?.bookstore_enabled,
  )

  async function run(action: () => Promise<DevicePushState | null>): Promise<PushActionError | null> {
    setBusy(true)
    try {
      const state = await action()
      qc.setQueryData(queryKey, state)
      return null
    } catch (err) {
      console.error('[web-push]', err)
      setSupport(getPushSupport())
      return err instanceof Error && err.message === 'denied' ? 'denied' : 'failed'
    } finally {
      setBusy(false)
    }
  }

  return {
    support,
    loading: isLoading && support === 'ready',
    busy,
    enabled,
    slot: (device?.academy_slot ?? 'MORNING') as ReminderSlot,
    enable: (slot?: ReminderSlot) => run(() => enablePush(platform, slot)),
    disable: () => run(() => disablePush(platform)),
    setSlot: (slot: ReminderSlot) => run(() => setAcademyReminderSlot(slot)),
    sendTest: async () => {
      setBusy(true)
      try {
        const result = await sendTestPush(platform)
        return result.sent > 0
      } catch (err) {
        console.error('[web-push]', err)
        return false
      } finally {
        setBusy(false)
      }
    },
  }
}
