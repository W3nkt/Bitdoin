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
| Unit / formulas | Golden fixtures F1–F5 (below); analysis edge cases | `npm run test:db` → `academic_golden`, `academic_analysis` |
| API / contract | Every RPC: error contract, idempotency, rate limits, validation | `npm run test:db` (PGlite, all module migrations) |
| Security (IDOR) | Registry of every callable RPC × other students' ids; RLS backstop | `academic_idor`, `academic_policies` |
| End-to-end | 21 student and 12 admin journeys, Android 360 px and desktop, Lao and English, with axe checks | `npm run test:e2e` |
| Migration | Rollback rehearsal; production restore drill (weekly) | `academic_rollback`; workflow *Database backup* |
| Localisation, accessibility | Checklist §35.3 | #39 |
| UAT | Appendix E scripts with pilot users | #40 |

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
