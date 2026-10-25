# My Scores — Decision register (PM-002, #3)

Only rows with a decision and date are approved. Every other row is still open and keeps the PRD
draft recommendation as a proposal, not an approval.

| ID | Topic | Decision | Owner | Date |
|----|-------|----------|-------|------|
| OD-01 | Architecture and identity | Modular monolith inside the existing app and Supabase project. Tables are `public.academic_*` and reference `public.users(id)`; no separate identity store. | Owner | 2026-10-23 |
| OD-01a | API transport | Reads go through RLS-protected tables. Writes go through `SECURITY DEFINER` RPCs with coded errors. Edge Functions are only for export, deletion and jobs. | Owner | 2026-10-23 |
| OD-01b | Module roles | Reuse `user_role`: `ADMIN` = academic configuration and audit; `OPERATIONS` = restricted support lookup; `CUSTOMER` = student. | Owner | 2026-10-23 |
| LAUNCH | Module switched on | `my_scores_enabled = true` in production on 2026-10-23 at the owner's request, with the curriculum seed loaded. This overrides the OD-07 interim condition (off until legal sign-off); legal review #4 remains open. | Owner | 2026-10-23 |
| OD-07 (interim) | Consent model | Until counsel answers (#4): every supported student self-consents with a versioned notice, recorded append-only per purpose. The module stays behind the `my_scores_enabled` feature flag (off by default) until legal sign-off. Age band is still collected; under-13 is not supported. This is stricter-than-nothing but looser than PRD §29.3 for ages 13–15, so it must be revisited before launch. | Owner | 2026-10-23 |
| OD-13 | Admin MFA | My Scores admin and support actions (configuration writes, school merges, role changes, support lookup, break-glass, audit log) require an MFA-verified session (`aal2`, TOTP). Other Bitdoin admin pages are unchanged. Setting `admin_mfa_required`. | Owner | 2026-10-23 |
| OD-13a | Four-eyes approval | Scale versions record creator and approver. Requiring a different approver is the setting `scale_four_eyes_required`, off until there are two or more content admins. | Owner | 2026-10-23 |
| OD-01c | Student-data reads | Supersedes the read half of OD-01a: student records are read only through RPCs (rate-limited, denials audited). Direct SELECT on student tables is revoked; RLS policies remain as a backstop. Configuration tables stay directly readable. | Owner | 2026-10-23 |
| OD-02 | MVP grade scope and platform | Open. Draft: Grades 10–12, responsive web/PWA. The schema supports any grade. | — | — |
| OD-04 | Navigation and routes | Route `/academy/scores`. Entry points: a 4th Learning Hub "My space" tile and a link on `/academy/profile`, both shown only while the module is enabled for the user. Arabic digits on screen; Lao digits accepted on input. | Owner | 2026-10-23 |
| DB-003 | Curriculum | `supabase/seeds/academic_curriculum_seed.sql` approved as the production curriculum: Grades 10–12 (ມ.5–ມ.7), 0–10 scale in steps of 0.5 (pass 5), 2026–2027 calendar September–May (term 1 Sep–Jan, term 2 Feb–May), 12 subjects (Civics and Arts in the catalogue, not pre-selected). `seed_status = production`. | Owner | 2026-10-23 |
| UX-005 | Lao copy | All module strings (`src/lib/academic/copy.ts`) and push text (`send-push/messages.ts`) reviewed and confirmed by the owner. Civics = ສຶກສາສາດ, Arts = ສິລະປະກຳ. | Owner | 2026-10-23 |
| OPS-003 | Backups | The project stays on the Supabase Free plan, which keeps no backups. Instead, a GitHub Actions workflow takes a nightly logical backup of the whole database, encrypted with age, kept 30 days, and runs a weekly automatic restore drill. Targets: RPO ≤ 24 h, RTO ≤ 4 h. Supabase Pro (daily backups, $25/month) or PITR (about $130/month in total) can be added later. Storage files are not covered. See `backup-restore.md`. | Owner | 2026-10-25 |
| ANL-001 | Usage analytics | First-party events in Supabase (`academic_usage_events`), not Google Analytics. Events are kept while Schooling consent and the new `usage_statistics` purpose are active. The purpose is granted once on agreeing to the privacy notice, which names it (notice version 2026-10-25), and can be switched off in My data. Pre-profile events have no identifier. Students are pseudonymised by a keyed hash; nothing holds scores, names or free text; events are kept 24 months and deleted with the profile. See `usage-events.md`. | Owner | 2026-10-25 |
| OD-16 | Retention periods | Open; waits for counsel. | — | — |
| OD-03, 05, 06, 08–12, 14, 15, 17–20 | Later-phase decisions | Open; each is due at the phase the PRD states. | — | — |

## Implementation notes (not owner decisions)

- **Error contract over PostgREST** (migration 111): RPCs raise SQLSTATE `PT<status>` with the code as the message. Denied object access returns `{"error":{"code":"NOT_FOUND","status":404}}` as data, so the `access_denied` audit event is committed rather than rolled back. `src/lib/academic/errors.ts` maps both into `AcademicError`.
- **AUTH-002 coverage:** closed by OD-01c (migration 117). Student data is read only through RPCs, so every denied by-ID access writes an `access_denied` event. RLS policies remain as a backstop and are tested separately.
- **Rate limits** (migration 117): counted per user in the database on every RPC (read 120/min, write 30/min; `rate_limits` setting). Supabase Auth and Storage keep their own platform limits; PostgREST itself has no per-user limiter.
- **Device switch for score reminders** (migration 120): `push_subscriptions.my_scores_enabled` is a third per-device switch beside Bookstore and Academy. Score reminders go only to devices with it on, so turning them on never also turns on daily quotes, and a phone set up only for new-book alerts gets no score reminders. A device row is removed only when all three switches are off.
- **Reminders settle on submit** (migration 120): submitting a month dismisses its shown reminders and suppresses queued pushes straight away instead of at the next hourly run.
- **Admin screens** (`/academy-admin/scores`, #34): English UI like the other Academy admin pages, with Lao and English fields side by side. ADMIN sees every tab; OPERATIONS sees Support and their own audit entries; FINANCE has no access. Everything sits behind the authenticator-app check (OD-13), set up from the page itself.
- **School calendars** (ADMIN-004): created as a copy of the province or national calendar, then only the differing periods are edited. Periods with submitted scores cannot be deleted (foreign key).
- **CSV cells** (`exportZip.ts`): text starting with `=`, `+`, `-` or `@` is prefixed with `'` so it never runs as a spreadsheet formula. Applies to the student export and the audit export.

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
