# My Scores — Decision register (PM-002, #3)

Only rows with a decision and date are approved. Every other row is still open and keeps the PRD
draft recommendation as a proposal, not an approval.

| ID | Topic | Decision | Owner | Date |
|----|-------|----------|-------|------|
| OD-01 | Architecture and identity | Modular monolith inside the existing app and Supabase project. Tables are `public.academic_*` and reference `public.users(id)`; no separate identity store. | Owner | 2026-10-23 |
| OD-01a | API transport | Reads go through RLS-protected tables. Writes go through `SECURITY DEFINER` RPCs with coded errors. Edge Functions are only for export, deletion and jobs. | Owner | 2026-10-23 |
| OD-01b | Module roles | Reuse `user_role`: `ADMIN` = academic configuration and audit; `OPERATIONS` = restricted support lookup; `CUSTOMER` = student. | Owner | 2026-10-23 |
| OD-07 (interim) | Consent model | Until counsel answers (#4): every supported student self-consents with a versioned notice, recorded append-only per purpose. The module stays behind the `my_scores_enabled` feature flag (off by default) until legal sign-off. Age band is still collected; under-13 is not supported. This is stricter-than-nothing but looser than PRD §29.3 for ages 13–15, so it must be revisited before launch. | Owner | 2026-10-23 |
| OD-02 | MVP grade scope and platform | Open. Draft: Grades 10–12, responsive web/PWA. The schema supports any grade. | — | — |
| OD-04 | Navigation, routes, digits | Open. Draft: "My Scores" in Academy nav, Arabic digits. | — | — |
| OD-13 | Admin MFA | Open. No MFA exists today (discovery D5). | — | — |
| OD-16 | Retention periods | Open; waits for counsel. | — | — |
| OD-03, 05, 06, 08–12, 14, 15, 17–20 | Later-phase decisions | Open; each is due at the phase the PRD states. | — | — |

## Calculation contradictions (needed before BE-004 golden fixtures)

Open:
1. "About the same" band: §19.3 says half a display unit, §20.3 says 0.25.
2. A six-period window cannot reach the eight observations required for high trend confidence.
3. §20.8 filters valid means, but F2 describes the last six submitted periods.

## Other open reconciliations

- Renewal notices: `academyMembership.ts` warns 5 days before expiry; NOTIF-005 asks for 7 days and 1 day.
- Bookstore recommendations stay in Phase 5; the one-time career report stays in Phase 4.
