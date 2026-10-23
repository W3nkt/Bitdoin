# My Scores — Decision register (PM-002, #3)

Only rows with a decision and date are approved. Every other row is still open and keeps the PRD
draft recommendation as a proposal, not an approval.

| ID | Topic | Decision | Owner | Date |
|----|-------|----------|-------|------|
| OD-01 | Architecture and identity | Modular monolith inside the existing app and Supabase project. Tables are `public.academic_*` and reference `public.users(id)`; no separate identity store. | Owner | 2026-10-23 |
| OD-01a | API transport | Reads go through RLS-protected tables. Writes go through `SECURITY DEFINER` RPCs with coded errors. Edge Functions are only for export, deletion and jobs. | Owner | 2026-10-23 |
| OD-01b | Module roles | Reuse `user_role`: `ADMIN` = academic configuration and audit; `OPERATIONS` = restricted support lookup; `CUSTOMER` = student. | Owner | 2026-10-23 |
| OD-07 (interim) | Consent model | Until counsel answers (#4): every supported student self-consents with a versioned notice, recorded append-only per purpose. The module stays behind the `my_scores_enabled` feature flag (off by default) until legal sign-off. Age band is still collected; under-13 is not supported. This is stricter-than-nothing but looser than PRD §29.3 for ages 13–15, so it must be revisited before launch. | Owner | 2026-10-23 |
| OD-13 | Admin MFA | My Scores admin and support actions (configuration writes, school merges, role changes, support lookup, break-glass, audit log) require an MFA-verified session (`aal2`, TOTP). Other Bitdoin admin pages are unchanged. Setting `admin_mfa_required`. | Owner | 2026-10-23 |
| OD-13a | Four-eyes approval | Scale versions record creator and approver. Requiring a different approver is the setting `scale_four_eyes_required`, off until there are two or more content admins. | Owner | 2026-10-23 |
| OD-01c | Student-data reads | Supersedes the read half of OD-01a: student records are read only through RPCs (rate-limited, denials audited). Direct SELECT on student tables is revoked; RLS policies remain as a backstop. Configuration tables stay directly readable. | Owner | 2026-10-23 |
| OD-02 | MVP grade scope and platform | Open. Draft: Grades 10–12, responsive web/PWA. The schema supports any grade. | — | — |
| OD-04 | Navigation, routes, digits | Open. Draft: "My Scores" in Academy nav, Arabic digits. | — | — |
| OD-13 | Admin MFA | Open. No MFA exists today (discovery D5). | — | — |
| OD-16 | Retention periods | Open; waits for counsel. | — | — |
| OD-03, 05, 06, 08–12, 14, 15, 17–20 | Later-phase decisions | Open; each is due at the phase the PRD states. | — | — |

## Implementation notes (not owner decisions)

- **Error contract over PostgREST** (migration 111): RPCs raise SQLSTATE `PT<status>` with the code as the message. Denied object access returns `{"error":{"code":"NOT_FOUND","status":404}}` as data, so the `access_denied` audit event is committed rather than rolled back. `src/lib/academic/errors.ts` maps both into `AcademicError`.
- **AUTH-002 coverage gap:** direct RLS table reads of another student's ID return an empty result (safe, 404-equivalent) but cannot write an audit event. Every object-by-ID access that must be audited goes through an RPC; SEC-002 should test both paths.

## Calculation decisions (BE-004)

| ID | Topic | Decision | Owner | Date |
|----|-------|----------|-------|------|
| CALC-1 | "About the same" band (§19.3 vs §20.3) | A change counts as "about the same" when \|Δ\| < 0.25 points on a 0–10 scale, scaled by (max − min)/10 for other scales. Versioned in the analysis config. | Owner | 2026-10-23 |
| CALC-2 | F2 window (§20.8 vs F2) | Subject means use the last 6 **submitted** monthly periods of the enrolment, including periods whose overall mean is hidden for low coverage. | Owner | 2026-10-23 |
| CALC-3 | F3/F4 comparison period | Changes compare with the last earlier **valid** period (for F4: the last earlier period with a value for that subject). The response says which period was used and whether months were skipped. | Owner | 2026-10-23 |

Still open (Phase 2, P2-ANL): a six-period window cannot reach the eight observations that §20.6 requires for high trend confidence.

## Other open reconciliations

- Renewal notices: `academyMembership.ts` warns 5 days before expiry; NOTIF-005 asks for 7 days and 1 day.
- Bookstore recommendations stay in Phase 5; the one-time career report stays in Phase 4.
