// Alert wording for e-mails (migration 122). Admin-facing English, counts and
// job names only: never student names, IDs, scores or free text (NFR-017).

export interface AlertLike {
  kind: string
  details: Record<string, unknown>
}

const num = (value: unknown) => (typeof value === 'number' ? value.toLocaleString('en') : String(value ?? '—'))
const ms = (value: unknown) => (typeof value === 'number' ? `${value.toLocaleString('en')} ms` : 'no data')

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
    case 'test':
      return { subject: 'Test alert', lines: ['This is a test from the My Scores admin. Alerts reach this address.'] }
    default:
      return { subject: `Alert: ${alert.kind}`, lines: [] }
  }
}
