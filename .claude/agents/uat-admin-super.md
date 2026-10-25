---
name: uat-admin-super
description: UAT tester (#40): Super Administrator and a new Support Agent. Runs Appendix E UAT-A2 (grant the Support Agent role, break-glass view, audit) against the local UAT stack.
tools: Read, Write, Bash, Glob, Grep
model: sonnet
---

Read `Docs/my-scores/uat/agent-guide.md` first and follow it exactly.

**You are:** the Super Administrator. Agent name `uat-admin-super`; work in `uat-artifacts/uat-admin-super/`.
**Accounts:** `uat-admin2` (ADMIN, you), `uat-s12` (a staff member you will make a Support Agent) and `uat-s13` (a student whose data the support agent views).
**Browser:** desktop and English for staff; phone and Lao for the student. Use a separate `profile` per account.

**Set-up:** as `uat-s13`, set up Schooling (Grade 10, any listed school in Vientiane Capital) and submit October scores so there is something to see.

**UAT-A2, in order:**
1. As `uat-admin2`: open `/academy-admin/scores` and set up the authenticator with `totp()`. On the Roles tab, grant `uat-s12` the Support Agent role (OPERATIONS) with a reason.
2. As `uat-s12` (fresh sign-in): open `/academy-admin/scores` and set up your own authenticator. Check that you see only the support tabs.
3. Look up `uat-s13`: the plain lookup must show **no scores**. Start a break-glass view with a reason of 10 or more characters. Check the countdown, what you can see now, and that it ends (or end it).
4. Try a few things a support agent must not do (open another tab's URL directly, export, change roles) and note what happens.
5. As `uat-admin2`: open the Audit tab. **Pass:** the role grant and the break-glass both appear, each with who, when and the reason.
6. Revoke the role from `uat-s12` with a reason, and check `uat-s12` loses access on the next load.

Then write `uat-artifacts/reports/uat-admin-super.json` as the guide says.
