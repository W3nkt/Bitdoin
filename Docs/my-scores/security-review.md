# My Scores — security review (SEC-001 #35, SEC-002 #36)

Review of the implemented Phase 1 module against the PRD §29.6 threat model,
2026-10-24. Scope: migrations 109–121, the `/academy/scores` and
`/academy-admin/scores` screens, `send-push` (score reminders), CI.

**Result: no open high or critical findings in My Scores.** Five findings were
fixed (S-01 to S-05). Two dependency advisories elsewhere in the app are
accepted as not exploitable here (D-02, D-03).

## Findings

| ID | Severity | Finding | Fix | Status |
|----|----------|---------|-----|--------|
| S-01 | Low | 10 trigger functions were executable by `anon` and `authenticated` (Postgres grants EXECUTE to PUBLIC by default). PostgREST cannot call trigger functions, so not exploitable, but nothing should be callable without need. | Migration 121 revokes them. The IDOR suite fails if any becomes callable again. | Fixed |
| S-02 | Medium | Export did not require a fresh sign-in. §29.6 T3 lists export with delete as sensitive; on a shared or borrowed phone anyone holding the session could download the full record. | `academic_export_my_data` calls `academic_require_recent_sign_in()` (15 min, as deletion). The Download card explains and sends the student to sign in and back. | Fixed |
| S-03 | Low | `goals.chips` was limited to 3 items but not in content: a crafted request could store arbitrary text. | Table check: chips must be one of the four known values; text ≤ 200. Checked on all 2 production profiles first (0 would fail). | Fixed |
| S-04 | Low | Denials in `get_score_entry`, `save_draft` and `submit_score_entry` named the period, not the enrolment, so the audit log hid which student was targeted. | They now name the enrolment when that is what failed. | Fixed |
| S-05 | Medium | Anomaly alerts (>3 other profiles in 24 h, denial bursts) were written to `academic_alerts` but shown nowhere, so the T12 "weekly review" had nothing to review. | "Alerts to review" on the admin Audit tab (ADMIN only), with "Mark reviewed" recording who and when. | Fixed |
| D-01 | Critical (app-wide) | DOMPurify ≤ 3.4.16 (bookstore pages) — XSS advisories. | Updated to 3.4.17 (same major). | Fixed |
| D-02 | Moderate (app-wide) | React Router 6.x open-redirect advisories; fixed only in 7.18. | Not exploitable: the only redirect target comes from history state and `sanitizeAuthReturnPath` rejects `\`, `//` and paths outside `/bookstore` and `/academy`. | Accepted; upgrade to v7 as maintenance |
| D-03 | High (app-wide) | Zod < 4.6.6 memory exhaustion on oversized constrained collections; fixed only in v4. | Not exploitable: Zod runs only in the browser on small checkout/admin forms with no collections; at worst a user slows their own tab. | Accepted; upgrade to v4 as maintenance |

## Threat model (§29.6)

| Threat | Phase 1? | Assessment and evidence | Residual |
|--------|----------|-------------------------|----------|
| T1 Guardian linking | No (Phase 3) | No guardian RPCs exist. `academic_can_read_profile` already handles scopes for later. | — |
| T2 Exposure of records (IDOR, storage, logs) | Yes | Student tables have no direct grants (RPC-only, OD-01c); every RPC resolves the caller from the JWT. ID-taking RPCs answer 404 identically for another student's ID and a random one, and audit the denial. All IDs are `gen_random_uuid()`, no sequences. No storage buckets are used by the module. The module logs no scores or names: the frontend has no `console.log`, and `send-push` logs only push-service status codes and error messages. | Low |
| T3 Impersonation (shared phones) | Yes | Fresh sign-in for export (S-02) and deletion. Drafts, queue and cache in IndexedDB are per account, purged for other accounts on open and cleared on sign-out. Optional session timeout on shared devices is not built. | Medium (as PRD) |
| T4 Manipulated images | No (Phase 2) | No uploads in Phase 1. | — |
| T5 Grades shown as official | Yes | Dashboard states "Scores you entered yourself, not official school records"; every line is `verification = self_reported`; exports carry the same column; no school logos. | Low |
| T6 Mass scraping | Yes | Per-user limits 120 reads / 30 writes per minute; lists capped at 50 (reminders, school search, audit pages); alerts at >3 other profiles in 24 h and on denial bursts, now reviewed in the admin (S-05). No public profiles. | Low |
| T7 Prompt injection | No (Phase 2–3) | No AI in the module. | — |
| T8 AI disclosure | No (Phase 3) | No AI in the module. | — |
| T9 Excessive collection | Yes | Fields: display name (40), age band (not birth date), province/district, goals (4 chips + 200 chars, S-03), custom subjects (60), correction reason (120). No phone, photo or school ID. | Low |
| T10 Cloud storage | No (Phase 2) | No files stored. | — |
| T11 Coercive guardians | No (Phase 3) | — | — |
| T12 Admin misuse | Yes | Roles: ADMIN configures, OPERATIONS supports, FINANCE nothing. Every admin/support action needs an authenticator-verified session (aal2). Support lookup shows no scores; scores need a ≥10-character reason, open 30 minutes for that agent and that student only; everything audited; agents see only their own audit entries; CSV export ADMIN only; alerts reviewed (S-05). | Low |

## Evidence

- `supabase/tests/db/academic_idor.test.mjs` (SEC-002, 112 checks):
  - every function a signed-in user can execute is classified, and a new RPC fails CI until covered;
  - student B against student A's objects through every ID-taking RPC: 404, same as a random ID, audited, A unchanged;
  - own-scoped reads contain nothing of A's; own-scoped writes leave A unchanged;
  - all 9 staff RPCs refuse students, refuse admins without MFA, and refuse Operations for admin actions;
  - break-glass is per agent, per student and expires;
  - no direct reads of student tables; students see no audit, review or alert rows; Operations see only their own audit rows; configuration writes need ADMIN + MFA;
  - anonymous callers can execute nothing;
  - random IDs only.
- The other 13 database test files: policies, rate limits and alerts, privacy, notifications, admin API, rollback.
- Browser checks: 21 student and 10 admin scenarios, including the export and deletion sign-in flows and axe accessibility checks.
- Production, read-only checks on 2026-10-24: 0 `SECURITY DEFINER` functions without `search_path`; RLS on every module table; anon has no table or RPC access; no direct grants on student tables; 46 RPCs callable by signed-in users, matching the test database. The trigger functions (S-01) are fixed when migration 121 is applied.
- All of the above run in CI on every pull request and before every deploy.

## Open items (not blocking)

- Optional session timeout on shared devices (T3 residual Medium, as accepted in the PRD).
- React Router v7 and Zod v4 upgrades (D-02, D-03).
- Audit-log retention of 24 months waits for OD-16; the CSV export is not itself recorded in the audit log.
