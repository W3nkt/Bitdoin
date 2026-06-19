import { createContext, useContext } from 'react'

interface AdminNotificationsContextValue {
  markSeen: (id: string) => void
}

export const AdminNotificationsContext = createContext<AdminNotificationsContextValue>({
  markSeen: () => {},
})

export function useMarkSeen() {
  return useContext(AdminNotificationsContext)
}
