# My Scores — Codebase and architecture discovery (PM-001, #2)

Source reviewed at commit `abc4d15` on 2026-10-23. Answers marked **unverified** need someone with
Supabase dashboard or GitHub settings access to confirm; they cannot be read from the repository.

## Discovery checklist (PRD §25.6)

| # | Question | Answer |
|---|----------|--------|
| D1 | Repository, frameworks, languages | Single repo. React 18 + TypeScript + Vite 5 SPA/PWA (`vite-plugin-pwa`), Tailwind 3, React Router 6, TanStack Query 5, Zustand, i18next, react-hook-form + zod, Recharts. Supabase Edge Functions in Deno/TypeScript. `bitdoin-api/` is a small Cloudflare Worker (health + WhatsApp webhook) — not an Academy API. |
| D2 | Hosting, environments, CI/CD | Frontend: GitHub Pages at `bitdoin.store` via `.github/workflows/deploy.yml` (push to `main` → `npm ci` → `npm run build` + Playwright prerender → Pages). Backend: one Supabase project. Only one set of `VITE_SUPABASE_*` values exists, so there is **no staging environment** in the pipeline (**unverified** whether a second Supabase project exists). Migrations and Edge Functions are not deployed by CI; they are applied out of band. |
| D3 | Auth, session storage, user ID | Supabase Auth (email/password, phone OTP, Google, Facebook, Apple). supabase-js keeps the session in browser storage and sends a JWT bearer token. `auth.users.id` (UUID) = `public.users.id`; the profile comes from `src/context/AuthContext.tsx`. RLS uses `auth.uid()`. |
| D4 | Database, migrations, backups | Supabase PostgreSQL 15 (`supabase/config.toml`). Forward-only numbered SQL files in `supabase/migrations/` (001–108, 062 unused); no down migrations. API exposes `public`, `storage`, `graphql_public` only. Backups/PITR plan: **unverified**. |
| D5 | Role/permission model | `public.users.role` enum `user_role` = `CUSTOMER`, `ADMIN`, `OPERATIONS`, `FINANCE`. Helpers `public.get_user_role()` and `public.is_staff()` (migration 043) are used throughout RLS. Self-updates to `role`/`email`/`phone` are blocked by trigger. |
| D6 | Academy content model, completion | Tables `premium_learning_categories`, `premium_lessons`, `premium_quiz_questions`, `premium_lesson_progress`, `premium_quiz_attempts`, `premium_weekly_challenges(+_progress)`, `premium_habits(+_checkins)` (migration 054+). UUID IDs and lesson slugs. Completion is stored as progress rows; no event stream (read via tables/RPC). |
| D7 | AI Coach | `src/pages/premium/Coach.tsx` + `supabase/functions/premium-coach`. Provider: Alibaba DashScope (Qwen, `qwen-plus`, OpenAI-compatible endpoint, international region). Usage limits in migration 050. Messages stored in `premium_coach_*` tables. |
| D8 | Career Explorer data | Static TypeScript (`src/data/careerPaths.ts`, `careerPathsLo.ts`); edited in code, no sourcing/review metadata. |
| D9 | Subscriptions | `premium_plans`, `premium_subscriptions` (status `FREE`/`PENDING_PAYMENT`/`PAYMENT_REVIEW`/`ACTIVE`/`CANCELLED`/`EXPIRED`, `starts_at`/`ends_at`), `premium_payments`. Expiry moves members to a Free row (migration 096, pg_cron). Frontend helpers in `src/lib/academyMembership.ts` (5-day expiry warning). |
| D10 | Payment confirmation | Manual QR/bank transfer: the member uploads a receipt, AI pre-review (`review-academy-payment`, migration 098), then FINANCE/ADMIN approve. |
| D11 | Object storage | Supabase Storage buckets (book covers, bank QR, payment receipts, profile media). Private buckets plus signed URLs are available. |
| D12 | Jobs/queues | `pg_cron` + `pg_net` jobs calling Edge Functions; a leased DB task queue (`premium_weekly_content_tasks`, migration 076) with attempts/max_attempts. Reusable pattern for outbox/notifications. |
| D13 | Analytics, monitoring | Google Analytics (`src/lib/googleAnalytics.ts`). No error tracking/APM in the repo. Supabase logs only. |
| D14 | Privacy, terms, minimum age, cookies | No minimum-age gate or consent records exist in code today. Policy pages: **unverified**. |
| D15 | Edge/CDN | GitHub Pages CDN for static files. No WAF or rate limiting in front of Supabase other than Supabase defaults (**unverified**); AI usage limits are per-feature in SQL. |

## Tests and tooling

- Root: `npm run build` (tsc + vite) and `npm run lint`. Playwright is a dependency and is used for prerendering and ad-hoc QA scripts in `scripts/`; there is no root test runner.
- `bitdoin-api/` has Vitest.
- `npm run test:db` runs the My Scores migrations, RLS policies and seed in an in-memory Postgres (PGlite, dev dependency only) with Supabase auth stubs (`supabase/tests/db/`). It is not wired into CI yet (OPS-001).

## Selected architecture (Option 1 + 2, modular monolith)

My Scores ships inside the existing app and Supabase project as a bounded module:

- **Tables:** `public.academic_*` (same prefix convention as `premium_*`). No second identity store: tables reference `public.users(id)`.
- **Transport:** reads through supabase-js against RLS-protected tables; writes through `SECURITY DEFINER` RPCs (`academic_*`) that validate input and raise coded errors (`SCORE_DUPLICATE`, `VERSION_CONFLICT`, …). Edge Functions only for export, deletion and background jobs.
- **Roles:** existing `user_role`. `ADMIN` manages academic configuration and the audit trail; `OPERATIONS` gets restricted support lookup; students are `CUSTOMER`.
- **UI:** a "My Scores" section under `/academy/*`, using the Academy layout and the shared `pwen_lang` language preference.

Recorded as OD-01 in [decision-register.md](decision-register.md).
