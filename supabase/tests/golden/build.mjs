// Builds the versioned golden fixture for F1–F5 (QA-001, #37):
//   node supabase/tests/golden/build.mjs
// Inputs live here; expected values come from reference.mjs (exact
// fractions) and are frozen into f1-f5.v1.json. Changing an expected value
// means a new fixture version, reviewed like a formula change
// (Docs/my-scores/test-plan.md).
import { writeFileSync } from 'node:fs'
import { analyse } from './reference.mjs'

const S010 = { school: 'school', min: 0, max: 10 }
const S050 = { school: 'school50', min: 0, max: 50 }
const months = (table, from = 1) => {
  const names = Object.keys(table)
  return table[names[0]].map((_, i) => ({ seq: from + i, lines: Object.fromEntries(names.map((name) => [name, table[name][i]])) }))
}

const CASES = [
  {
    id: 'G01', title: 'PRD §20.9 worked example: six subjects, six months, Physics January missing', source: 'PRD §20.9 / Appendix C (C1)',
    scale: S010,
    months: months({
      MATH: [6, 7, 6.5, 5.5, 5, 5.5],
      PHYS: [7, 6, 6.5, 6, 'missing', 6],
      CHEM: [7.5, 8, 8, 8.5, 8, 8.5],
      BIO: [8.5, 9, 8.5, 9, 9, 9.5],
      LAO: [8, 8, 7.5, 8, 8, 8],
      ENG: [6, 7, 5, 8, 6, 7.5],
    }),
    // The PRD's published figures (2 dp), checked separately from the exact values.
    prd: {
      period_means: [7.17, 7.5, 7, 7.5, 7.2, 7.5],
      period_changes: [null, 0.33, -0.5, 0.5, -0.3, 0.3],
      rolling: [null, null, 7.22, 7.33, 7.23, 7.4],
      subject_means: { MATH: 5.92, PHYS: 6.3, CHEM: 8.08, BIO: 8.92, LAO: 7.92, ENG: 6.58 },
    },
  },
  {
    id: 'G02', title: 'Only three months (C4): no rolling mean before month 3, subject means from 2–3 values', source: 'Appendix C (C4)',
    scale: S010,
    months: months({ S1: [6, 6.5, 7], S2: [7, 7, 7], S3: [8, 8, 8.5], S4: [9, 9, 9] }),
  },
  {
    id: 'G03', title: 'Zero scores and every status (C5): 0 is a score; missing stays in the denominator; N/A and exempt leave it', source: 'Appendix C (C5), §20.7',
    scale: S010,
    months: months({
      S1: [0, 0, 'missing', 10],
      S2: [5, 0, 'missing', 'missing'],
      S3: [6, 0, 'missing', 8],
      S4: ['missing', 0, 4, 9],
      S5: ['not_applicable', 0, 'not_applicable', 'not_applicable'],
      S6: ['exempt', 0, 'exempt', 'exempt'],
    }),
  },
  {
    id: 'G04', title: 'Coverage just below and exactly at 50%', source: 'F1 minimum data, §20.7',
    scale: S010,
    months: months({
      S1: [7, 7, 7, 7], S2: [7, 7, 7, 7], S3: [7, 7, 7, 7], S4: [7, 'missing', 'missing', 7],
      S5: ['missing', 'missing', 'missing', 7], S6: ['missing', 'missing', 'missing', 7], S7: ['missing', 'missing', 'not_applicable', 7],
    }),
  },
  {
    id: 'G05', title: 'A month not recorded: changes skip it, rolling means need three consecutive months', source: '§20.7 missing whole period, CALC-3',
    scale: S010,
    months: [1, 2, 4, 5, 6].map((seq, i) => ({ seq, lines: { S1: [6, 6.5, 7, 7.5, 8][i], S2: [7, 7, 7, 7, 7.5][i], S3: [5, 6, 6, 6.5, 6][i] } })),
  },
  {
    id: 'G06', title: '"About the same" band edges on 0–10: ±0.25 is a change, 0.125 is not', source: 'CALC-1',
    scale: S010,
    months: months({ S1: [6, 6, 6, 6], S2: [6, 6, 6, 6], S3: [6, 6, 6.5, 6], S4: [6, 7, 7, 6.5] }),
  },
  {
    id: 'G07', title: '0–50 scale: the band scales to 1.25', source: 'CALC-1, §20.3',
    scale: S050,
    months: months({ S1: [30, 30, 31, 32, 33], S2: [30, 30, 31, 32, 33], S3: [30, 31, 32, 32, 33], S4: [30, 31, 31, 32, 34] }),
  },
  {
    id: 'G08', title: 'Eight months: subject means use the last six submitted months only', source: 'CALC-2',
    scale: S010,
    months: months({ S1: [2, 4, 6, 6, 6, 6, 6, 6], S2: [9, 9, 'missing', 8, 8, 8, 8, 'missing'], S3: [5, 5, 5, 5, 5, 5, 5, 10] }),
  },
  {
    id: 'G09', title: 'Transfer to a 0–50 school in month 4 (C2/C3): each enrolment is analysed on its own scale', source: 'Appendix C (C2, C3), §20.7',
    scale: S010,
    months: months({ S1: [6, 7, 8], S2: [5, 5, 6], S3: [9, 9, 9] }),
    transfer: { effective_seq: 4, scale: S050, months: months({ S1: [35, 40, 40], S2: [25, 25, 30], S3: [45, 'missing', 45] }, 4) },
  },
  {
    id: 'G10', title: 'Retry and correction: a replayed submit changes nothing; a corrected score changes F1, F3, F5 and F2', source: 'SCORE-007, ANALYSIS-006',
    scale: S010,
    months: months({ S1: [6, 6, 7], S2: [7, 7, 7], S3: [8, 8, 8], S4: [5, 6, 6] }),
    retry_seq: 3,
    correction: { seq: 2, subject: 'S1', value: 9 },
  },
]

const expectedFor = (scale, list) => analyse(list, scale)

const fixture = {
  version: 'f1-f5.v1',
  engine: 'f1-f5@1.0.0',
  config: { window_size: 6, coverage_min: '1/2', about_same_band_0_10: '1/4' },
  generated_by: 'supabase/tests/golden/reference.mjs (exact fractions, independent of the SQL engine)',
  notes: 'Expected values are exact fractions as strings. Engine output must match to 1e-9. Periods are monthly sequences of the 2026-2027 national calendar (1 = September).',
  cases: CASES.map((c) => {
    const corrected = c.correction
      ? c.months.map((m) => (m.seq === c.correction.seq ? { ...m, lines: { ...m.lines, [c.correction.subject]: c.correction.value } } : m))
      : c.months
    return {
      ...c,
      expected: c.transfer
        ? { before: expectedFor(c.scale, c.months), after: expectedFor(c.transfer.scale, c.transfer.months) }
        : expectedFor(c.scale, corrected),
    }
  }),
}

writeFileSync(new URL('./f1-f5.v1.json', import.meta.url), `${JSON.stringify(fixture, null, 2)}\n`)
console.log(`wrote ${fixture.cases.length} cases to f1-f5.v1.json`)
