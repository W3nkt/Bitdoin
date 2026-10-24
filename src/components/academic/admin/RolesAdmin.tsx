import { useState } from 'react'
import { Search, UserCog } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import { useSetUserRole, useStaffUsers, type BitdoinRole, type StaffUser } from '@/lib/academic/adminApi'
import { Empty, Field, Panel, Pill, adminErrorText } from './AdminKit'

// What each Bitdoin role can do in My Scores (OD-01b, PRD §28).
const ROLES: Record<BitdoinRole, { label: string; myScores: string }> = {
  ADMIN: { label: 'Admin', myScores: 'Configuration, roles, support lookup, emergency score access, full audit log and CSV export.' },
  OPERATIONS: { label: 'Operations (support)', myScores: 'Support lookup without scores; emergency score access with a reason, 30 minutes; sees only their own audit entries.' },
  FINANCE: { label: 'Finance', myScores: 'No My Scores access.' },
  CUSTOMER: { label: 'Customer / student', myScores: 'Their own scores only.' },
}

/** Grant and revoke roles, with a reason in the audit log (ADMIN-001). */
export function RolesAdmin() {
  const toast = useToast()
  const { profile } = useAuth()
  const [search, setSearch] = useState('')
  const users = useStaffUsers(search)
  const setRole = useSetUserRole()
  const [editing, setEditing] = useState<StaffUser | null>(null)
  const [role, setRoleChoice] = useState<BitdoinRole>('OPERATIONS')
  const [reason, setReason] = useState('')

  function open(user: StaffUser) {
    setEditing(user)
    setRoleChoice(user.role)
    setReason('')
  }

  return (
    <Panel
      title="Roles"
      description="Roles are shared with the rest of Bitdoin: changing one here also changes what the person can do on the Bookstore and Academy admin pages. Every change is audit-logged with your reason."
    >
      <div className="mb-4 grid gap-2 rounded-xl bg-slate-50 p-4 text-sm dark:bg-gray-800/60 sm:grid-cols-2">
        {(Object.keys(ROLES) as BitdoinRole[]).map(key => (
          <p key={key}><span className="font-black">{ROLES[key].label}:</span> <span className="text-slate-700 dark:text-slate-300">{ROLES[key].myScores}</span></p>
        ))}
      </div>

      <label className="mb-4 flex max-w-md items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-gray-900">
        <Search className="h-4 w-4 text-slate-500" />
        <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Find a person by name, email, phone or member code" aria-label="Find a person"
          className="w-full bg-transparent py-2.5 text-sm outline-none" />
      </label>
      <p className="mb-2 text-xs font-bold text-slate-500 dark:text-slate-400">{search.trim() ? 'Matching people' : 'Current staff'}</p>

      {users.isPending ? <Skeleton className="h-40 w-full rounded-xl" />
        : users.isError ? <Empty>{adminErrorText(users.error)}</Empty>
        : users.data.length === 0 ? <Empty>No one matches.</Empty>
        : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {users.data.map(user => (
              <li key={user.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-black">{user.name}</span>
                    <Pill tone={user.role === 'ADMIN' ? 'blue' : user.role === 'CUSTOMER' ? 'gray' : 'amber'}>{ROLES[user.role].label}</Pill>
                    {user.id === profile?.id && <Pill>You</Pill>}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-600 dark:text-slate-400">{[user.email, user.phone, user.member_code].filter(Boolean).join(' · ')}</p>
                </div>
                <Button size="sm" variant="outline" icon={<UserCog className="h-4 w-4" />} onClick={() => open(user)}>Change role</Button>
              </li>
            ))}
          </ul>
        )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Role for ${editing?.name ?? ''}`} size="lg">
        {editing && (
          <div className="grid gap-4">
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-xs font-black text-slate-600 dark:text-slate-300">Role</legend>
              {(Object.keys(ROLES) as BitdoinRole[]).map(key => (
                <label key={key} className="flex cursor-pointer items-start gap-3 rounded-xl p-3 ring-1 ring-slate-200 dark:ring-slate-700">
                  <input type="radio" name="role" className="mt-1" checked={role === key} onChange={() => setRoleChoice(key)} />
                  <span><span className="block text-sm font-black">{ROLES[key].label}</span><span className="block text-xs text-slate-600 dark:text-slate-400">{ROLES[key].myScores}</span></span>
                </label>
              ))}
            </fieldset>
            {editing.id === profile?.id && role !== 'ADMIN' && (
              <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">You are removing your own admin access.</p>
            )}
            <Field label="Reason (saved in the audit log)" hint="5–200 characters.">
              <textarea rows={2} maxLength={200} value={reason} onChange={event => setReason(event.target.value)} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button disabled={role === editing.role || reason.trim().length < 5} loading={setRole.isPending}
                onClick={() => setRole.mutate({ userId: editing.id, role, reason: reason.trim() }, {
                  onSuccess: () => { setEditing(null); toast.success(`${editing.name} is now ${ROLES[role].label}.`) },
                  onError: error => toast.error(adminErrorText(error)),
                })}>Save role</Button>
            </div>
          </div>
        )}
      </Modal>
    </Panel>
  )
}
