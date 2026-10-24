import { useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { KeyRound, ShieldCheck, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { startMfaEnrolment, useMfaState, verifyMfaCode, type Enrolment } from '@/lib/academic/mfa'
import { Field } from './AdminKit'

/**
 * Shows its children only on an aal2 session (OD-13). Otherwise asks for a
 * code from the authenticator app, or sets one up first.
 */
export function MfaGate({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const mfa = useMfaState()
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (mfa.isPending) return <div className="space-y-3" aria-busy="true"><Skeleton className="h-40 w-full rounded-2xl" /></div>
  if (mfa.isError) {
    return (
      <Card icon={<KeyRound className="h-6 w-6" />} title="Could not check two-step verification">
        <p>{mfa.error instanceof Error ? mfa.error.message : 'Please try again.'}</p>
        <Button className="mt-4" variant="outline" onClick={() => void mfa.refetch()}>Try again</Button>
      </Card>
    )
  }
  if (!mfa.data.required || mfa.data.level === 'aal2') return <>{children}</>

  const factorId = enrolment?.factorId ?? mfa.data.factorId

  async function begin() {
    setBusy(true)
    setError(null)
    try {
      setEnrolment(await startMfaEnrolment())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start setup.')
    } finally {
      setBusy(false)
    }
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault()
    if (!factorId) return
    setBusy(true)
    setError(null)
    try {
      await verifyMfaCode(factorId, code.trim())
      setCode('')
      setEnrolment(null)
      // The session is aal2 now; reload everything with the new token.
      await queryClient.invalidateQueries({ queryKey: ['academic'] })
    } catch {
      setError('That code did not work. Check the time on your phone and try the newest code.')
    } finally {
      setBusy(false)
    }
  }

  const codeForm = (
    <form onSubmit={verify} className="mt-5 flex flex-wrap items-end gap-3">
      <Field label="6-digit code" className="w-44">
        <input className="w-full tracking-[0.3em]" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code}
          onChange={event => setCode(event.target.value.replace(/\D/g, ''))} aria-invalid={!!error} />
      </Field>
      <Button type="submit" loading={busy} disabled={code.length !== 6} icon={<ShieldCheck className="h-4 w-4" />}>Verify</Button>
      {error && <p role="alert" className="w-full text-sm font-bold text-red-700 dark:text-red-400">{error}</p>}
    </form>
  )

  if (factorId && !enrolment) {
    return (
      <Card icon={<ShieldCheck className="h-6 w-6" />} title="Confirm it's you">
        <p>Schooling admin and support need a code from your authenticator app each time you sign in.</p>
        {codeForm}
      </Card>
    )
  }

  if (enrolment) {
    return (
      <Card icon={<Smartphone className="h-6 w-6" />} title="Set up your authenticator app">
        <ol className="list-decimal space-y-1 pl-5">
          <li>Open an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…).</li>
          <li>Scan this QR code, or type the key below.</li>
          <li>Enter the 6-digit code the app shows.</li>
        </ol>
        <div className="mt-4 flex flex-wrap items-center gap-5">
          <img src={enrolment.qrCode} alt="QR code for your authenticator app" className="h-44 w-44 rounded-xl bg-white p-2 ring-1 ring-slate-200" />
          <div className="min-w-0">
            <p className="text-xs font-black text-slate-600 dark:text-slate-300">Setup key</p>
            <code className="mt-1 block break-all rounded-lg bg-slate-100 px-3 py-2 font-mono text-sm dark:bg-slate-800">{enrolment.secret}</code>
          </div>
        </div>
        {codeForm}
      </Card>
    )
  }

  return (
    <Card icon={<KeyRound className="h-6 w-6" />} title="Two-step verification required">
      <p>Schooling admin and support handle student data, so they need a code from an authenticator app on your phone as well as your password. Other Bitdoin admin pages are not affected.</p>
      <Button className="mt-5" loading={busy} onClick={() => void begin()} icon={<Smartphone className="h-4 w-4" />}>Set up authenticator app</Button>
      {error && <p role="alert" className="mt-3 text-sm font-bold text-red-700 dark:text-red-400">{error}</p>}
    </Card>
  )
}

function Card({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="mx-auto max-w-xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-700 sm:p-8">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">{icon}</span>
      <h2 className="mt-4 text-xl font-black">{title}</h2>
      <div className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{children}</div>
    </section>
  )
}
