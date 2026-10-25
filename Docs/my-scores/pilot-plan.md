# Schooling — closed pilot plan (REL-001, #46)

**Status:** draft for the owner's approval. This plan does not itself approve
the launch. The pilot starts only when the go/no-go owner signs off the entry
gates below.

**Go/no-go owner:** Jongka Labs. One decision-maker, who decides at the entry gate and at the
end-of-pilot review. Owner's alert inbox: bitdoin0@gmail.com.

## 1. What is piloted

Phase 1 only:
- **Set-up:** the profile.
- **Monthly score entry:** drafts, statuses, corrections and history.
- **Dashboard:** F1–F5, with chart tables.
- **In-app and push reminders.**
- **My data:** consents, export and deletion.

Not in the pilot: score-book photos (OCR), strength and weakness labels,
diagnostics, recommendations, AI chat, guardians and payments (PRD §36.2).

## 2. Cohort

| | Plan |
|---|---|
| Size | 3–5 schools or communities. Aim for **40–60 students each and 150–250 in total**, so that per-cohort figures clear the 20-student minimum and the whole pilot has enough data for the §36.4 thresholds. |
| Mix | At least one Vientiane Capital school, one provincial or rural school with weak connectivity, and one community group (club or tutoring centre). Grades 10–12. |
| Access | One **cohort and code** per school, in Admin → Schooling → **Pilot** (migration 128). Students enter the code once, during set-up. A cap stops sign-ups at the agreed number. With the **pilot gate on**, nobody can set up Schooling without a code. Students already using Schooling keep access and are counted outside the cohorts. |
| Consent | As decided (OD-07 interim, pending #4): students aged 13 and over agree to the versioned notice themselves; under-13s are blocked before anything is stored. Recommended: a one-page information letter for parents, given out by the school, saying what is collected, that it stays private, and how to delete it. |
| School contact | One named coordinator per cohort (teacher or club leader): hands out codes and collects feedback. They have no access to students' scores. |

## 3. Entry gates (PRD §36.3; all must be ticked before the gate opens)

| Gate | Evidence | Status 2026-10-25 |
|---|---|---|
| P0 acceptance criteria pass | Automated suites green in CI. | Done |
| QG-1 calculation accuracy | Golden fixtures F1–F5 (#37). | Done |
| QG-2 data isolation | IDOR registry and RLS tests (#36). The shared-phone cache leak was found and fixed (#38). | Done |
| No high or critical security findings | `security-review.md` (#35). | Done |
| Monitoring and alerts | Health tab; alert e-mails verified (#42). | Done |
| Backups and restore drill | Nightly backup; weekly drill passed (#43). | Done |
| Usage events and pilot metrics | #44, #45; ratings and go/no-go panel (#46). | Done |
| **Legal review of the consent approach** | Counsel's answer on #4. | Done (#4 closed 2026-10-25) |
| **UAT S1–S4 and A1–A2** with 10 students and 2 admins | #40 | Done (#40 closed 2026-10-25) |
| **Lao copy approved by two native educators** | #39 checklist | Waived by the owner 2026-10-25; not reviewed |
| **TalkBack and 200% text on a real Android phone** | #39 checklist | Waived by the owner 2026-10-25; not tested |
| Performance NFR-001/002 on the reference device | Health tab during UAT: dashboard p75 ≤ 2.5 s, reads p95 ≤ 300 ms, writes p95 ≤ 500 ms. | Waived by the owner 2026-10-25; not measured, watch the Health tab during the pilot |
| Support ready | This plan §6, macros in `support-macros.md` reviewed in Lao, agents with the OPERATIONS role and an authenticator app. | Macros drafted; Lao review open |

## 4. Run sheet

| When | What | Who |
|---|---|---|
| T−14 days | Entry gates reviewed; schools confirmed; cohorts created and codes printed on cards (one card per student, code and "Academy → Schooling"); coordinators briefed. | Pilot lead |
| T−7 | Support channels staffed; support agents trained on the macros and on emergency access (reason required, 30 minutes, audited); a test student account runs through set-up on a low-end Android phone. | Pilot lead, support |
| T−1 | **Turn the pilot gate on** (Pilot tab, with reason). Health tab all Met or "not enough data"; last backup and drill green; send a test alert. | Admin |
| T0, per school | 20-minute session in class: open Academy → Schooling, enter the code, set up together (school list, subjects), enter last month's scores. Coordinator keeps spare cards. | Pilot lead, coordinator |
| Every Monday | Metrics tab per cohort; Health tab; support tickets and incidents; short weekly note to the owner (template §7). | Pilot lead |
| Day 7 per cohort | First-entry checkpoint: below 40% → call the coordinator and check what blocked set-up or entry. | Pilot lead |
| Week 3 | 5 short interviews per cohort (phone or in person): what was hard, what was useful, reminders. | Pilot lead |
| Month 1 end | Reminder behaviour checked (opens and dismissals); second-month recording starts to show. | Pilot lead |
| T+45–60 | **Go/no-go review** with at least one full monthly cycle, ideally two (§32.5). | Owner decides |

## 5. Go / no-go (PRD §36.4; Metrics tab → "Pilot go / no-go")

| Measure | Go | Iterate | Stop / rethink |
|---|---|---|---|
| First entry within 7 days | ≥ 60% | 40–59% | < 40% |
| Second-month recording (of first-month recorders) | ≥ 50% | 30–49% | < 30% |
| Median entry time, returning months | ≤ 90 s | 91–150 s | > 150 s |
| Usefulness rated 4–5 (in-app rating) | ≥ 60% | 40–59% | < 40% |
| Entry rated easy, 4–5 (UAT exit, §35.5) | ≥ 80% | — | below: fix before opening |
| Severe privacy or security incidents | 0 | — | ≥ 1 → pause |

**Decisions:**
- **Go:** open Schooling to everyone (Pilot tab → *Open to everyone*). Cohorts stay tagged for comparison. Set Phase 1 targets at the pilot median plus improvement goals (§32.5).
- **Iterate:** fix the cause, keep the gate, and extend the pilot by 4 weeks.
- **Stop / rethink:** switch the module off (release runbook, *Feature flag*), keep the data under the notice, and review with the owner.

Read figures as descriptions of what students did, never as proof that
Schooling improved results (§32.4). Groups under 20 students stay hidden.

## 6. Support playbook

- **Channels:** Bitdoin's existing WhatsApp, Messenger, phone and e-mail. Answers use the macros in `support-macros.md`, in the student's language.
- **Hours and targets:**

  | Severity | Examples | First reply | Resolution or escalation |
  |---|---|---|---|
  | S1 safety | Risk to a child (§29.8) | Same day; at the latest within 1 business day | Owner informed immediately |
  | S1 privacy | Someone saw another student's scores; account takeover | Within 4 hours | Breach procedure (below) |
  | S2 | Cannot set up or submit; data looks wrong | 1 business day | Fix or workaround within 3 business days |
  | S3 | Questions, suggestions | 2 business days | — |

- **Support tools:** Admin → Schooling → **Support** (OPERATIONS role with an authenticator app).
  - **Lookup:** by member code; scores stay hidden.
  - **Emergency access** to scores only with a ticket reason of 10 or more characters. It lasts 30 minutes and every look is audited (§29.6).
- **Never:**
  - ask for passwords or one-time codes;
  - read scores out over chat;
  - ask minors for personal contact details (§29.8).
- **Breach response (§29.9):**
  1. Detect (alerts).
  2. Contain: switch the module off; revoke keys if needed.
  3. Assess within 24 hours.
  4. Tell the owner and counsel immediately.
  5. Notify people as the law requires.
  6. Hold a review within 10 business days.
- **Kill switch:** release runbook → *Feature flag*. It takes effect at once and deletes nothing.

## 7. Feedback loop

- **In-app ratings:** after a student's second month, Schooling asks once, in Lao or English, how useful it is and how easy entry is (1–5, no text). Answers are usage events and respect the student's statistics switch.
- **Coordinators:** a weekly message (WhatsApp) with blockers and questions from students.
- **Interviews:** in week 3 (§4).
- **Weekly note to the owner (template):**
  - students per cohort and total;
  - the go/no-go readings and how they moved since last week;
  - top 3 support issues with counts;
  - incidents (none / description);
  - fixes shipped;
  - decisions needed.
- **Triage:**
  - Bugs go to GitHub issues labelled `pilot`.
  - S1/S2 bugs are fixed before the next weekly note.
  - Copy changes go to the native-educator reviewers before release.

## 8. After the pilot

On **go**, open to everyone and keep the cohorts for comparison. Close #46/#47 in
order: #47 (general availability) needs the legal opinion confirmed for all age
bands and the pilot's targets set.
