// Strings for subject labels, trends and explanations (P2-ANL, #49: DASH-005,
// ANALYSIS-004). Kept apart from copy.ts, which spreads them in, so the
// explanation check (scripts/test-insights.mjs) can load them without React.
//
// Lao strings and the explanation templates reviewed and approved by the
// owner on 2026-10-25 (ANALYSIS-004 sign-off). Changes need the same review.
//
// "What your scores show" states only what the snapshot holds. "Things that
// sometimes help" are suggestions. Neither ever names a cause to do with
// intelligence, motivation, personality, health or learning difficulties
// (BANNED_CAUSE_TERMS in insights.ts).

export const insightsCopy = {
  'insights.title': { en: 'Compared with your own average', lo: 'ທຽບກັບຄ່າສະເລ່ຍຂອງເຈົ້າເອງ' },
  'insights.note': {
    en: 'Each subject is compared with your overall average in the same months, never with other students.',
    lo: 'ແຕ່ລະວິຊາ ທຽບກັບຄ່າສະເລ່ຍລວມຂອງເຈົ້າໃນເດືອນດຽວກັນ, ບໍ່ທຽບກັບນັກຮຽນຄົນອື່ນ.',
  },
  'insights.stronger': { en: 'Stronger subjects', lo: 'ວິຊາທີ່ເດັ່ນກວ່າ' },
  'insights.attention': { en: 'Subjects needing attention', lo: 'ວິຊາທີ່ຄວນເອົາໃຈໃສ່' },
  'insights.emptyList': { en: 'None at the moment', lo: 'ບໍ່ມີໃນຕອນນີ້' },
  'insights.insufficient': {
    en: 'Add scores for at least 3 months to see which subjects stand out from your average.',
    lo: 'ເພີ່ມຄະແນນຢ່າງໜ້ອຍ 3 ເດືອນ ເພື່ອເບິ່ງວ່າວິຊາໃດແຕກຕ່າງຈາກຄ່າສະເລ່ຍຂອງເຈົ້າ.',
  },
  'insights.none': {
    en: 'No subject stands out from your average at the moment.',
    lo: 'ຕອນນີ້ ຍັງບໍ່ມີວິຊາໃດແຕກຕ່າງຈາກຄ່າສະເລ່ຍຂອງເຈົ້າຢ່າງຊັດເຈນ.',
  },
  'insights.reason.above': {
    en: 'Above your average in {count} of the last {total} months, by about {value}',
    lo: 'ສູງກວ່າຄ່າສະເລ່ຍຂອງເຈົ້າ {count} ຈາກ {total} ເດືອນຫຼ້າສຸດ, ປະມານ {value}',
  },
  'insights.reason.below': {
    en: 'Below your average in {count} of the last {total} months, by about {value}',
    lo: 'ຕ່ຳກວ່າຄ່າສະເລ່ຍຂອງເຈົ້າ {count} ຈາກ {total} ເດືອນຫຼ້າສຸດ, ປະມານ {value}',
  },
  'insights.confidence.high': { en: 'High confidence', lo: 'ໝັ້ນໃຈສູງ' },
  'insights.confidence.medium': { en: 'Medium confidence', lo: 'ໝັ້ນໃຈປານກາງ' },
  'insights.confidence.low': { en: 'Low confidence', lo: 'ໝັ້ນໃຈຕ່ຳ' },
  // PRD §20.6 student wording.
  'insights.confidenceText.high': { en: 'This pattern has been clear for several months.', lo: 'ຮູບແບບນີ້ ເຫັນໄດ້ຊັດເຈນມາຫຼາຍເດືອນແລ້ວ.' },
  'insights.confidenceText.medium': { en: 'This pattern shows up in most months so far.', lo: 'ຮູບແບບນີ້ ເຫັນໄດ້ໃນເດືອນສ່ວນຫຼາຍທີ່ຜ່ານມາ.' },
  'insights.confidenceText.low': {
    en: 'It is early to say. A few more months will make this clearer.',
    lo: 'ຍັງໄວເກີນໄປທີ່ຈະບອກໄດ້. ອີກສອງສາມເດືອນ ຈະເຫັນຊັດເຈນຂຶ້ນ.',
  },

  'explain.title': { en: 'What your scores show', lo: 'ຄະແນນຂອງເຈົ້າສະແດງໃຫ້ເຫັນຫຍັງ' },
  'explain.label.stronger': {
    en: 'In the last {total} months, {subject} was above your overall average in {count} of them, by about {value} on average.',
    lo: 'ໃນ {total} ເດືອນຫຼ້າສຸດ, {subject} ສູງກວ່າຄ່າສະເລ່ຍລວມຂອງເຈົ້າ {count} ເດືອນ, ໂດຍສະເລ່ຍປະມານ {value}.',
  },
  'explain.label.lower': {
    en: 'In the last {total} months, {subject} was below your overall average in {count} of them, by about {value} on average.',
    lo: 'ໃນ {total} ເດືອນຫຼ້າສຸດ, {subject} ຕ່ຳກວ່າຄ່າສະເລ່ຍລວມຂອງເຈົ້າ {count} ເດືອນ, ໂດຍສະເລ່ຍປະມານ {value}.',
  },
  'explain.label.neutral': { en: '{subject} is close to your overall average.', lo: '{subject} ໃກ້ຄຽງກັບຄ່າສະເລ່ຍລວມຂອງເຈົ້າ.' },
  'explain.label.insufficient': {
    en: 'Comparing {subject} with your average needs 3 months that have an average. So far there are {count}.',
    lo: 'ການທຽບ {subject} ກັບຄ່າສະເລ່ຍ ຕ້ອງມີ 3 ເດືອນທີ່ມີຄ່າສະເລ່ຍ. ຕອນນີ້ມີ {count} ເດືອນ.',
  },
  'explain.trend.improving': {
    en: 'This school year ({count} months of scores) it has gone up, by about {value} a month.',
    lo: 'ສົກຮຽນນີ້ ({count} ເດືອນທີ່ມີຄະແນນ) ຄະແນນເພີ່ມຂຶ້ນ, ປະມານ {value} ຕໍ່ເດືອນ.',
  },
  'explain.trend.declining': {
    en: 'This school year ({count} months of scores) it has gone down, by about {value} a month.',
    lo: 'ສົກຮຽນນີ້ ({count} ເດືອນທີ່ມີຄະແນນ) ຄະແນນຫຼຸດລົງ, ປະມານ {value} ຕໍ່ເດືອນ.',
  },
  'explain.trend.volatile': {
    en: 'It has changed a lot from month to month, between {min} and {max}.',
    lo: 'ຄະແນນປ່ຽນແປງຫຼາຍ ແຕ່ລະເດືອນ, ລະຫວ່າງ {min} ຫາ {max}.',
  },
  'explain.trend.flat': {
    en: 'This school year ({count} months of scores) there is no clear direction up or down.',
    lo: 'ສົກຮຽນນີ້ ({count} ເດືອນທີ່ມີຄະແນນ) ຍັງບໍ່ເຫັນທິດທາງຂຶ້ນ ຫຼື ລົງຢ່າງຊັດເຈນ.',
  },
  'explain.trend.insufficient': {
    en: 'A direction needs at least 4 months of scores. So far there are {count}.',
    lo: 'ການເບິ່ງທິດທາງ ຕ້ອງມີຄະແນນຢ່າງໜ້ອຍ 4 ເດືອນ. ຕອນນີ້ມີ {count} ເດືອນ.',
  },
  'explain.helps': { en: 'Things that sometimes help', lo: 'ສິ່ງທີ່ບາງຄັ້ງຊ່ວຍໄດ້' },
  'explain.helpsNote': {
    en: 'Suggestions only: monthly scores cannot show why a result changed.',
    lo: 'ເປັນພຽງຄຳແນະນຳ: ຄະແນນປະຈຳເດືອນ ບໍ່ສາມາດບອກໄດ້ວ່າ ເປັນຫຍັງຜົນຈຶ່ງປ່ຽນ.',
  },
  'explain.help.review': {
    en: 'Looking back at recent tests to find the questions that were hardest.',
    lo: 'ທົບທວນບົດທົດສອບຫຼ້າສຸດ ເພື່ອຊອກຫາຂໍ້ທີ່ຍາກທີ່ສຸດ.',
  },
  'explain.help.routine': {
    en: 'A short, regular time for this subject each week.',
    lo: 'ຕັ້ງເວລາສັ້ນໆ ສຳລັບວິຊານີ້ ເປັນປະຈຳທຸກອາທິດ.',
  },
  'explain.help.ask': {
    en: 'Asking the teacher which topics come next, so you can read ahead.',
    lo: 'ຖາມຄູວ່າ ບົດຕໍ່ໄປແມ່ນຫຍັງ ເພື່ອອ່ານລ່ວງໜ້າ.',
  },
  'explain.help.dates': {
    en: 'Writing down when tests happen next to your monthly scores, to see what changed.',
    lo: 'ຈົດວັນສອບເສັງໄວ້ຄຽງຄະແນນປະຈຳເດືອນ ເພື່ອເບິ່ງວ່າມີຫຍັງປ່ຽນ.',
  },
} as const satisfies Record<string, { en: string; lo: string }>
