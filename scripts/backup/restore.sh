#!/usr/bin/env bash
# Restores a dump.sh backup into an empty Supabase database (a new project or
# a local stack) as Supabase documents it: roles and schema, data with
# triggers off, migration history, then the pg_cron jobs. Each part runs in
# one transaction and stops at the first error.
#
#   scripts/backup/restore.sh <backup-dir> --container <db-container> [--drill]
#   scripts/backup/restore.sh <backup-dir> --db-url <url> [--project-ref OLD NEW]
#
#   --drill        pauses the restored cron jobs (they call production URLs)
#   --project-ref  points the cron jobs' Edge Function URLs at the new project
#
# Runbook: Docs/my-scores/backup-restore.md
set -euo pipefail

dir=${1:?usage: restore.sh <backup-dir> <--container NAME | --db-url URL> [--drill] [--project-ref OLD NEW]}
shift
psql=()
drill=0
old_ref=''
new_ref=''
while (($#)); do
  case $1 in
    --container) psql=(docker exec -i "$2" psql -U postgres -d postgres); shift 2 ;;
    --db-url) psql=(docker run --rm -i --network host postgres:17 psql "$2"); shift 2 ;;
    --drill) drill=1; shift ;;
    --project-ref) old_ref=$2; new_ref=$3; shift 3 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done
((${#psql[@]})) || { echo "--container or --db-url is required" >&2; exit 2; }

# Errors only: the schema replays thousands of grants, some with harmless warnings.
run_sql() {
  "${psql[@]}" -q -X -v ON_ERROR_STOP=1 --single-transaction -f - 2>&1 >/dev/null | { grep -v 'WARNING:' >&2 || true; }
  return "${PIPESTATUS[0]}"
}
timed() {
  local label=$1 started=$SECONDS
  shift
  "$@"
  echo "restored $label in $((SECONDS - started)) s"
}

# Role settings and grants: best effort, since some need a superuser, which a
# hosted project does not give. Everything after this stops at the first error.
roles() {
  local errors
  errors=$("${psql[@]}" -q -X -f - < "$dir/roles.sql" 2>&1 >/dev/null | grep -c 'ERROR' || true)
  echo "roles: $errors statement(s) skipped"
}
# A new project grants anon/authenticated/service_role on every object created
# in public, and pg_dump's GRANT/REVOKE lines do not undo that: restored
# as-is, every module function would be callable while signed out. Turning
# those defaults off for the load gives each object exactly its backed-up
# grants; schema.sql then sets the defaults back at its end.
DEFAULTS_OFF="
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated, service_role;"

schema_and_data() {
  { echo "$DEFAULTS_OFF"
    cat "$dir/schema.sql"
    echo 'SET session_replication_role = replica;'
    node "$(dirname "$0")/skip-empty-copy.mjs" < "$dir/data.sql"; } | run_sql
}
history() { cat "$dir/history_schema.sql" "$dir/history_data.sql" | run_sql; }
cron_jobs() {
  { if [[ -n $old_ref ]]; then sed "s/$old_ref/$new_ref/g" "$dir/cron.sql"; else cat "$dir/cron.sql"; fi
    if ((drill)); then echo 'SELECT cron.alter_job(jobid, active := false) FROM cron.job;'; fi; } | run_sql
}

timed 'roles' roles
timed 'schema and data' schema_and_data
timed 'migration history' history
timed 'cron jobs' cron_jobs
