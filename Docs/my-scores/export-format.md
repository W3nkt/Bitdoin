# My Scores — data export format (PRIV-004)

`academic_export_my_data()` returns one JSON document (`format_version: 1`) holding everything the
module stores about the signed-in student. The privacy screen (FE-006) turns it into these files:

| File | Source key | Contents |
|------|-----------|----------|
| `profile.json` | `profile` | Display name, age band, province/district, goals, interests, consent state, status, timestamps. |
| `enrolments.json` | `enrolments` | One object per school year: year code, grade, school (catalogue name or the text the student typed), verification, grading scale and version, period range, repeat flag, state, closed reason, and the subjects with their start/end periods. |
| `scores.csv` | `scores` | One row per current score line: `academic_year, grade, period, period_type, period_start, subject_code, subject, status, raw_value, ordinal_code, grading_scale, normalised_value, source, verification, entry_state, submitted_at, edited, score_line_id`. Scores keep their original scale; `normalised_value` is set only for convertible scales. |
| `revisions.csv` | `revisions` | One row per correction: `score_line_id, old_value, new_value, old_status, new_status, changed_by, reason, changed_at`. |
| `consents.json` | `consents` | Every consent record: purpose, notice version, method, granted and withdrawn times. |
| `reports.json` | `academic_export_my_reports().reports` | Every "Report a problem" report the user sent (migration 133): category, screen, description, status, sent and resolved times. Reports are support records: deleting the Schooling profile unlinks them but keeps them with the Bitdoin account. |
| `quizzes.json` | `academic_export_my_quizzes().attempts` | One object per diagnostic quiz attempt (migration 132): quiz title, status, start and finish times, topic results (correct, total, band) and every answer (question, chosen option, and the correct option once finished). |

Every export writes a `privacy.export` audit event. Export works while the module is switched off.

## Deletion (PRIV-005)

- `academic_request_deletion('scores' | 'profile')` requires a sign-in within the last 15 minutes (JWT `amr` timestamp) and starts a 14-day grace period. `academic_cancel_deletion()` stops it.
- The `academic-purge-deletions` cron job (daily, 03:15 Vientiane) then deletes:
  - `scores`: every score entry, line and revision, and every diagnostic quiz attempt and answer. The profile and enrolments stay.
  - `profile`: the profile and everything under it (enrolments, subjects, scores, revisions, review tasks).
- Retained in minimised form: consent records (profile link removed; life of profile + 5 years pending counsel, OD-16) and audit events (IDs only, 24 months).
- **Open (OD-16):** Supabase backups and point-in-time recovery keep deleted rows until they rotate out. PRIV-005 asks for removal "within 30 days including backups rotation", so the project's backup retention must be confirmed as 30 days or less.
