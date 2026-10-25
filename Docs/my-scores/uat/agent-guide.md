# UAT tester agents — shared guide (QA-004, #40)

Read this first. You are one of 12 testers (10 students, 2 admins) running the
Phase 1 UAT scripts of Schooling (My Scores), PRD Appendix E, for #40. You use
the real app in a real browser against a **local** copy of the system, follow
your scripts like a real user would, and report what you find. You are
synthetic: your report finds defects, it is not consented user feedback.

## Environment (already running, do not start or stop it)

| | |
|---|---|
| App | http://localhost:4174 (built from this repo) |
| Backend | local Supabase, every migration applied, MoES school list and 2026–27 curriculum loaded; every scheduled job paused |
| Accounts | `uat-artifacts/accounts.json`; password for all: in that file. Use **only your assigned accounts** (your definition lists them). |
| Browser helpers | `scripts/uat/lib.mjs`: `open({ device, lang, theme, agent, profile, network })` (see its comments: `profile` keeps storage across close/reopen, `context.setOffline(true)` for offline), `signIn(page, account('uat-s01'))`, `url(path)`, `shot(page, agent, name)`, `axe(page)`, `totp(secret)` |
| Read-only data check | `node scripts/uat/stack.mjs sql "select …"` (select only; use sparingly, to confirm what the UI shows) |
| Specs | `Docs/New Student Feature/` (PRD; Appendix E = UAT scripts), `Docs/my-scores/*.md` (decisions, runbooks, support replies) |

Today is the real date (late October 2026): September and October 2026 are open
for score entry; later months are not yet. Appendix E says "November" for S3:
use September instead (it is the open month you have not entered yet).

## Phase 1 UAT scripts (PRD Appendix E)

| ID | Who | Script | Pass criteria |
|---|---|---|---|
| UAT-S1 | New student | Sign in → open My Scores → complete onboarding with a listed school → confirm subjects | Profile created ≤ 2 min; subjects match the score book (your definition lists them) |
| UAT-S2 | Student | Enter October scores incl. one "Not recorded yet"; deliberately type 11 then fix; review; confirm | Error shown for 11; mean excludes the missing subject; dashboard updates |
| UAT-S3 | Student | Go offline; enter September scores; close the browser; reopen; reconnect | Draft restored; submission syncs once (exactly one submitted September entry) |
| UAT-S4 | Student | Correct October Mathematics from 7 to 7.5 with a reason; open history | Revision visible with old and new values |
| UAT-A1 | Education Content Manager | Create a school from the free-text queue; assign a 0–100 scale and a term calendar; map the student | The student sees the new scale on their next entry |
| UAT-A2 | Super Administrator | Grant the Support Agent role; the Support Agent performs a break-glass view | Audit shows the grant and the break-glass, each with its reason |

"≤ 2 min" is for a person: record your elapsed time and the number of screens
and decisions, and judge whether a first-time Grade 10–12 student could do it in
2 minutes.

After your second recorded month, a rating card may appear (it needs usage
statistics on). Check it works, answer it as your persona would, and put the
same two answers in your report under `ratings`; they are labelled synthetic.

### How to drive the app

Write small Playwright scripts in `uat-artifacts/<your-agent-name>/` (for
example `01-onboarding.mjs`), import the helpers with
`import { … } from '../../scripts/uat/lib.mjs'`, and run them with
`node uat-artifacts/<agent>/01-onboarding.mjs`. Work step by step: run a
short script, read its screenshot (the Read tool shows images), then write the
next. Prefer user-visible locators (`getByRole`, `getByLabel`, `getByText`) —
if you cannot find a control the way a user would, that is itself a finding.

Admins: the first visit to `/academy-admin/scores` asks you to set up an
authenticator app. Read the secret shown on the page and use `totp(secret)`
for the 6-digit code; keep the secret in your folder for later sign-ins.

## Rules

1. Only your accounts; never sign in as another persona's account.
2. Write only inside `uat-artifacts/<your-agent-name>/` and your report.
   Never edit the app's source, migrations, tests or docs.
3. Never run `stack.mjs up|down|serve|today|reminders`, and never switch the
   pilot gate or change settings other than what your script asks for.
4. Never open any production URL (bitdoin.store, *.supabase.co).
5. Reproduce every finding at least twice before reporting it; note it as
   `suspected` if you could not.
6. Budget: cover all your scripts, then stop. Do not loop on one problem for
   more than ~10 minutes — report it and move on.

## Severity

| | Meaning | Examples |
|---|---|---|
| S1 | Privacy/security failure, data loss, or a core journey blocked | another student's data visible; a submitted score disappears; cannot finish set-up |
| S2 | Core journey wrong or very hard | averages wrong; correction not applied; Lao text unreadable on a screen |
| S3 | Confusing, inconsistent, minor functional, accessibility AA failure | unclear error; button without label; contrast failure |
| S4 | Cosmetic or wording | spacing; awkward but understandable copy |

## Report (required)

Write `uat-artifacts/reports/<your-agent-name>.json`:

```json
{
  "agent": "uat-…",
  "persona": "one line",
  "environment": { "device": "phone", "lang": "lo" },
  "scripts": [{ "id": "UAT-S1", "result": "pass|fail|blocked", "notes": "…" }],
  "findings": [{
    "id": "uat-…-1",
    "severity": "S1|S2|S3|S4",
    "title": "short, specific",
    "area": "onboarding|entry|dashboard|history|privacy|reminders|admin|support|pilot|accessibility|language|security|performance",
    "steps": ["…"],
    "expected": "…",
    "actual": "…",
    "evidence": ["uat-artifacts/<agent>/…png"],
    "reproduced": 2,
    "confidence": "confirmed|suspected"
  }],
  "ratings": { "usefulness": 4, "entry_ease": 5, "synthetic": true },
  "timings": { "onboarding_seconds": 0, "screens": 0 },
  "worked_well": ["…"],
  "notes": "anything the human UAT should watch"
}
```

Then reply with a 5-line summary: scripts passed/failed, findings by severity,
and the single most important issue.
