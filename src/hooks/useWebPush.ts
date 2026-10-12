import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import {
  disablePush,
  enablePush,
  getDevicePushState,
  getPushSupport,
  sendTestPush,
  setAcademyReminderSlot,
  type DevicePushState,
  type PushPlatform,
  type PushSupport,
  type ReminderSlot,
} from '@/lib/webPush'

export type PushActionError = 'denied' | 'failed'

/** This device's notification state for one platform, plus actions to change it. */
export function useWebPush(platform: PushPlatform) {
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

  const enabled = platform === 'ACADEMY' ? Boolean(device?.academy_enabled) : Boolean(device?.bookstore_enabled)

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
