# Usage events (ANL-001, #44)

Usage events record how Schooling is used, for the #45 dashboards (PRD
§32). They are first-party: one database table,
`academic_usage_events`, written only through `academic_track_events`
(migration 124). The app side is `src/lib/academic/usageEvents.ts`.

## Rules (PRD §32.1)

- **No scores, names or free text.** Every property is a boolean, a whole
  number with a limit, or a value from a fixed list. The database refuses
  the whole batch if any event has an unknown name, an unknown property or
  a value outside its list or range. The catalogue is
  `academic_event_catalogue()`.
- **Pseudonymous.** Students are stored as a keyed hash of their account id
  (`academic_usage_pseudonym`; the salt is in `academic_private_settings`,
  readable only on the server). Grade and province are added by the
  database; the app cannot set them.
- **Consent-aware.** Events are kept only while the student's Schooling
  consent and the `usage_statistics` purpose are both active, and the
  module is switched on.
  - Agreeing to the privacy notice grants `usage_statistics` the first time
    only. The notice (version `2026-10-25`) names it, and students switch it
    off and on in My data.
  - Once switched off, re-agreeing to a later notice does not turn it back
    on.
  - When events are not kept, the server answers `tracking: false` and the
    app stops sending.
- **Before a profile exists**, only these events are kept, with no
  identifier, grade or province:
  - `module_landing_viewed`
  - `onboarding_started`
  - `onboarding_step_completed`

  The app sends them before creating the profile, and drops any it could not
  send, so they are never linked to the new profile.
- **Deletion and retention.** Deleting a profile deletes its events (trigger).
  Events older than 24 months are purged hourly.
- **Reporting** (#45) shows aggregates only, hides groups smaller than 20,
  and describes outcomes without causal claims.

## Common fields

| Field | From |
|---|---|
| `event_id` | App (UUID). Repeats are ignored, so retries are safe. |
| `occurred_at` | App clock. Replaced by server time if more than 5 minutes ahead or 7 days behind. |
| `pseudonym`, `role`, `grade_code`, `province_code` | Database |
| `locale` (`lo`/`en`), `platform` (`android`/`ios`/`desktop`/`other`), `app_version` (build date) | App |
| `plan` | Not recorded in Phase 1: paid access is out of scope. |

## Phase 1 events

| Event | Properties | Sent when |
|---|---|---|
| `module_session_started` | — | First event after 30 minutes without one (monthly active students). |
| `module_landing_viewed` | `source`: `academy_menu`, `profile_link`, `reminder`, `direct`, `other` | Schooling opens. `?from=` on the profile link and push reminders; any other in-app navigation counts as the Academy menu. |
| `onboarding_started` | — | Setup opens. |
| `onboarding_step_completed` | `step`, `duration_ms` | Each step: notice, age, details, subjects, goals. |
| `onboarding_completed` | `duration_ms`, `school_listed` | Profile created. |
| `profile_created` | `source`, plus `age_band` added by the server | Profile created. |
| `enrolment_transitioned` | `type`: `started`, `promoted`, `repeated`, `transferred`, `left` | New school year, transfer. |
| `score_entry_started` | `period` (stored as `2026-2027:monthly:2`), `method` | A period's form opens. |
| `score_draft_saved` | `lines_filled`, `offline` | Autosave, at most every 2 minutes. |
| `score_entry_submitted` | `period`, `lines_scored`, `lines_status_counts`, `duration_ms`, `method`, plus `first` added by the server | Submit succeeds. A submit queued offline and sent later is not counted. |
| `score_line_edited` | `reason_given` | Correction saved. |
| `dashboard_viewed` | `has_trend` | Dashboard loaded. |
| `chart_table_toggled` | `chart_id`: `trend`, `subjects`, `subject_detail` | Switched to the table view. |
| `history_viewed` | — | History opens. |
| `reminder_shown` / `reminder_clicked` | `code` | Reminder seen in the banner or inbox / "Add scores" tapped. |
| `export_requested`, `deletion_requested`, `deletion_cancelled` | — | Each succeeds. |

`feedback_submitted` (the usefulness rating) is not in Phase 1: there is no
rating prompt yet.

Adding an event takes three changes: the catalogue in a new migration, the
`UsageEvents` type, and the call site. The database tests
(`academic_usage_events.test.mjs`) and the browser checks cover validation,
consent and the absence of personal data.

## Querying

```sql
-- Onboarding completion this week, anonymous counts (PRD §32.2).
select count(*) filter (where name = 'onboarding_completed')::numeric
     / nullif(count(*) filter (where name = 'onboarding_started'), 0)
from academic_usage_events where occurred_at > now() - interval '7 days';
```
