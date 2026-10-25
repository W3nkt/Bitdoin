# My Scores — test plan and fixtures (QA-001, #37)

Phase 1 scope: the shipped features (profiles, monthly entry, F1–F5
dashboard, history, privacy, reminders, admin, monitoring, analytics). OCR,
predictive labels, AI chat and paid access are out of scope until they ship;
each brings its own gate (PRD §35.4).

## Test levels (PRD §35.1) and where they live

All automated suites run in CI on every push and gate the Pages deploy
(`.github/workflows/ci.yml`).

| Level | Suite | Command |
|---|---|---|
| Unit / formulas | Golden fixtures F1–F5 and F6–F10 (below); analysis edge cases | `npm run test:db` → `academic_golden`, `academic_golden_f6_f10`, `academic_analysis` |
| Item bank (ADMIN-007, QUIZ-005) | Review workflow, approval by a non-author, versions, immutability, leaked/official-exam guard, servable gate | `npm run test:db` → `academic_quiz_bank` |
| Diagnostic quizzes (QUIZ-001..003, ANALYSIS-005) | Publish rules, insights switch, start/resume, answers never exposed while answering, band edges, review, other students' attempts (IDOR), export, deletion | `npm run test:db` → `academic_quiz_delivery`, `academic_idor` |
| Report a problem (PRIV-008) | Business-day targets, priority for safety categories, one alert per safety report without free text, daily limit, support queue, export, deletion | `npm run test:db` → `academic_problem_reports` |
| Content catalogue (LEARN-004, OD-05) | Academy adapter availability (published, future-dated, this week's challenge, practice sets), required metadata, existing records only, admin-only, audit | `npm run test:db` → `academic_content_catalogue` |
| Next actions (LEARN-001..003) | Rules R1–R5, R7 on the PRD §20.9 student; ranking, caps and top 3; members-only Academy items; completed lessons skipped; gap card and log; impressions once a day; determinism; insights switch | `npm run test:db` → `academic_recommendations` |
| Practice sets (REC-PRACTICE) | Published entry and grade required, no answers up front, final answers with instant feedback, least-practised first, other students' attempts (IDOR), done for 14 days, R5 trigger, export, deletion | `npm run test:db` → `academic_practice_sets`, `academic_idor` |
| Explanations (ANALYSIS-004) | Every template in Lao and English, every label × trend × confidence and every F6–F10 golden case through the cause filter; DASH-005 reasons | `npm run test:insights` |
| API / contract | Every RPC: error contract, idempotency, rate limits, validation | `npm run test:db` (PGlite, all module migrations) |
| Security (IDOR) | Registry of every callable RPC × other students' ids; RLS backstop | `academic_idor`, `academic_policies` |
| End-to-end | 21 student and 12 admin journeys, Android 360 px and desktop, Lao and English, with axe checks | `npm run test:e2e` |
| Migration | Rollback rehearsal; production restore drill (weekly) | `academic_rollback`; workflow *Database backup* |
| Localisation, accessibility | Checklist §35.3 | #39 |
| UAT | Appendix E scripts with pilot users | #40 |

## Automated coverage (QA-002, #38)

| Area | API / database (PGlite, real migrations) | Browser (Playwright, mocked API) |
|---|---|---|
| J1 first-time student: Academy → set-up → first month → dashboard | `academic_profiles`, `academic_scores`, `academic_analysis` | Android/Lao and desktop/English set-up, entry, dashboard |
| J2 monthly return (manual entry; photo is Phase 2) | drafts, idempotent submit, corrections (`academic_scores`) | Entry, offline draft and retry, duplicate period, correction |
| J6 new school year | promotion, repeat, transfer, leaving (`academic_profiles`) | New school year, mid-year transfer |
| J7 admin configures a grading scale | versions, approval, four-eyes, audit (`academic_admin`) | Scales: invalid pass mark, draft version, approval |
| Admin authorisation | every staff RPC refused to students and to staff without MFA (`academic_idor`, `academic_admin`) | MFA set-up and code, Operations sees two tabs, Finance no access |
| In-app reminders | schedule, caps, quiet hours, settle on submit (`academic_notifications`) | Bell count, banner, inbox, settings (Lao and English) |
| Shared phone | drafts and caches keyed by account | Other accounts' drafts purged; after sign-out the next student signing in on the same tab never sees the previous account's data |
| Data isolation (QG-2) | registry of every callable RPC × another student's ids, RLS backstop (`academic_idor`, `academic_policies`) | — |
| Privacy | consent, export, deletion and purge (`academic_privacy`) | Export ZIP, fresh sign-in, deletion schedule, consents |

J3–J5 (diagnostics, guardians, careers) are later phases. CI runs both
harnesses on every push and blocks the deploy if either fails.

**Flaky rate (target < 2%), measured 2026-10-25:**
- **Locally:** ten back-to-back runs of both suites gave 0 failures: 200 database test-file runs and 360 browser-scenario runs. With 0 of 560, the 95% upper bound is about 0.5%.
- **In CI**, since the test gates started on 24 October, two runs failed:
  - one real failure: a missing test key;
  - one flaky test: a timing race in the backup test, fixed the same day by making the test deterministic.
- **If a test flakes again:** fix the test before re-running. A quarantined test still counts as failed.

## Golden fixtures (QG-1)

- **File:** `supabase/tests/golden/f1-f5.v1.json`, built by `node supabase/tests/golden/build.mjs`.
- **How expected values are computed:** by `supabase/tests/golden/reference.mjs`, written from PRD §20.2/§20.7 and decisions CALC-1..3. It works in exact fractions (BigInt) and shares no code with the SQL engine.
- **How the test runs:** `academic_golden.test.mjs` enters every case through the student RPCs and compares the engine's dashboard with the frozen values to 1e-9. It also confirms the frozen values still equal the reference's output, and that G01 reproduces the figures printed in PRD §20.9.

| Case | Covers |
|---|---|
| G01 | PRD §20.9 worked example (C1): Physics January missing |
| G02 | Only three months (C4) |
| G03 | Zero scores; missing, not applicable and exempt (C5) |
| G04 | Coverage 3/7 (hidden), exactly 1/2 (shown), 4/7 |
| G05 | An unrecorded month: changes skip it; rolling means need three consecutive months |
| G06 | "About the same" edges on 0–10: ±0.25 is a change, 0.125 is not |
| G07 | 0–50 scale: band 1.25 |
| G08 | Eight months: subject means use the last six |
| G09 | Transfer to a 0–50 school mid-year (C2/C3): each enrolment analysed on its own scale |
| G10 | Replayed submit changes nothing; a correction updates F1, F3, F5 and F2 |

**Labels and trends, F6–F10 (P2-ANL, #49).** `supabase/tests/golden/f6-f10.v1.json`, built by `node supabase/tests/golden/build-f6-f10.mjs` from the same reference module (§20.2–§20.6, CALC-4/CALC-5). `academic_golden_f6_f10.test.mjs` runs it like the F1–F5 test, checks L01 against the table printed in PRD §20.9, and checks the engine's normal tail against the reference's independent erfc. Engine `f1-f10@2.0.0` (migration 129) leaves F1–F5 unchanged, so `f1-f5.v1.json` still applies.

| Case | Covers |
|---|---|
| L01 | PRD §20.9 worked example: every label, trend and confidence in the published table |
| L02 | Label thresholds met exactly: D = ±0.75, 3 of 5 months on the same side |
| L03 | D over the threshold but on the same side in 2 of 5 months; a month at the mean counts for neither side (CALC-5) |
| L04 | Minimum data: label needs 3 months with a shown mean, trend needs 4 scores |
| L05 | A hidden-mean month gives no deviation but counts for the trend |
| L06 | 0–50 scale: slope exactly 0.75 is improving, 0.5 is not |
| L07 | 0–50 scale: D exactly ±3.75 gives a label; SD exactly 5 is volatile |
| L08 | Volatility at exactly SD 1.0 |
| L09 | Eight months: high label and trend confidence; labels use six months, trends all eight (CALC-4) |
| L10 | Declining with an unrecorded month: Theil–Sen uses the real month numbers |
| L11 | A steady rise of 0.5 a month for 8 months is "volatile" (§20.5 as written; approved by the owner 2026-10-25) |

**Versioning.**
- **Frozen values:** expected values change only with a formula, config or CALC decision.
- **When one does change:**
  1. Bump the engine version (`f1-f5@x.y.z` in migration 115's successor).
  2. Write `f1-f5.v2.json` and keep v1 for the old config.
  3. Record the decision in the register.
- **Engine check:** the test refuses a fixture whose `engine` does not match.
- **Later formulas:** F6–F11 get their own fixtures when Phase 2 ships them, with labels, trends and confidence.

Known gap, recorded for Phase 2 (P2-ANL): a six-period window cannot reach the
eight observations §20.6 requires for high trend confidence.

## Test accounts and data

- **Synthetic data only.** Automated tests use synthetic users and the fixtures in `supabase/tests/db/fixtures.mjs`: a 2026-27 calendar, 0–10 and 0–50 scales, and two schools.
- **No production data** is used in tests. The restore drill runs on an encrypted copy inside CI and prints counts only.
- **Manual and UAT sessions** use test accounts created in production with the role they need: a student; an ADMIN with an authenticator app; OPERATIONS. Delete them when the session ends.

## Device and browser matrix (PRD NFR, §35.1)

Agreed by the owner on 2026-10-25.

| Tier | Device / browser | How |
|---|---|---|
| A | Android Chrome, 360 × 800, low-end (2 GB RAM, Android 10+) | Automated emulation every push; real-device session before each release |
| A | Desktop Chrome, 1280 px | Automated every push |
| B | iOS Safari (last 2) | Real-device session before each release |
| B | Samsung Internet (last 2) | Real-device session before each release |
| C | Desktop Edge, Firefox, Safari (last 2) | Smoke test (sign in, enter a month, dashboard) before each release |

Breakpoints checked: 360, 768, 1024 and 1440 px. The release checklist
records the device, OS and browser versions used, and the result.

## Quality gates in scope

- **QG-1 Score calculation accuracy:** 100% of golden tests pass. This is enforced in CI.
- **QG-2 Data isolation:**
  - Every callable RPC is in the IDOR registry; a new RPC fails the suite until it is classified.
  - Zero failures.
  - The manual penetration test is scheduled before Phase 3.
- **UAT exit (§35.5):** all P0 scripts pass, no open severity-1/2 defects, and at least 80% of pilot students rate entry 4–5/5. Tracked in #40.

## Localisation and accessibility checklist (PRD §35.3, QA-003 #39)

### Automated (CI, every push)

The browser suite checks seven student screens in Lao and English, light and dark, at 360 px: set-up notice, updated notice, dashboard, score entry, history, My data and inbox.

| §35.3 item | How it is checked | Result 2026-10-25 |
|---|---|---|
| No clipped Lao glyphs at 200% zoom | Text at 200% at 360 px: no text clipped or cut off with "…", no sideways scrolling. Lao screenshots saved as `a11y-*-lo-200.png`. | Passes after fixes: names wrap instead of "…", and rows rearrange at large text |
| Line breaks at word boundaries | `<html lang>` follows the chosen language, so the browser breaks Lao lines with its dictionary and picks Lao fonts and voices | Passes after fix: it stayed `en` until the language was toggled |
| Lao digits accepted | "໗.໕" normalised to 7.5 (entry scenario; SCORE-004) | Passes |
| Dates in Lao month names | `formatDate` uses Lao month names, e.g. "ໃຫ້ເມື່ອ 1 ຕຸລາ 2026" in My data | Passes |
| Colour contrast | axe WCAG 2.2 AA (all rules, all impacts) on every screen, both themes | Passes after fix: grey text was too faint in dark mode |
| Keyboard navigation on desktop | Tab through dashboard, entry, My data and inbox; every focused control shows a focus indicator; Enter moves between scores | Passes |
| Chart tables | Every chart has a table view (dashboard and Health tab scenarios) | Passes |
| 360 px layout, reflow | No sideways scrolling at 360 px and at 320 px (WCAG 1.4.10) | Passes |

### Manual, before the pilot (tick in #39)

The owner waived these three checks on 2026-10-25 and closed #39 without running them. They have not been performed.

- [ ] **Lao text reviewed by two native educators.** Cover `src/lib/academic/copy.ts` and the push wording in `send-push/messages.ts`. The owner confirmed the text on 2026-10-23 (UX-005); §35.3 asks for two educators. Strings added since then: `inbox.*`, `privacy.export.reauthBody`, `notice.stats`, `consent.usageStats.*`.
- [ ] **TalkBack on a real Android phone** (tier A device), with Lao text-to-speech if installed:
  - set-up;
  - entering a month;
  - dashboard and the chart table view;
  - My data.

  Each label should be read in the right language, and the screen reader should announce the order logically.
- [ ] **Android "Largest" font size and 200% display zoom** on the same phone: no clipped Lao tone marks or vowels.
