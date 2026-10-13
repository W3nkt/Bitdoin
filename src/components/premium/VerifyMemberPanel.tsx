import { useState, type FormEvent } from 'react'
import { AlertTriangle, CheckCircle2, SearchCheck, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useLanguage } from '@/context/LanguageContext'
import { supabase } from '@/lib/supabase'
import { cn, formatDate } from '@/lib/utils'

// Staff check of a member code (BA-PRM-XXXXXX) quoted in a WhatsApp message.
// The code is an identifier, not a password: compare the name and WhatsApp
// number shown here with who actually sent the message.

interface Verification {
  found: boolean
  code?: string
  user_id?: string
  name?: string
  email?: string | null
  phone?: string | null
  whatsapp?: string | null
  member_code?: string
  entered_prefix?: string | null
  prefix?: string
  plan_name?: string | null
  status?: string | null
  ends_at?: string | null
  active?: boolean
  paid?: boolean
}

export function VerifyMemberPanel() {
  const { language } = useLanguage()
  const lo = language === 'lo'
  const [code, setCode] = useState('')
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<Verification | null>(null)
  const [failed, setFailed] = useState(false)

  async function verify(event: FormEvent) {
    event.preventDefault()
    if (!code.trim()) return
    setChecking(true)
    setFailed(false)
    try {
      const { data, error } = await supabase.rpc('verify_member_code', { p_code: code })
      if (error) throw error
      setResult(data as Verification)
    } catch (err) {
      console.error(err)
      setResult(null)
      setFailed(true)
    } finally {
      setChecking(false)
    }
  }

  const mismatch = result?.found && result.entered_prefix && result.entered_prefix !== result.prefix
  const tone = !result?.found ? 'bad' : mismatch ? 'warn' : result.paid ? 'good' : result.active ? 'warn' : 'bad'
  const headline = !result?.found
    ? (lo ? 'ບໍ່ພົບສະມາຊິກທີ່ໃຊ້ລະຫັດນີ້' : 'No member with this code')
    : mismatch
      ? (lo ? `ແຜນບໍ່ກົງກັນ: ລະຫັດທີ່ສົ່ງມາແມ່ນ ${result.entered_prefix}, ແຕ່ແຜນປັດຈຸບັນແມ່ນ ${result.prefix}` : `Plan mismatch: code says ${result.entered_prefix}, current plan is ${result.prefix}`)
      : result.paid
        ? (lo ? 'ສະມາຊິກພຣີມຽມທີ່ຍັງໃຊ້ງານຢູ່' : 'Active Premium member')
        : result.active
          ? (lo ? 'ສະມາຊິກແຜນຟຣີ (ບໍ່ແມ່ນພຣີມຽມ)' : 'Free plan member (not Premium)')
          : (lo ? 'ບໍ່ແມ່ນສະມາຊິກທີ່ຍັງໃຊ້ງານຢູ່' : 'Not an active member')

  return (
    <section className="rounded-3xl bg-white dark:bg-gray-900 p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-gray-950 dark:text-gray-100">{lo ? 'ກວດສອບສະມາຊິກ' : 'Verify member'}</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-gray-500 dark:text-gray-400">
            {lo
              ? 'ໃສ່ລະຫັດສະມາຊິກ ເຊັ່ນ BA-PRM-58JR23 ຈາກຂໍ້ຄວາມ WhatsApp. ໃຫ້ກວດຊື່ ແລະ ເບີ WhatsApp ວ່າກົງກັບຜູ້ສົ່ງ.'
              : 'Enter the member code from a WhatsApp message, e.g. BA-PRM-58JR23. Check that the name and WhatsApp number match the sender.'}
          </p>
        </div>
        <SearchCheck className="h-5 w-5 shrink-0 text-primary-600 dark:text-primary-400" />
      </div>

      <form onSubmit={verify} className="mt-4 flex gap-2">
        <input
          value={code}
          onChange={event => setCode(event.target.value)}
          placeholder="BA-PRM-XXXXXX"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 font-mono text-sm uppercase tracking-wide text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
        />
        <Button type="submit" loading={checking} disabled={!code.trim()}>
          {lo ? 'ກວດສອບ' : 'Verify'}
        </Button>
      </form>

      {failed && (
        <p role="alert" className="mt-3 text-sm font-bold text-red-600 dark:text-red-400">
          {lo ? 'ກວດສອບບໍ່ໄດ້. ກະລຸນາລອງໃໝ່.' : 'Could not verify. Please try again.'}
        </p>
      )}

      {result && (
        <div className={cn(
          'mt-4 rounded-2xl border p-4',
          tone === 'good' && 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10',
          tone === 'warn' && 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10',
          tone === 'bad' && 'border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10',
        )}>
          <p className={cn(
            'flex items-center gap-2 text-sm font-black',
            tone === 'good' && 'text-emerald-800 dark:text-emerald-300',
            tone === 'warn' && 'text-amber-800 dark:text-amber-300',
            tone === 'bad' && 'text-red-800 dark:text-red-300',
          )}>
            {tone === 'good' ? <CheckCircle2 className="h-4 w-4" /> : tone === 'warn' ? <AlertTriangle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {headline}
          </p>
          {result.found && (
            <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
              <Row label={lo ? 'ຊື່' : 'Name'} value={result.name} />
              <Row label={lo ? 'ລະຫັດປັດຈຸບັນ' : 'Current code'} value={result.member_code} mono />
              <Row label={lo ? 'ແຜນ' : 'Plan'} value={result.plan_name ?? (lo ? 'ບໍ່ມີ' : 'None')} />
              <Row
                label={lo ? 'ໃຊ້ໄດ້ຮອດ' : 'Active until'}
                value={result.ends_at ? formatDate(result.ends_at, language) : result.active ? (lo ? 'ບໍ່ມີກຳນົດ' : 'No end date') : '—'}
              />
              <Row label="WhatsApp" value={result.whatsapp || result.phone || '—'} />
              <Row label="Email" value={result.email || '—'} />
              <div className="sm:col-span-2">
                <Row label={lo ? 'ID ຜູ້ໃຊ້' : 'User ID'} value={result.user_id} mono />
              </div>
            </dl>
          )}
        </div>
      )}
    </section>
  )
}

function Row({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex min-w-0 gap-2">
      <dt className="shrink-0 text-gray-500 dark:text-gray-400">{label}:</dt>
      <dd className={cn('min-w-0 break-all font-bold text-gray-900 dark:text-gray-100', mono && 'font-mono')}>{value || '—'}</dd>
    </div>
  )
}
