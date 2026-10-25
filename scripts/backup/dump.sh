#!/usr/bin/env bash
# Logical backup of the whole database (OPS-003, #43), in the layout Supabase
# documents for restoring into a new project: roles, schema, data and
# migration history, plus the pg_cron jobs as cron.schedule() calls (pg_dump
# leaves cron.job out) and manifest.json (row counts and checksums for the
# restore drill).
#
#   DATABASE_URL=postgresql://... scripts/backup/dump.sh <out-dir> [--container <db-container>]
#
#   --container  run psql inside that container (local stacks) instead of a
#                postgres:17 container on the host network
#
# The output holds personal data: encrypt it before it leaves the machine
# (the backup workflow does). Runbook: Docs/my-scores/backup-restore.md
set -euo pipefail

out=${1:?usage: DATABASE_URL=... dump.sh <out-dir> [--container NAME]}
: "${DATABASE_URL:?DATABASE_URL is required}"
container=''
if (($# > 1)); then
  [[ $2 == --container && -n ${3:-} ]] || { echo "unknown option: $2" >&2; exit 2; }
  container=$3
fi
supabase=${SUPABASE_BIN:-supabase}
mkdir -p "$out"

psql() {
  if [[ -n $container ]]; then docker exec -i "$container" psql -U postgres -d postgres "$@"
  else docker run --rm -i --network host postgres:17 psql "$DATABASE_URL" "$@"; fi
}
dump() { $supabase db dump --db-url "$DATABASE_URL" "$@"; }

dump --role-only -f "$out/roles.sql"
dump -f "$out/schema.sql"
dump --data-only --use-copy -f "$out/data.sql"
dump --schema supabase_migrations -f "$out/history_schema.sql"
dump --data-only --use-copy --schema supabase_migrations -f "$out/history_data.sql"

psql -At -X -v ON_ERROR_STOP=1 > "$out/cron.sql" <<'SQL'
select '-- pg_cron jobs, ' || count(*) || E' (replay with psql; restore.sh does)\n'
  || coalesce(string_agg(
       case when jobname is null then format('select cron.schedule(%L, %L);', schedule, command)
            else format('select cron.schedule(%L, %L, %L);', jobname, schedule, command) end
       || case when active or jobname is null then ''
               else format(E'\nselect cron.alter_job((select jobid from cron.job where jobname = %L), active := false);', jobname) end,
       E'\n' order by jobname, jobid), '')
from cron.job;
SQL

node "$(dirname "$0")/manifest.mjs" "$out"
