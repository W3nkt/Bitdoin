#!/usr/bin/env bash
# Records a backup or drill run in the database (academic_record_backup_run,
# migration 123), so the hourly health check alerts on failures and gaps.
# Details are counts, seconds and the run link only; when a run failed before
# it had any, just the link (RUN_URL).
#
#   DATABASE_URL=... scripts/backup/report.sh <backup|drill> <true|false> ['<details json>']
set -euo pipefail

kind=${1:?kind: backup or drill}
ok=${2:?ok: true or false}
details=${3:-}
[[ -n $details ]] || details=$(RUN_URL=${RUN_URL:-} node -e 'console.log(JSON.stringify(process.env.RUN_URL ? { run_url: process.env.RUN_URL } : {}))')

docker run --rm -i --network host postgres:17 psql "${DATABASE_URL:?DATABASE_URL is required}" -X -q -At -v ON_ERROR_STOP=1 \
  -v kind="$kind" -v ok="$ok" -v details="$details" <<'SQL'
select public.academic_record_backup_run(:'kind', :'ok'::boolean, :'details'::jsonb);
SQL
