# Backup and restore (OPS-003, #43)

Targets (NFR-018/019): bring the service back within **4 hours** (RTO), and
lose at most **24 hours** of data with daily backups, or 15 minutes with
point-in-time recovery (RPO).

## Verified capability and cost (2026-10-25)

| | Finding |
|---|---|
| Plan | Organisation `BookStore`: **Free**. Project `bzyvzftnfuuxcseuqrnj`, ap-southeast-1, Postgres 17.6. |
| Supabase backups | **None.** Daily backups start on Pro (7 days kept). Point-in-time recovery is a Pro add-on and needs at least Small compute. Write-ahead logs are archived on the server, but Free plan projects cannot restore from them. |
| Size | Database 67 MB, of which My Scores is 1.4 MB. Storage: 7 buckets, about 147 MB. |
| Options | Pro, $25/month: daily backups, RPO 24 h, restore from the dashboard. Pro + Small compute + 7-day PITR: about $130/month, RPO about 2 minutes. **Own nightly backup: free, RPO 24 h. This is the chosen option** (decision register OPS-003). |

So the RPO target is met with daily backups (≤ 24 h); the 15-minute option
would need PITR.

## What runs

**Database backup** workflow (`.github/workflows/backup.yml`):

| Job | When | Does |
|---|---|---|
| Nightly backup | 02:30 Vientiane | Dumps the whole database (`scripts/backup/dump.sh`): roles, schema, data (all schemas, including sign-in accounts and Storage metadata), migration history, and the 12 pg_cron jobs as `cron.schedule()` calls (pg_dump leaves these out). It writes `manifest.json` with each table's row count and checksums, encrypts everything with [age](https://age-encryption.org) and uploads it as a 30-day artifact. |
| Restore drill | Monday 03:30 Vientiane | Downloads the latest backup, decrypts it, starts an **empty** Supabase stack, restores (`restore.sh`) and checks it (`verify.mjs`). |

The drill checks:

- every table's row count against the manifest;
- the latest migration;
- the module's table, function and policy counts;
- row-level security on every module table;
- that signed-in users can call exactly the backed-up number of module functions (49 today), and signed-out users none;
- the cron jobs.

Run either job by hand from Actions → **Database backup** → *Run workflow*.

Both jobs report to production (`academic_record_backup_run`, migration 123):

- **Health tab, Backups panel:** last success, 30-day counts, size, recovery time and differences found, with a link to the run.
- **Hourly check:** e-mails an alert on these conditions.

| Alert | When |
|---|---|
| `backup_failed` / `drill_failed` | The latest run failed. |
| `backup_stale` | No successful backup for 26 hours. |
| `drill_stale` | No successful drill for 8 days. |

GitHub pauses scheduled workflows after 60 days without repository activity;
`backup_stale` is what catches that.

### What is not in the backup

- **Storage files** (receipts, payment proofs, avatars, book covers: about
  147 MB). Their database rows are backed up, but the files are not. My
  Scores stores no files. This is a gap for the rest of Bitdoin.
- Things re-entered by hand after a restore. Edge Function secrets
  (`RESEND_API_KEY`, VAPID keys and the others). Auth settings: site URL,
  redirect URLs, SMTP and sign-in providers. Edge Function code is in git.
- Passwords of custom database roles. None are used.

## Keys and where backups live

- Backups are artifacts of the **public** GitHub repository. Anyone signed in
  to GitHub can download them, so **only the encrypted file is ever
  uploaded**. Logs show counts and table names only, never rows.
- Encryption: age (X25519). The nightly job needs only the public key
  (`BACKUP_AGE_RECIPIENT`, a variable). The secret key (`BACKUP_AGE_KEY`) is
  a secret used by the drill.
- **Keep an offline copy of the secret key** in a password manager. Without
  it no backup can be read; with it, every backup can. If it leaks, generate
  a new pair, replace both values, and delete the old artifacts.

## One-time setup

1. Settings → Environments → **backup**: deployment branches `main` only,
   with **no required reviewers**, so the schedule runs unattended.
2. Add these secrets to `backup`:
   - `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD`: the same values as
     the `production` environment.
   - `BACKUP_AGE_KEY`: the secret key.
3. Add these variables to `backup`:
   - `SUPABASE_PROJECT_REF` = `bzyvzftnfuuxcseuqrnj`
   - `BACKUP_AGE_RECIPIENT`: the public key.
4. To make a key pair, run either `age-keygen -o bitdoin-backup.key`
   (`winget install FiloSottile.age`) or
   `docker run --rm alpine:3.20 sh -c "apk add -q age && age-keygen"`. The
   `# public key: age1…` line is the recipient.
5. Apply migration 123. Then run the workflow with *backup and drill*. The
   Health tab should show both runs as Met.

## Restoring for real

Use a **new** project: a restore needs an empty database.

| Step | How | Estimate |
|---|---|---|
| 1. New project | Same region (ap-southeast-1). Note its ref and database password. | 5 min |
| 2. Get the backup | Actions → latest successful *Database backup* run → artifact `db-backup-…`. Then run `age -d -i bitdoin-backup.key db-backup.tar.gz.age \| tar -xzf - -C restore`. | 5 min |
| 3. Restore | `bash scripts/backup/restore.sh restore --db-url "<new project session pooler URL>" --project-ref bzyvzftnfuuxcseuqrnj <new-ref>`. This rewrites the cron jobs' function URLs to the new project. | minutes (drill time) |
| 4. Check | `node scripts/backup/verify.mjs restore -- docker run --rm -i --network host postgres:17 psql "<url>"` must print OK. | 1 min |
| 5. Functions | Run *Supabase migrations and functions* against the new ref (dry run first: nothing should be pending) with every function name. Re-enter the function secrets. | 20 min |
| 6. Auth | Site URL, redirect URLs, SMTP, sign-in providers, as in the old project. Users keep their passwords but must sign in again (new JWT secret). | 20 min |
| 7. Point the app | Update `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in GitHub secrets, then re-run *Deploy Bitdoin to GitHub Pages*. | 10 min |
| 8. Smoke test | Student `/academy/scores`, admin Health tab, test alert. | 15 min |

Total about **1.5–2 hours** from the decision to restore, within the 4-hour
target. Data loss is everything after the last nightly backup: at most about
24 hours, plus up to an hour of GitHub schedule delay.

**Do not** rebuild from `supabase/migrations`. Migrations 059 and 108 need
production content and fail on an empty database, so only a dump restores the
service.

## Drill by hand (local)

The local drill needs Docker, the Supabase CLI, age and node:

```bash
bash scripts/backup/drill.sh db-backup.tar.gz.age bitdoin-backup.key /tmp/drill   # KEEP_STACK=1 to look around
```

The drill uses ports 563xx and removes its stack afterwards. Only run it on a
machine allowed to hold student data, because the decrypted copy is real
production data.

## Rehearsal record

**2026-10-25, local, synthetic data.**

- Source: all 123 migrations (059 and 108 skipped, see above), 5 synthetic
  accounts and the reference data. No production rows left Supabase.
- Results:
  - dump 21 s;
  - encrypted size 0.57 MB;
  - decrypt 2 s, empty stack 45 s, restore 2 s, verify 1 s;
  - 129 tables and 1,100 rows identical, migration 123, 12 cron jobs restored paused;
  - grants identical (49 signed-in functions, 0 signed-out);
  - run reports stored, and a failed run raised `backup_failed`.

Findings, all fixed in the scripts:

1. pg_dump omits pg_cron jobs, so they are exported as `cron.schedule()`
   calls.
2. **A plain restore widened access.** A new project grants `anon` and
   `authenticated` on every object it creates, and the dump's GRANT/REVOKE
   lines do not undo that. All 128 module functions, including internal ones,
   became callable by signed-out users. `restore.sh` now switches those
   defaults off during the load, and the drill checks grants every week.
3. Some role grants need a superuser, which hosted projects do not give, so
   they are skipped with a count.
4. Empty internal Storage tables cannot be written, so their empty `COPY`
   blocks are dropped. A table that has rows still fails loudly.
5. Cron jobs are paused through `cron.alter_job()`, because `postgres` cannot
   update `cron.job` directly.

**First production drill:** pending the one-time setup. Record its recovery
time and backup size here.
