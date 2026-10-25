export const meta = {
  name: 'uat-40-phase1',
  description: 'UAT #40: 10 student + 2 admin testers run Appendix E S1-S4/A1-A2 on the local stack; each finding independently re-verified',
  phases: [
    { title: 'Test', detail: '12 testers run their UAT scripts' },
    { title: 'Verify', detail: 'independent reproduction of S1-S3 findings with fresh accounts' },
  ],
}

const TESTERS = [
  ...Array.from({ length: 10 }, (_, i) => {
    const n = String(i + 1).padStart(2, '0')
    return { id: `uat-student-${n}`, verifyAccounts: `uat-s${21 + i}` }
  }),
  { id: 'uat-admin-content', verifyAccounts: 'uat-admin3 (admin) and uat-s31 (student)' },
  { id: 'uat-admin-super', verifyAccounts: 'uat-admin4 (admin), uat-s32 (grantee) and uat-s33 (student)' },
]

const FINDING = {
  type: 'object',
  properties: {
    id: { type: 'string' }, severity: { type: 'string', enum: ['S1', 'S2', 'S3', 'S4'] }, title: { type: 'string' },
    area: { type: 'string' }, steps: { type: 'array', items: { type: 'string' } }, expected: { type: 'string' },
    actual: { type: 'string' }, evidence: { type: 'array', items: { type: 'string' } },
    reproduced: { type: 'number' }, confidence: { type: 'string', enum: ['confirmed', 'suspected'] },
  },
  required: ['id', 'severity', 'title', 'area', 'steps', 'expected', 'actual', 'confidence'],
}
const REPORT = {
  type: 'object',
  properties: {
    agent: { type: 'string' },
    scripts: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, result: { type: 'string', enum: ['pass', 'fail', 'blocked'] }, notes: { type: 'string' } }, required: ['id', 'result', 'notes'] } },
    findings: { type: 'array', items: FINDING },
    ratings: { type: 'object', properties: { usefulness: { type: 'number' }, entry_ease: { type: 'number' } } },
    onboarding_seconds: { type: 'number' },
    worked_well: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
  required: ['agent', 'scripts', 'findings', 'notes'],
}
const VERDICTS = {
  type: 'object',
  properties: {
    verdicts: { type: 'array', items: { type: 'object', properties: {
      id: { type: 'string' },
      verdict: { type: 'string', enum: ['reproduced', 'not_reproduced', 'expected_behaviour', 'harness_artifact'] },
      severity: { type: 'string', enum: ['S1', 'S2', 'S3', 'S4'] },
      reason: { type: 'string' },
      evidence: { type: 'array', items: { type: 'string' } },
      likely_cause: { type: 'string' },
    }, required: ['id', 'verdict', 'severity', 'reason'] } },
  },
  required: ['verdicts'],
}

const testPrompt = (t) => `You are the UAT tester \`${t.id}\` for issue #40.
Your definition is \`.claude/agents/${t.id}.md\`: read it, then read \`Docs/my-scores/uat/agent-guide.md\`, and do exactly what they say.
The local stack is already running (app http://localhost:4174, accounts in uat-artifacts/accounts.json). Do not start, stop or rebuild anything.
Never open bitdoin.store or any *.supabase.co URL. Never edit files outside uat-artifacts/${t.id}/ and uat-artifacts/reports/${t.id}.json.
When done, write the report file, then return the same content (without the persona/environment fields) as your structured output. Include every script with pass/fail/blocked.`

const verifyPrompt = (t, findings) => `You are an independent UAT verifier for issue #40. Another tester (\`${t.id}\`) reported the findings below against the local UAT stack (app http://localhost:4174).
Read \`Docs/my-scores/uat/agent-guide.md\` (same rules apply to you) and the tester's definition \`.claude/agents/${t.id}.md\` for context.
Use ONLY these fresh accounts: ${t.verifyAccounts}. Work in \`uat-artifacts/verify-${t.id}/\`. Never open production URLs. Do not edit app source.

For each finding, try to reproduce it yourself from scratch with your own Playwright scripts. Be skeptical: decide one of
- reproduced: you saw the same defect;
- not_reproduced: you followed the steps and it did not happen;
- expected_behaviour: the app behaves as specified (check Docs/my-scores/decision-register.md, the PRD Appendix E table in the guide, and the source under src/ and supabase/migrations/ if needed);
- harness_artifact: caused by the test harness (Playwright, headless browser, the local stack, the tester's own script) rather than the app.
Re-grade severity with the guide's scale. If reproduced, point to the likely cause in the source (file and function) if you can find it quickly.

Findings:
${JSON.stringify(findings, null, 2)}`

const results = await pipeline(
  TESTERS,
  (t) => agent(testPrompt(t), { label: `test:${t.id}`, phase: 'Test', schema: REPORT, agentType: t.id }),
  async (report, t) => {
    if (!report) return { tester: t.id, report: null, verdicts: [] }
    const toVerify = report.findings.filter((f) => f.severity !== 'S4')
    log(`${t.id}: ${report.scripts.map((s) => `${s.id} ${s.result}`).join(', ')}; ${report.findings.length} findings (${toVerify.length} to verify)`)
    if (!toVerify.length) return { tester: t.id, report, verdicts: [] }
    const v = await agent(verifyPrompt(t, toVerify), { label: `verify:${t.id}`, phase: 'Verify', schema: VERDICTS, model: 'sonnet' })
    return { tester: t.id, report, verdicts: v ? v.verdicts : [] }
  },
)
return results
