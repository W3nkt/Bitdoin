#!/usr/bin/env bash
# Restore drill (OPS-003, #43): decrypts a backup, restores it into a new,
# empty local Supabase stack and checks it against its manifest. Writes
# <work-dir>/drill.json with the timings; exits 1 if anything differs.
# Needs Docker, the Supabase CLI, age and node. The stack uses ports 563xx
# and is removed afterwards (KEEP_STACK=1 keeps it for a look around).
#
#   scripts/backup/drill.sh <backup.tar.gz.age> <age-key-file> <work-dir>
#
# Runbook: Docs/my-scores/backup-restore.md
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)
encrypted=${1:?usage: drill.sh <backup.tar.gz.age> <age-key-file> <work-dir>}
key=${2:?age key file required}
work=${3:?work dir required}
supabase=${SUPABASE_BIN:-supabase}
age=${AGE_BIN:-age}
container=supabase_db_backup-drill
mkdir -p "$work/backup" "$work/stack"
work=$(cd "$work" && pwd)

cleanup() { [[ ${KEEP_STACK:-} == 1 ]] || (cd "$work/stack" && $supabase stop --no-backup >/dev/null 2>&1) || true; }
trap cleanup EXIT

started=$SECONDS
$age -d -i "$key" "$encrypted" | tar -xzf - -C "$work/backup"
decrypted=$SECONDS

(
  cd "$work/stack"
  $supabase init --force >/dev/null
  sed -i -E 's/^project_id = .*/project_id = "backup-drill"/; s/^(port|shadow_port) = 543([0-9][0-9])$/\1 = 563\2/' supabase/config.toml
  $supabase start -x studio,imgproxy,mailpit,logflare,vector,edge-runtime,realtime,postgres-meta,supavisor >/dev/null
)
stack_up=$SECONDS

bash "$here/restore.sh" "$work/backup" --container "$container" --drill
restored=$SECONDS

status=0
node "$here/verify.mjs" "$work/backup" -- docker exec -i "$container" psql -U postgres -d postgres || status=$?
verified=$SECONDS

DECRYPT_S=$((decrypted - started)) STACK_S=$((stack_up - decrypted)) RESTORE_S=$((restored - stack_up)) VERIFY_S=$((verified - restored)) \
node -e '
  const { readFileSync, writeFileSync } = require("node:fs")
  const dir = process.argv[1]
  const manifest = JSON.parse(readFileSync(`${dir}/backup/manifest.json`, "utf8"))
  const verify = JSON.parse(readFileSync(`${dir}/backup/verify.json`, "utf8"))
  const s = (name) => Number(process.env[name])
  writeFileSync(`${dir}/drill.json`, JSON.stringify({
    ok: verify.ok, problems: verify.problems.length, tables: verify.tables_checked, rows: verify.rows_checked,
    migration: verify.migration, cron_jobs: verify.cron_jobs,
    decrypt_s: s("DECRYPT_S"), stack_s: s("STACK_S"), restore_s: s("RESTORE_S"), verify_s: s("VERIFY_S"),
    backup_created_at: manifest.created_at,
    backup_age_s: Math.max(0, Math.round((Date.now() - Date.parse(manifest.created_at)) / 1000)),
  }, null, 2))
' "$work"
echo "drill: decrypt $((decrypted - started)) s, empty stack $((stack_up - decrypted)) s, restore $((restored - stack_up)) s, verify $((verified - restored)) s"
exit $status
