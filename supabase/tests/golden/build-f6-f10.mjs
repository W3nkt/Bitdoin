// Builds the versioned golden fixture for labels and trends, F6–F10 (P2-ANL, #49):
//   node supabase/tests/golden/build-f6-f10.mjs
// Inputs live here; expected values come from reference.mjs (exact fractions,
// p as a number) and are frozen into f6-f10.v1.json. Changing an expected
// value means a new fixture version, reviewed like a formula change.
import { writeFileSync } from 'node:fs'
import { analyseSubjects, THRESHOLDS_V2 } from './reference.mjs'

const S010 = { school: 'school', min: 0, max: 10 }
const S050 = { school: 'school50', min: 0, max: 50 }
const months = (table, seqs) => {
  const names = Object.keys(table)
  return table[names[0]].map((_, i) => ({ seq: seqs ? seqs[i] : i + 1, lines: Object.fromEntries(names.map((name) => [name, table[name][i]])) }))
}
const G01 = {
  MATH: [6, 7, 6.5, 5.5, 5, 5.5],
  PHYS: [7, 6, 6.5, 6, 'missing', 6],
  CHEM: [7.5, 8, 8, 8.5, 8, 8.5],
  BIO: [8.5, 9, 8.5, 9, 9, 9.5],
  LAO: [8, 8, 7.5, 8, 8, 8],
  ENG: [6, 7, 5, 8, 6, 7.5],
}

const CASES = [
  {
    id: 'L01', title: 'PRD §20.9 worked example: labels, trends and confidence for six subjects', source: 'PRD §20.9',
    scale: S010,
    months: months(G01),
    // The PRD's published table (2 dp; "above" is the numerator of A_j).
    prd: {
      MATH: { D: -1.39, above: 0, sd: 0.74, slope: -0.33, p: 0.18, label: 'relatively_lower', label_confidence: 'high', trend: 'declining', trend_confidence: 'medium' },
      PHYS: { D: -1.03, above: 0, sd: 0.45, slope: -0.18, p: 0.27, label: 'relatively_lower', label_confidence: 'medium', trend: 'no_clear_trend', trend_confidence: null },
      CHEM: { D: 0.77, above: 6, sd: 0.38, slope: 0.17, p: 0.1, label: 'relatively_stronger', label_confidence: 'medium', trend: 'improving', trend_confidence: 'medium' },
      BIO: { D: 1.61, above: 6, sd: 0.38, slope: 0.17, p: 0.1, label: 'relatively_stronger', label_confidence: 'high', trend: 'improving', trend_confidence: 'medium' },
      LAO: { D: 0.61, above: 6, sd: 0.2, slope: 0, p: 1, label: 'neutral', label_confidence: null, trend: 'no_clear_trend', trend_confidence: null },
      ENG: { D: -0.73, above: 1, sd: 1.11, slope: 0.3, p: 0.57, label: 'neutral', label_confidence: null, trend: 'volatile', trend_confidence: 'medium' },
    },
  },
  {
    id: 'L02', title: 'Label thresholds met exactly: D = ±0.75 and 3 of 5 months on the same side', source: '§20.3, §20.4',
    scale: S010,
    months: months({ S1: [9, 9, 9, 5.5, 5], S2: [6, 6, 6, 6, 6] }),
  },
  {
    id: 'L03', title: 'Deviation over the threshold but on the same side in only 2 of 5 months; a month at the mean counts for neither side', source: 'CALC-5',
    scale: S010,
    months: months({ S1: [10, 10, 4.5, 4.5, 5], S2: [5, 5, 5, 5, 5] }),
  },
  {
    id: 'L04', title: 'Minimum data: a label needs 3 months with a shown mean, a trend needs 4 scores', source: '§20.3 minimum values',
    scale: S010,
    months: months({ S1: [8, 'missing', 8], S2: [6, 6, 6], S3: [6, 6, 6] }),
  },
  {
    id: 'L05', title: 'A month whose mean is hidden (coverage 1/4) gives no deviation but still counts for the trend', source: '§20.7, CALC-4',
    scale: S010,
    months: months({ S1: [8, 8, 9, 8, 8], S2: [6, 6, 'missing', 6, 6], S3: [6, 6, 'missing', 6, 6], S4: [6, 6, 'missing', 6, 6] }),
  },
  {
    id: 'L06', title: '0–50 scale: slope exactly 0.75 (0.15 × 5) is improving, a slope of 0.5 is not', source: '§20.3 scale adjustment',
    scale: S050,
    months: months({ S1: [30, 30, 31, 31, 34], S2: [30, 30, 31, 31, 32] }),
  },
  {
    id: 'L07', title: '0–50 scale: D exactly ±3.75 (0.75 × 5) gives a label; SD exactly 5 (1.0 × 5) is volatile', source: '§20.3 scale adjustment',
    scale: S050,
    months: months({ S1: [40, 40, 40, 30], S2: [30, 30, 30, 30] }),
  },
  {
    id: 'L08', title: 'Volatility at exactly SD 1.0', source: '§20.5',
    scale: S010,
    months: months({ S1: [6, 8, 6, 8, 7], S2: [6, 8, 6, 7.5, 7] }),
  },
  {
    id: 'L09', title: 'Eight months: high label and trend confidence; labels use the last six months, trends the whole enrolment', source: '§20.6, CALC-4',
    scale: S010,
    months: months({ S1: [6, 6, 6.5, 6.5, 7, 7, 7.5, 7.5], S2: [4, 4, 4, 4, 4, 4, 4, 4] }),
  },
  {
    id: 'L10', title: 'Declining with a month not recorded: Theil–Sen uses the real month numbers', source: '§20.7 missing whole period',
    scale: S010,
    months: months({ S1: [8, 7.5, 7, 6.5, 6.5, 6], S2: [6, 6, 6, 6, 6, 6] }, [1, 2, 4, 5, 6, 7]),
  },
  {
    id: 'L11', title: 'A steady rise of 0.5 a month for 8 months is "volatile": SD ≥ 1.0 wins over the slope as §20.5 is written', source: '§20.5 (to calibrate with reviewers)',
    scale: S010,
    months: months({ S1: [4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5] }),
  },
]

const fixture = {
  version: 'f6-f10.v1',
  engine: 'f1-f10@2.0.0',
  config: THRESHOLDS_V2,
  generated_by: 'supabase/tests/golden/reference.mjs (exact fractions, independent of the SQL engine)',
  notes: 'Expected values are exact fractions as strings, except p (a number). Engine output must match to 1e-9; SD is compared as sqrt(variance). Periods are monthly sequences of the 2026-2027 national calendar (1 = September).',
  cases: CASES.map((c) => ({ ...c, expected: analyseSubjects(c.months, c.scale) })),
}

writeFileSync(new URL('./f6-f10.v1.json', import.meta.url), `${JSON.stringify(fixture, null, 2)}\n`)
console.log(`wrote ${fixture.cases.length} cases to f6-f10.v1.json`)
