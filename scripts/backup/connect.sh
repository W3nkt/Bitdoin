#!/usr/bin/env bash
# CI only: links the Supabase project and exports DATABASE_URL (the session
# pooler, reachable over IPv4; masked in logs) for dump.sh and report.sh.
# Needs SUPABASE_ACCESS_TOKEN, SUPABASE_DB_PASSWORD and PROJECT_REF.
set -euo pipefail

supabase link --project-ref "$PROJECT_REF" >/dev/null
pooler=$(cat supabase/.temp/pooler-url 2>/dev/null) || { echo '::error::supabase link did not record a pooler URL'; exit 1; }
url=$(POOLER=$pooler node -e 'const u = new URL(process.env.POOLER); u.password = process.env.SUPABASE_DB_PASSWORD; process.stdout.write(u.href)')
echo "::add-mask::$url"
echo "DATABASE_URL=$url" >> "$GITHUB_ENV"
