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

- Migration `125` (#45, Metrics tab). Until it is applied, the Metrics
  tab shows an error; nothing else depends on it.

Applied: migrations 120 and 121 and the `send-push` redeploy on 2026-10-24;
migrations 122, 123 and 124 on 2026-10-25, with `send-push` and the three
admin e-mail functions. **Database backup** is set up; its
first backup and drill passed on 2026-10-25
([backup-restore.md](backup-restore.md)).

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
