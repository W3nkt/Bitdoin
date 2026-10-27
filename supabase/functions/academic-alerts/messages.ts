// Alert wording for e-mails (migration 122). Admin-facing English, counts and
// job names only: never student names, IDs, scores or free text (NFR-017).

export interface AlertLike {
  kind: string
  details: Record<string, unknown>
}

const num = (value: unknown) => (typeof value === 'number' ? value.toLocaleString('en') : String(value ?? '—'))
const ms = (value: unknown) => (typeof value === 'number' ? `${value.toLocaleString('en')} ms` : 'no data')
const when = (value: unknown) => (typeof value === 'string' ? `${new Date(value).toISOString().slice(0, 16).replace('T', ' ')} UTC` : 'none yet')
const runLink = (value: unknown) => (typeof value === 'string' ? [`Workflow run: ${value}`] : [])

/** Subject and plain sentences for each alert kind. */
export function describeAlert(alert: AlertLike): { subject: string; lines: string[] } {
  const d = alert.details ?? {}
  switch (alert.kind) {
    case 'slo_latency':
      return {
        subject: 'Server response time above target',
        lines: [
          `Read p95: ${ms(d.read_p95_ms)} (target ${ms(d.read_target_ms)}).`,
          `Write p95: ${ms(d.write_p95_ms)} (target ${ms(d.write_target_ms)}).`,
          ...((Array.isArray(d.slowest) ? d.slowest : []) as Array<Record<string, unknown>>)
            .slice(0, 3).map(row => `Slowest: ${row.rpc} — p95 ${num(row.p95_ms)} ms over ${num(row.calls)} calls.`),
        ],
      }
    case 'slo_availability':
      return {
        subject: 'Availability below target',
        lines: [`${num(Number(d.availability) * 100)}% of calls succeeded in 24 hours (target ${num(Number(d.target) * 100)}%).`,
          `${num(d.server_errors)} server errors out of ${num(d.calls)} calls.`],
      }
    case 'slo_dashboard':
      return {
        subject: 'Dashboard loading slower than target',
        lines: [`75% of dashboards showed their summary within ${num(d.dashboard_p75_ms)} ms (target ${num(d.target_ms)} ms), over ${num(d.loads)} loads in 24 hours.`],
      }
    case 'job_failed':
      return { subject: `Scheduled job failed: ${d.job}`, lines: [`${d.job} failed ${num(d.failed_1h)} time(s) in the last hour.`] }
    case 'job_stale':
      return { subject: `Scheduled job not running: ${d.job}`, lines: [`${d.job} last ran at ${d.last_run}.`] }
    case 'push_backlog':
      return { subject: 'Push reminders not delivered', lines: [`${num(d.stuck)} push reminder(s) have waited more than 2 hours. Check the send-push function and VAPID keys.`] }
    case 'multi_profile_access':
      return {
        subject: 'Unusual access to student records',
        lines: [`A ${d.actor_role ?? 'user'} account opened ${num(d.profiles_24h)} students' records in 24 hours (threshold ${num(d.threshold)}). Review it on the Audit tab.`],
      }
    case 'access_denied_burst':
      return {
        subject: 'Many refused requests',
        lines: [`A ${d.actor_role ?? 'user'} account was refused ${num(d.denied_1h)} times in an hour (threshold ${num(d.threshold)}). Review it on the Audit tab.`],
      }
    case 'backup_failed':
      return {
        subject: 'Nightly database backup failed',
        lines: [`The latest backup did not complete. Last good backup: ${when(d.last_success)}.`, ...runLink(d.run_url)],
      }
    case 'backup_stale':
      return {
        subject: 'No database backup in the last 26 hours',
        lines: [`Last good backup: ${when(d.last_success)}. Check that the Database backup workflow is enabled in GitHub Actions (scheduled runs stop after 60 days without repository activity).`],
      }
    case 'drill_failed':
      return {
        subject: 'Weekly restore drill failed',
        lines: [`The latest backup could not be restored and checked. Last good drill: ${when(d.last_success)}. Until a drill passes, treat recent backups as unverified.`, ...runLink(d.run_url)],
      }
    case 'drill_stale':
      return {
        subject: 'No restore drill in the last 8 days',
        lines: [`Last good drill: ${when(d.last_success)}. Run the Database backup workflow with "drill".`],
      }
    case 'priority_report': {
      const category = ({ guardian_link: 'wrong guardian link', ai_answer: 'inappropriate AI answer', account_misuse: 'account misuse or impersonation' } as Record<string, string>)[String(d.category)] ?? String(d.category)
      return {
        subject: `Priority problem report: ${category}`,
        lines: [`A user reported a ${category} (PRIV-008). First response is due by ${when(d.first_response_due)}. Open it on the Reports tab.`],
      }
    }
    case 'career_review_due': {
      const first = Array.isArray(d.first) ? (d.first as unknown[]).map(String).join(', ') : ''
      return {
        subject: `Career content to review: ${num(d.due)}`,
        lines: [
          `${num(d.due)} published career, institution or programme record(s) reach their review-by date within 30 days; ${num(d.overdue)} are already past it and show "May be out of date" to students (UNI-002).`,
          ...(first ? [`First: ${first}.`] : []),
          'Check the sources and update the dates on the Careers tab.',
        ],
      }
    }
    case 'report_purchase':
      return {
        subject: 'Career report payment to check',
        lines: ['A student or parent sent a receipt for the one-time career report (BILLING-004). Check it and verify or reject it on the Entitlements tab. Further receipts today do not send another e-mail.'],
      }
    case 'test':
      return { subject: 'Test alert', lines: ['This is a test from the My Scores admin. Alerts reach this address.'] }
    default:
      return { subject: `Alert: ${alert.kind}`, lines: [] }
  }
}
