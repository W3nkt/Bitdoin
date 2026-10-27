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
| Feedback (LEARN-005) | Not now 14 days, not helpful 180 days, done 30 days, at most 3 days in 30 (R1 exempt), next actions fill the space, own keys only, export | `npm run test:db` → `academic_recommendation_feedback` |
| Academy hand-off (LEARN-007) | A recommended lesson pacing still locks opens from This week; its back button returns to Schooling | `npm run test:e2e` → My Scores browser checks |
| Score-book scanning (OCR-001..012) | Off switch and consent, allowance, duplicates, Edge Function claim/complete/fail, subject matching, timeout, confirmation as the only path to scores, discard, image deletion and retention, photo list, photos deleted when consent is withdrawn, kept photos stay kept, OCR quality view and alerts, hourly purge scheduled, cleanup after profile deletion | `npm run test:db` → `academic_ocr_jobs`, `academic_idor` |
| OCR extraction core (OCR-004) | Prompt, reply parsing, schema validation, scale checks, two-pass confidence, crossed-out values, warnings, ocr_extraction.v1 shape, text in the photo stays data | `npm run test:ocr` |
| Entitlements and quotas (BILLING-001/002/003/006/007) | Free plan vs paid Premium, expiry at ends_at, enforcement switch and 403 ENTITLEMENT_REQUIRED, plan change by configuration, grants with reason codes and references, revoke, audit, roles and authenticator session, quota take / refuse / refund, month boundary | `npm run test:db` → `academic_entitlements`, `academic_ocr_jobs`, `academic_idor` |
| Premium gates (PRD §30.3, BILLING-006) | Off: no change; on without Premium: labels and trends keep verdict only, top action only, one diagnostic per subject each term with ENTITLEMENT_REQUIRED on start, earlier results and charts kept; on with Premium: full | `npm run test:db` → `academic_golden_f6_f10`, `academic_recommendations`, `academic_quiz_delivery`; `npm run test:e2e` → Premium gates |
| Study planner (PLAN-001..004, PLAN-006) | Baseline, months, Steady/Stretch/Ambitious/Maintain with halfway goal, scale and month checks, one goal per subject, edits keep the baseline, Free limit and weekly plans needing Premium, rest day and minute options, weekly tasks within the commitment, alternating subjects, move once then skip or keep, review, edit from tomorrow, pause and resume, opt-in Academy XP once per task and never taken back, other students' goals and tasks, deletion | `npm run test:db` → `academic_study_planner`, `academic_idor`; `npm run test:e2e` → Planner |
| Coach academic mode, data and queue (AI-002/005/006/007/008/009, ADMIN-009) | Context holds only the student's own months and subjects (none of another student's), counts scores, follows the Premium detail lock; server-only functions; 10 messages a month on Free, refund on failure; circuit breaker opens at > 20% failures over 5 minutes and closes after; prompt versions switch and roll back by configuration; summary cache per snapshot, version and language for 30 days; feedback only on own academic answers; reviewer queue hides text unless shared, unsafe first, rubric; deletion with the profile | `npm run test:db` → `academic_coach_mode`, `academic_idor` |
| Coach safety layer and grounding (AI-003/004, OD-15) | Study questions pass; self-harm, abuse, sexual content, contact or photo requests, other students' scores and companionship caught in Lao and English; crisis reply with help numbers in order; answers checked on the way out; unsupported numbers caught; the deterministic summary and fallback use only data numbers | `npm run test:coach` |
| Coach screens (AI-001/007/008/009) | Coach card with quota, monthly summary marked as checked AI text, Ask about a subject, My scores mode, report with consent to share, busy state; admin AI review with rubric | `npm run test:e2e` → Coach, AI review |
| Coach weekly review sample (ADMIN-009, migration 146) | Sharing with reviewers is off until the student turns it on; each Monday the previous week's AI answers from consenting students are sampled (1% or 50, whichever is larger), one per conversation, once per week; safety replies are not sampled; sampled text shows only while consent is active and withdrawing removes open samples; samples follow reports in the queue; review averages by prompt version and model; server-only, weekly schedule; the Privacy switch and the admin sample line and results table | `npm run test:db` → `academic_coach_mode`; `npm run test:e2e` → Consents, AI review |
| Coach evaluation pipeline (AI-002/003/004/010, QG-5) | Fixed set 1.0.0 (297 items: 159 grounding, 40 not-enough-data, 10 summaries, 38 safety, 50 cross-student red team; Lao and English; synthetic students only): every safety prompt gets its reply and no ordinary question is stopped; retry once then data-only fallback, as production; scoring of numbers, not-enough-data wording, Lao script, personal causes, disclosure; gates, baseline comparison and the native raters' sheet. The live run (`npm run eval:coach -- --live`) is required before any new model or prompt version goes live | `npm run test:coach`; live: `npm run eval:coach -- --live --gate` |
| Career catalogue (CAREER-005/008, UNI-001/002/004, ADMIN-010, migrations 148–149) | Seed: the 14 Explorer careers keep their slugs, 5 Lao pathway careers, 5 institutions with faculties, all waiting for review and complete, no unsourced salary or demand facts; students see only published copies; the author cannot approve (four-eyes), another admin can; returning needs a reason; a cut-off without its academic year cannot be sent; an edit is a new working copy while students keep the approved one; invalid areas, subjects and fact sources are named; review-by dates due within 30 days are listed and raise one weekly alert; past the date facts are labelled out of date; archiving an institution hides its programmes; students and signed-out visitors refused; the admin tab | `npm run test:db` → `academic_career_catalogue`, `academic_idor`; `npm run test:e2e` → Careers |
| Career guidance (CAREER-001..004/007/009/010, PRD §22, migration 150) | 24 items, saved per screen, answers 0–3 or not sure, not sure does not count towards finishing; interest levels against the student's own areas (ties share a level); 3–6 options, ≥ 2 clusters, ≤ 2 per cluster, reasons on each, no score or percentage sent; stronger subjects and matching preferences named; a high-interest option without subject support included; saved careers always appear; what changed with its reason; retake after 90 days or now when interests changed; the ranking takes no gender, ethnicity, province, income or disability, and 12 random answer sets give identical options to students who differ only in name, province and age band; export with planner, Coach and careers; screens in Lao and English, axe clean | `npm run test:db` → `academic_career_guidance`, `academic_idor`; `npm run test:e2e` → Career guidance, Export |
| Programmes and scholarships (UNI-003/004/005, migration 155) | A programme field must be a cluster; a scholarship needs its deadline, year, who can apply and source; automatic slug; second-admin approval; only future deadlines listed; pre-filled draft lengths marked not confirmed cannot be sent for review until confirmed (migration 159); save with reminders, one reminder 14 days and one 3 days before, never twice; after the deadline hidden and not saveable; in Download my data; screens: programme on its career option, search by field and entrance group with unconfirmed groups apart, cut-offs with their year, save a scholarship and turn on reminders; admin Scholarships tab | `npm run test:db` → `academic_career_catalogue`, `academic_idor`; `npm run test:e2e` → Career guidance, Careers |
| Guardians see the child's career reports (CAREER-REPORT, migration 158) | Only by the guardian's own active link and only while career answers are shared; turning sharing off or removing the link hides them at once; another child's report and the student calling the guardian view get 404; every view audit-logged; screens: not-shared note, list, report page, back to the child | `npm run test:db` → `academic_career_report`, `academic_idor`; `npm run test:e2e` → Career report |
| Career report and one-time purchase (CAREER-006, BILLING-004, migration 157) | Premium includes it; one open purchase per account; a receipt only from the buyer's own folder; Finance or Admin verifies with a reference (12-month one-time grant) or rejects with a reason, Operations and students refused; the buyer can cancel before review; one alert while purchases wait; a guardian's purchase covers linked children and ends with the link; the report needs the questions answered, is frozen, leaves out facts, programmes and scholarships past their review-by date, and only its owner can open it; a report entitlement also shows the options; in Download my data; screens: buy, accounts, a GIF refused, upload and review, report page in English and Lao, guardian buys and cancels, admin Career report payments with receipt link, verify and reject | `npm run test:db` → `academic_career_report`, `academic_idor`; `npm run test:e2e` → Career report, Finance |
| Guardian links (PARENT-001..004/007..009, QG-4, migration 152) | 8-character single-use code, only its hash kept, at most 5 open, cancel frees a slot; preview shows the student's name; relationship and declaration required; no self-link; a code works once; the student is told and must confirm before the guardian sees anything; another student cannot confirm; scopes apply at once and are audit-logged; removal by either side ends access at once and notifies both; support suspends with a reason, cannot reinstate, an admin reinstates and the case history is kept; at 18 links ask to be kept within 30 days, then pause, and keeping restores access; unconfirmed links lapse after 7 days; a 13–15 profile waits for guardian consent, cannot save scores or make ordinary invites, and continues once a guardian accepts the consent code; screens for the student, the 13–15 consent step, the guardian's Family page and the Support tab | `npm run test:db` → `academic_guardian_links`, `academic_idor`; `npm run test:e2e` → Guardians, Support |
| Guardian view of a child (PARENT-005, migration 153) | Only by the guardian's own active link; shared scores (months, subjects, latest, change, compared with the child's own average, trend), study plan and goals; career interests and goals text only when shared; at most three supportive suggestions; turning scopes off removes sections at once; every view audit-logged; another guardian or the student gets 404; the page shows no rankings or comparisons | `npm run test:db` → `academic_guardian_links`, `academic_idor`; `npm run test:e2e` → Guardians |
| Guardian reports and correction window (PARENT-006, §14.9.4, migration 154) | A month stays hidden for 3 days after submission; no report without Premium on either account; with Premium one report per month, never twice; the seven sections with recorded subjects, scores and the generation date; the guardian is told in the app; opening marks it read; nobody else can open it; a student has at most 4 guardians; when the link ends the reports are no longer available; the report page in supportive words, axe clean | `npm run test:db` → `academic_guardian_links`, `academic_idor`; `npm run test:e2e` → Guardians |
| Guardian report e-mails (NOTIF-002, migration 161) | Only linked guardians with an account e-mail can opt in; confirmation first, nothing else before it; link works once, expires after 48 hours, only its hash kept; at most 3 confirmations a day; one e-mail per report; no score values unless chosen; dropped if unsubscribed, the link ended or scores stopped being shared; one-click unsubscribe without signing in, harmless twice; 5 failures stop retries and raise an alert; token and delivery functions server-only; e-mail rendering without scores has no numbers; screens: Family card, confirm and unsubscribe page, Lao card | `npm run test:db` → `academic_guardian_emails`, `academic_idor`; `npm run test:e2e` → Guardian e-mails |
| Compare school years (DASH-007, migration 162) | Same subject in the student's other years, newest first, aligned by calendar month, submitted months only; normalised values when ranges differ; a custom subject matches by name; a non-normalisable or different-family scale is listed with its reason and no values; another student's subject is refused; screens: chart and table September first as % of each scale, disabled with the reason | `npm run test:db` → `academic_compare_years`, `academic_idor`; `npm run test:e2e` → Compare years |
| Premium ending e-mail (NOTIF-005, migration 163) | Only with the `email` consent and an account e-mail; 7 days and 1 day before (Vientiane), once each; dropped if renewed or consent withdrawn; one-click unsubscribe withdraws the consent and is logged; job server-only; Lao date in the e-mail; screens: My data switch on and off, unsubscribe page for account e-mails | `npm run test:db` → `academic_premium_emails`; `npm run test:e2e` → Consents, Guardian e-mails |
| Exam blueprints (EXAM-001, migration 164) | Two complete drafts for 2026-2027 (Groups A and B, 120 and 90 minutes); group, intake year, sessions with minutes and real subjects required; second-admin approval; students see published ones with source and the current intake (2027-2028); screens: career page section with the not-announced note, admin tab with the not-current flag, sessions edited | `npm run test:db` → `academic_career_catalogue`; `npm run test:e2e` → Career guidance, Careers |
| Mock exams and practice sets (EXAM-001/002, migration 165) | Mock for the current intake, practice otherwise; subjects without enough approved items named and refused; only approved items, none shown before Start; one attempt at a time; server timer, late answers refused, closed on the next request; hand-in moves to the next part; results per subject and topic with bands, review after finishing; 3 free mock exams a year then Premium, practice free; another student refused; export; screens: list, part intro, timer, answering, hand-in warning, time up, results | `npm run test:db` → `academic_mock_exams`, `academic_idor`; `npm run test:e2e` → Mock exams |
| Draft questions and mock next actions (migrations 166–167) | Drafts load as unserved, authorless drafts with AI-marked explanations (safe to re-run); a reviewer approves one, which can then be served; a Needs-practice topic from a finished mock suggests its practice set with the mock-exam reason, a Developing topic without content logs a gap; the weekly card shows the reason | `npm run test:db` → `academic_quiz_bank`, `academic_mock_exams`; `npm run test:e2e` → Mock exams |
| OCR evaluation scoring (AI-010, QG-3) | Field matching by subject and month, correct / flagged / silent classification, accuracy on clear photos, silent rate, flag recall, box units; the harness itself runs on the #9 hold-out set before switch-on (`npm run eval:ocr -- <dir>`, `--replay` re-scores saved replies) | `npm run test:ocr` |
| On-device photo checks (OCR-003, OCR-008) | Dark, blurry and tilted (> 15°) photos flagged, skew measured, perceptual hash stable across light and size, different pages not duplicates | `npm run test:ocr` |
| Scan screens (OCR-001..012) | Scan offered only when switched on, typing stays default; separate consent naming the provider; dark-photo tip that does not block; rotate; JPEG and hash sent; uncertain and unread values must be touched, unknown rows chosen or skipped, other-student warning acknowledged; exact confirm audit; delete photo; duplicate reused without upload; Type instead carries only values ≥ 0.9; failure keeps no photo; used-up allowance; stored photos listed in My data and deleted; admin Scan quality tab with alerts | `npm run test:e2e` → My Scores browser checks |
| Explanations (ANALYSIS-004) | Every template in Lao and English, every label × trend × confidence and every F6–F10 golden case through the cause filter; DASH-005 reasons | `npm run test:insights` |
| API / contract | Every RPC: error contract, idempotency, rate limits, validation | `npm run test:db` (PGlite, all module migrations) |
| Security (IDOR) | Registry of every callable RPC × other students' ids; RLS backstop | `academic_idor`, `academic_policies` |
| End-to-end | 30 student and 14 admin journeys (Finance: Entitlements), Android 360 px and desktop, Lao and English, with axe checks | `npm run test:e2e` |
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
