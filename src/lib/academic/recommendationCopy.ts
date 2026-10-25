// Strings for weekly next actions and practice sets (P2-REC #50: LEARN-001,
// REC-PRACTICE). Spread into copy.ts. New Lao strings need the owner's
// native-speaker review before release, like the other copy files.

export const recommendationCopy = {
  'week.title': { en: 'This week', lo: 'ອາທິດນີ້' },
  'week.subtitle': {
    en: 'Up to three things to do next, chosen from your scores and quizzes.',
    lo: 'ສູງສຸດສາມຢ່າງທີ່ຄວນເຮັດຕໍ່ໄປ, ເລືອກຈາກຄະແນນ ແລະ ແບບທົດສອບຂອງເຈົ້າ.',
  },
  'week.minutes': { en: 'About {count} min', lo: 'ປະມານ {count} ນາທີ' },
  'week.title.enter': { en: 'Enter your {period} scores', lo: 'ປ້ອນຄະແນນ {period}' },
  'week.title.practice': { en: 'Practice: {topic}', lo: 'ຝຶກ: {topic}' },
  'week.reason.R1': { en: '{period} scores are not entered yet.', lo: 'ຍັງບໍ່ໄດ້ປ້ອນຄະແນນ {period}.' },
  'week.reason.R2': {
    en: '{subject} needs attention. A short quiz shows which topics to practise.',
    lo: '{subject} ຄວນເອົາໃຈໃສ່. ແບບທົດສອບສັ້ນໆ ຈະສະແດງວ່າ ບົດໃດຄວນຝຶກ.',
  },
  'week.reason.R3': { en: 'Because {topic} was Needs practice in your quiz on {date}.', lo: 'ເພາະວ່າ {topic} ຢູ່ໃນລະດັບ “ຄວນຝຶກຕື່ມ” ໃນແບບທົດສອບວັນທີ {date}.' },
  'week.reason.R4': { en: 'Because {topic} was Developing in your quiz on {date}.', lo: 'ເພາະວ່າ {topic} ຢູ່ໃນລະດັບ “ກຳລັງພັດທະນາ” ໃນແບບທົດສອບວັນທີ {date}.' },
  'week.reason.R5': { en: 'Check what changed in {subject} since your quiz on {date}.', lo: 'ກວດເບິ່ງວ່າ {subject} ມີຫຍັງປ່ຽນ ຕັ້ງແຕ່ແບບທົດສອບວັນທີ {date}.' },
  'week.reason.R7': { en: '{subject} is going well. Try something harder.', lo: '{subject} ໄປໄດ້ດີ. ລອງສິ່ງທີ່ຍາກຂຶ້ນ.' },
  'week.reason.gap': { en: "We don't have practice for {topic} yet.", lo: 'ພວກເຮົາຍັງບໍ່ມີບົດຝຶກສຳລັບ {topic}.' },
  'week.action.enter_scores': { en: 'Enter scores', lo: 'ປ້ອນຄະແນນ' },
  'week.action.diagnostic': { en: 'Start the quiz', lo: 'ເລີ່ມແບບທົດສອບ' },
  'week.action.practice_set': { en: 'Practise', lo: 'ຝຶກ' },
  'week.action.academy_lesson': { en: 'Open the lesson', lo: 'ເປີດບົດຮຽນ' },
  'week.action.academy_challenge': { en: 'Open the challenge', lo: 'ເປີດສິ່ງທ້າທາຍ' },
  // LEARN-005 feedback (Lao approved by the owner on 2026-10-26)
  'week.feedback.done': { en: 'Done', lo: 'ເຮັດແລ້ວ' },
  'week.feedback.not_now': { en: 'Not now', lo: 'ບໍ່ແມ່ນຕອນນີ້' },
  'week.feedback.not_helpful': { en: 'Not helpful', lo: 'ບໍ່ເປັນປະໂຫຍດ' },
  'week.feedback.label': { en: 'Feedback on {title}', lo: 'ຄຳຕິຊົມກ່ຽວກັບ {title}' },
  'week.feedback.thanks': { en: 'Thanks. Your list is updated.', lo: 'ຂອບໃຈ. ລາຍການຂອງເຈົ້າຖືກປັບປຸງແລ້ວ.' },

  'practice.title': { en: 'Practice', lo: 'ຝຶກຫັດ' },
  'practice.check': { en: 'Check answer', lo: 'ກວດຄຳຕອບ' },
  'practice.right': { en: 'Correct', lo: 'ຖືກຕ້ອງ' },
  'practice.wrong': { en: 'Not quite. The answer is {answer}.', lo: 'ຍັງບໍ່ຖືກ. ຄຳຕອບແມ່ນ {answer}.' },
  'practice.finish': { en: 'Finish', lo: 'ສຳເລັດ' },
  'practice.done.title': { en: 'Practice done', lo: 'ຝຶກສຳເລັດແລ້ວ' },
  'practice.done.body': { en: 'Well done for practising. Your next actions will update.', lo: 'ດີຫຼາຍທີ່ໄດ້ຝຶກ. ສິ່ງທີ່ຄວນເຮັດຕໍ່ໄປ ຈະປັບປຸງໃໝ່.' },
  'practice.error.unavailable': { en: 'This practice is not available.', lo: 'ບົດຝຶກນີ້ບໍ່ມີໃຫ້ໃຊ້.' },
} as const satisfies Record<string, { en: string; lo: string }>
