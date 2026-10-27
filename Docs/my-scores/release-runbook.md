# My Scores — release and rollback runbook (OPS-001, #41)

How My Scores reaches production, how it is switched on and off, and how each
part is rolled back. The module lives in the main app and the main Supabase
project (OD-01), so it uses the same pipeline as the rest of Bitdoin.

## Pipeline

| Workflow | When | What it does |
|---|---|---|
| `ci.yml` | Every pull request and branch push; called by `deploy.yml` | Type-check, lint, database tests (all migrations on PGlite, including the forward → rollback → forward rehearsal), and the My Scores browser checks: 20 student and 10 admin scenarios against a mocked Supabase. Screenshots are uploaded as the `my-scores-screenshots` artifact. |
| `deploy.yml` | Push to `main`, or manual | Runs `ci.yml` first, then builds and deploys the frontend to GitHub Pages. Manual runs accept `ref` (deploy an older commit) and `skip_checks` (emergency only). |
| `supabase.yml` | Manual only | Database tests, then `supabase db push` and `supabase functions deploy` for one environment. **Dry run by default**: it lists pending migrations and changes nothing unless "Apply" is ticked. |

Local equivalents: `npm run test:db`, `npm run test:e2e` (builds `dist-qa` with a
mocked Supabase, serves it and runs both browser suites).

## One-time GitHub setup

1. **Settings → Environments**: create `production` (add yourself as a required
   reviewer) and, once a staging project exists, `staging`.
2. In each environment add:
   - secret `SUPABASE_ACCESS_TOKEN`: a personal access token from
     supabase.com/dashboard/account/tokens
   - secret `SUPABASE_DB_PASSWORD`: that project's database password
   - variable `SUPABASE_PROJECT_REF`: production is `bzyvzftnfuuxcseuqrnj`
3. The existing Pages variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
   `VITE_VAPID_PUBLIC_KEY`, …) are unchanged.

## Environments

| | Production | Staging |
|---|---|---|
| Supabase project | `bzyvzftnfuuxcseuqrnj` | Not created yet. Until it exists, CI's PGlite run is the migration and rollback rehearsal. |
| Frontend | GitHub Pages from `main` | Local `npm run test:e2e` / `vite preview` |
| Module flag | `my_scores_enabled = true` (on since 2026-10-23) | Any |
| Admin MFA | `admin_mfa_required = true` | May be `false` for testing |

Migration history check (2026-10-24): production's `supabase_migrations.schema_migrations`
lists every local migration up to `119`, so `supabase db push` would apply only `120`.

## Release order

1. Merge to `main` only when CI is green.
2. Run **Supabase migrations and functions** → `production`, dry run. Read the
   pending list.
3. Run it again with **Apply** ticked, and the functions that changed (for
   example `send-push`). Migrations come first because the frontend may rely on
   them; frontend code that reads new columns tolerates their absence
   (for example `getDevicePushState` selects `*`).
4. Push or re-run **Deploy Bitdoin to GitHub Pages**.
5. Smoke test: open `/academy/scores` as a student, `/academy-admin/scores` as an
   admin.

### Pending right now

- Nothing pending.

Applied 2026-10-26 (#51, locks **off**): 141 (entitlement service, monthly quotas, manual grants
with reason codes; scans now take from the `ocr_upload` quota and get it back on failure). Nothing
changes for students: `entitlements_enforced` is false, and the free scan allowance stays 10.
Then 142 (premium gates: dashboard detail, This week top 1, one diagnostic per subject each term) and
the screens that explain a lock, the "Your plan" card and the Premium-ending notice. Still no change
while locks are off. The admin page has an **Entitlements** tab for ADMIN and FINANCE (look up by member
code, grant or revoke with a reason code; a confirmed transfer needs its reference).

Applied 2026-10-26 (#54): 143 (study planner: goals, plan, weekly tasks), then the Planner screen
(`/academy/scores/planner`, linked from the dashboard). Lao strings in `plannerCopy.ts` need the
owner's review. Free students can set one goal; weekly plans need Premium (locks are on).
Planner Lao strings approved by the owner. Then 144 (OD-09: opt-in Academy XP for finished tasks, 10 XP
once per task, never taken back).

Applied 2026-10-26 (#53): 145 (Coach academic mode: data, prompts, quota, breaker, cache, feedback,
review), `premium-coach` redeployed with `academic-mode.ts`, then `coach_academic_enabled` set to
`true` at the owner's request. Help numbers confirmed by the owner (OD-15). To switch the mode off:
`update academic_settings set value = 'false' where key = 'coach_academic_enabled';`
To roll a prompt back: `update academic_prompt_templates set active = false where prompt_id = 'academic_chat';`
then `update academic_prompt_templates set active = true where prompt_id = 'academic_chat' and version = '<previous>';`

Applied 2026-10-26 (#53, COACH-DESIGN approved): 146 (the `coach_review` consent, weekly reviewer
sample, review results by prompt version) and 147 (chat prompt 1.1.0, **inactive**), then
`premium-coach` redeployed with the fixes from the first evaluation runs: Thai-letter retry, Lao word
guide, `more_months_needed`, wider safety layer, English name guard, study advice not treated as
invented scores. With prompt 1.0.0 and the new code, a live run had 2 red-team disclosures (both
Lao) and no Thai letters. 1.1.0 had 0 disclosures in two runs. Switching it on waits for the
owner: either the native raters' sheet, or the owner's go-ahead. To switch it on:
`update academic_prompt_templates set active = false where prompt_id = 'academic_chat';`
`update academic_prompt_templates set active = true where prompt_id = 'academic_chat' and version = '1.1.0';`

Applied 2026-10-26 (#55, piece 1): 148 (career catalogue: working and published copies, four-eyes
publication, sourced and dated facts, weekly review-by alert) and 149 (seed waiting for review: 19
careers, 5 institutions). The admin page has a **Careers** tab (Admin only). Nothing reaches
students until it is approved, and the approver must be a different admin from whoever wrote or last
edited it. The seed was prepared by Claude, so one admin can check and approve each seeded record.

Switched on 2026-10-26 at the owner's request: chat prompt **1.1.0** is active (1.0.0 kept for rollback),
and `scripts/coach-eval/baseline.json` holds the 1.1.0 run.

Applied 2026-10-26 (#55, piece 2): 150 (career questionnaire, options with reasons, shortlist, what
changed; "Download my data" gains planner.json, coach.json and careers.json). Students reach it from
the dashboard ("Career guidance"). Options appear once career records are approved on the Careers tab.

Applied 2026-10-26: 151 (career options need Academy Premium, feature `career_options`), then the
19 careers and 5 institutions published at the owner's request (CAREER-PUBLISH).

Applied 2026-10-26 (#52, piece 1): 152 (guardian invites, two-sided confirmation, scopes, removal,
support suspension and admin reinstatement, guardian consent for ages 13–15, re-confirmation at 18,
daily job at 02:40 Vientiane time). Students manage guardians in My data; guardians use /academy/family.
No 13–15 profiles existed when it was applied.

Applied 2026-10-27 (#52, piece 2): 153 (the guardian's view of each child at /academy/family/<link>,
only what the child shares, with supportive suggestions; every view audit-logged).

Applied 2026-10-27 (#52, piece 3a): 154 (3-day correction window for guardians, limits of 4 guardians
and 6 children, monthly guardian reports written daily at 06:10 Vientiane time for Premium accounts).

Applied 2026-10-27 (#55, piece 3): 155 (programme field and search, scholarships with verified deadlines,
saved scholarships and reminders daily at 08:20 Vientiane time; fix: missing dates are refused by the
catalogue's checks). Admins add programmes and scholarships on the Careers tab.

Applied 2026-10-27: 156 (106 draft programmes from official sources; each needs its length added on the Careers tab before review).

### Changing the Coach's model or prompt (AI-010, QG-5)

No new model (`QWEN_ACADEMIC_MODEL`) or prompt version goes live without a passing evaluation:

1. Add the new prompt version in a migration with `active = false` (or keep it in a file and pass
   `--prompt-file`).
2. `npm run eval:coach -- --live --prompt academic_chat@<version> [--model <model>]`. It writes
   `qa-artifacts/coach-eval/<run>/` with `report.md`, `results.json` and `ratings.csv`.
3. Two native Lao speakers fill in `ratings.csv` (accuracy, simplicity, tone, terminology, 1 to 5),
   then `npm run eval:coach -- --replay <run dir> --gate`. The report compares the run with
   `scripts/coach-eval/baseline.json` (production).
4. Release only if it says **Release: allowed**. Read the red-team answers it lists. Then switch the
   version on with the two statements above, and replace `baseline.json` with the new run's
   metrics.

The weekly reviewer sample (ADMIN-009, migration 146) runs on Mondays at 01:30 Vientiane time. The
**AI review** tab shows average reviewer ratings by prompt version. Use them alongside the raters'
sheet.

### Switching premium locks on (P3-BIL #51)

**Done 2026-10-26:** prices and the Free tier approved by the owner as configured (scans 10 / 20,
AI Coach 10 / 300), Lao strings approved, the plans page lists what each plan gives in Schooling
(commit 3490222), and `entitlements_enforced` set to `true` in the SQL editor. At switch-on: 3
student profiles, 1 Premium (everything open), 2 Free (summary view). Mention it in the weekly
pilot report. To switch off again: `update academic_settings set value = 'false' where key = 'entitlements_enforced';`


1. Owner decides prices and what Free includes (OD-11); edit `entitlement_features` (configuration only).
2. Owner review of the Lao strings in `src/lib/academic/entitlementCopy.ts`.
3. Update the Academy subscription page so it lists what Premium adds in Schooling (PRD §30.2).
4. Set `entitlements_enforced` to `true`; tell pilot students first in the weekly report.

Applied 2026-10-26 (#48, scanning **off**): 139 and the `academic-ocr` Edge Function
(`verify_jwt = false`; it checks the student session itself), commit f1c15a3; the scan screens
(a2e363c); then 140 (photo list, photos deleted when photo-processing consent is withdrawn, the
OCR quality view, a fix that keeps "Keep my photo" on, and the hourly `academic-ocr-purge` cron job).
Nothing changes for students until OCR is switched on.

Applied: migrations 120 and 121 and the `send-push` redeploy on 2026-10-24;
migrations 122–127 on 2026-10-25, with `send-push` and the three admin
e-mail functions; migration 128 (pilot, gate off) on 2026-10-25. **Database backup** is set up; its
first backup and drill passed on 2026-10-25
([backup-restore.md](backup-restore.md)).

Applied 2026-10-25 (Phase 2, #49 and #50; commit 2ec6ce5):
- 129–132 (engine v2, insights switch, item bank, diagnostic quizzes with
  parallel forms and retakes), then 133–137 with `supabase db push`
  ("Report a problem", insights **on**, content catalogue, next-actions engine,
  practice sets). `academic-alerts` redeployed for priority-report e-mails.
- From this date pilot students see labels, trends, explanations, diagnostic
  quizzes, the **This week** card and practice sets: note it in the weekly
  pilot report. Quizzes and practice need approved items, diagnostics and
  catalogue entries before students see them.
- Check: production lists 129–137, `insights_enabled = true`, no
  `academic_*` function callable by `anon`.

Applied 2026-10-26: 138 (feedback on next actions and repetition control,
LEARN-005) with `supabase db push`, before the frontend with the Done / Not now /
Not helpful buttons; Lao strings approved by the owner.

### Switching score-book scanning on (P2-OCR #48)

In this order; until then `ocr_enabled` stays `false`:
1. Vendor assessment for DashScope (no training on inputs, retention, Singapore region) recorded in the processing register (PRIV-006).
2. QG-3 passed on the #9 hold-out set with `npm run eval:ocr -- <dir>` (scripts/ocr-eval.mjs; label format in its header): numeric accuracy >= 90% on clear photos, silent errors <= 2%, flag recall >= 98%.
3. A privacy-notice version naming the provider and region (counsel). Deploy the matching English and Lao `notice.full` text in `src/lib/academic/copy.ts`, then publish that version as `consent_notice_version`. The full notice reuses the approved OCR consent wording from `ocrCopy.ts`.
4. Owner review of the Lao scan strings (`src/lib/academic/ocrCopy.ts`), including the consent text.
5. Add `ocr_processing` to `consent_purposes_enabled`, then set `ocr_enabled` to `true`.
6. Check the hourly purge runs: `select status, return_message from cron.job_run_details d join cron.job j using (jobid) where j.jobname = 'academic-ocr-purge' order by start_time desc limit 3`.
7. Watch **Scan quality** in the admin daily for the first two weeks (alerts: corrections > 15% or failures > 20% over 7 days).

For step 5, use [`enable_academic_ocr.sql`](../../supabase/scripts/enable_academic_ocr.sql).
It is configured for notice version `2026-10-26` and checks that this version
is already published. It preserves the other consent
purposes, and enables both settings in one transaction. It does not certify
the vendor assessment, quality gate, or counsel approval.

Owner confirmations received 2026-10-26: the OCR notice is reviewed and
approved, and both the DashScope vendor assessment and QG-3 evaluation have
passed. These confirmations were supplied by the owner; the underlying
assessment and evaluation reports were not inspected in this session.

## Feature flag

The module is switched on and off in the database, without a deploy. Run in the
Supabase SQL editor:

```sql
-- Off: students see "My Scores is coming soon"; reminders stop; nothing is deleted.
update public.academic_settings set value = 'false' where key = 'my_scores_enabled';
-- On:
update public.academic_settings set value = 'true' where key = 'my_scores_enabled';
```

Privacy actions (export, consent withdrawal, deletion) keep working while the
module is off (PRIV-003..005). Other switches in the same table:
`admin_mfa_required`, `scale_four_eyes_required`, `break_glass_minutes`,
`score_reminders`, `notification_quiet_hours`, `push_caps`, `rate_limits`.

Subject labels, trends and diagnostic quizzes (Phase 2, #49) have their own
switch, on from migration 134. The owner approved the Lao strings, the
explanation templates (ANALYSIS-004) and the decisions on 2026-10-25, including
§20.5 as written (a steady rise with SD ≥ 1.0 reads as "volatile", golden case L11).

```sql
-- On: "Compared with your own average" card and "What your scores show" appear.
update public.academic_settings set value = 'true' where key = 'insights_enabled';
-- Off again: the dashboard stops returning labels and trends; snapshots keep them.
update public.academic_settings set value = 'false' where key = 'insights_enabled';
```

## Monitoring (OPS-002, migration 122)

Admin → My Scores → **Health** (ADMIN only) shows four service levels with a
Met / Missed verdict, 48-hour charts (each with a table view), the scheduled
jobs and the alert e-mail status.

| Target | Source | Window |
|---|---|---|
| Availability ≥ 99.5% (NFR-005) | App reports of every My Scores call: server errors (5xx, timeouts) ÷ calls. Offline and 4xx answers are not counted against it. | 30 days on the tile, 24 h for alerts |
| Reads p95 ≤ 300 ms, writes p95 ≤ 500 ms (NFR-002) | `pg_stat_statements`, sampled every 5 minutes; p95 estimated as mean + 1.645 × sd per window. Server time only. | Last hour |
| Dashboard summary p75 ≤ 2.5 s (NFR-001) | Students' devices: first load from navigation start, later visits from opening the screen. | 24 h |

Nothing personal is recorded (NFR-017): RPC names, durations and status
classes only; `academic_record_metrics` refuses any other field. Metrics are
kept 90 days.

**Alerts** (hourly check, one per kind a day) for missed targets, failed or
late jobs and push reminders stuck for 2 hours, plus the existing
suspicious-access alerts. Each is e-mailed to the on-call address within
5 minutes by the `academic-alerts` Edge Function (Resend). The address is in
`academic_private_settings` (`alert_email`, default `bitdoin0@gmail.com`):

```sql
update public.academic_private_settings set value = 'someone@example.com' where key = 'alert_email';
```

"Send test alert" on the Health tab proves the path end to end. If it fails,
the error shows on the tab: with Resend's shared sender
(`onboarding@resend.dev`) mail only reaches the Resend account's own address,
so set `FROM_EMAIL` to a verified domain sender or use that address. Optional
secret `ADMIN_APP_URL` adds a link to the Health tab in each e-mail.

Targets live in `academic_settings` → `slo_targets`.

The tab's **Backups** panel and the backup and drill alerts (migration 123)
are covered in [backup-restore.md](backup-restore.md).

## Rollback, fastest first

1. **Switch the module off** (above). Instant, no data loss. Use this first for
   any student-facing problem.
2. **Frontend**: Actions → *Deploy Bitdoin to GitHub Pages* → *Run workflow*,
   `ref` = the last good commit SHA. Tick `skip_checks` only if that commit is
   older than this CI setup (it has no `test:e2e` script).
3. **Edge Function**: deploy the old version from a separate worktree, so your
   working copy is untouched:
   ```sh
   git worktree add ../bitdoin-rollback <good-sha>
   cd ../bitdoin-rollback && supabase functions deploy send-push --project-ref bzyvzftnfuuxcseuqrnj
   cd - && git worktree remove ../bitdoin-rollback
   ```
4. **Database**: production is forward-only. Undo a change with a new migration
   that reverses it, released through the same workflow.
   `supabase/scripts/academic_module_rollback.sql` removes the whole module and
   its data; it is for staging only, never production.

## Rehearsal record

| Date | What | Result |
|---|---|---|
| 2026-10-24 | All academic migrations forward, re-run (idempotent), full rollback, forward again (`academic_rollback.test.mjs`, PGlite) | Passed; part of every CI run from now on |
| 2026-10-24 | Workflows checked with actionlint 1.7.7 | No findings |
| 2026-10-24 | `npm run test:e2e` locally: 20 student + 10 admin scenarios | Passed |
| 2026-10-24 | `supabase.yml` against production: migration 120 and `send-push`, then migration 121 (Apply) | Passed; changes verified read-only afterwards |
| 2026-10-24 | Module flag off and on again in production (SQL editor); `/academy/scores` showed "coming soon", then worked | Passed; flag confirmed `true` afterwards |
