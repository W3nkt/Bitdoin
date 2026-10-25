// Strings for diagnostic quizzes (P2-ANL, #49: QUIZ-001..003, ANALYSIS-005).
// Spread into copy.ts. Lao strings reviewed and approved by the owner on
// 2026-10-25; changes need the same review.

export const quizCopy = {
  // ANALYSIS-005: the CTA on a subject that needs attention.
  'quiz.offer.cta': { en: 'Find which topics to practise (8–12 min)', lo: 'ຊອກຫາບົດທີ່ຄວນຝຶກ (8–12 ນາທີ)' },
  'quiz.offer.body': {
    en: 'A short quiz of {count} questions shows which topics in this subject are secure and which need practice.',
    lo: 'ແບບທົດສອບສັ້ນໆ {count} ຂໍ້ ຈະສະແດງວ່າ ບົດໃດໃນວິຊານີ້ ເຈົ້າເຂົ້າໃຈດີແລ້ວ ແລະ ບົດໃດຄວນຝຶກຕື່ມ.',
  },
  'quiz.offer.resume': { en: 'Continue your quiz ({answered} of {total} answered)', lo: 'ສືບຕໍ່ແບບທົດສອບ (ຕອບແລ້ວ {answered} ຈາກ {total} ຂໍ້)' },
  'quiz.offer.lastResult': { en: 'See your last quiz results', lo: 'ເບິ່ງຜົນແບບທົດສອບຄັ້ງຫຼ້າສຸດ' },
  // QUIZ-004
  'quiz.offer.retake': { en: 'Try a different set of questions', lo: 'ລອງຊຸດຄຳຖາມອື່ນ' },
  'quiz.offer.retakeFrom': {
    en: 'You can try a different set of questions from {date}, after some practice.',
    lo: 'ເຈົ້າສາມາດລອງຊຸດຄຳຖາມອື່ນໄດ້ຕັ້ງແຕ່ {date}, ຫຼັງຈາກໄດ້ຝຶກແລ້ວ.',
  },
  // ANALYSIS-007 (wording from the PRD)
  'quiz.conflict': {
    en: 'Your quiz results are strong, but school scores are lower – topics outside this quiz or test conditions may matter.',
    lo: 'ຜົນແບບທົດສອບຂອງເຈົ້າດີ, ແຕ່ຄະແນນຢູ່ໂຮງຮຽນຕ່ຳກວ່າ – ບົດທີ່ບໍ່ມີໃນແບບທົດສອບນີ້ ຫຼື ສະພາບການສອບເສັງ ອາດມີຜົນ.',
  },
  'quiz.result.before': { en: 'Last time: {correct} of {total}', lo: 'ຄັ້ງກ່ອນ: {correct} ຈາກ {total}' },

  'quiz.title': { en: 'Topic quiz', lo: 'ແບບທົດສອບບົດຮຽນ' },
  'quiz.progress': { en: 'Question {n} of {total}', lo: 'ຂໍ້ທີ {n} ຈາກ {total}' },
  'quiz.topic': { en: 'Topic: {topic}', lo: 'ບົດ: {topic}' },
  'quiz.answers': { en: 'Answers', lo: 'ຄຳຕອບ' },
  'quiz.previous': { en: 'Previous', lo: 'ກັບຄືນ' },
  'quiz.next': { en: 'Next', lo: 'ຕໍ່ໄປ' },
  'quiz.finish': { en: 'See my results', lo: 'ເບິ່ງຜົນຂອງຂ້ອຍ' },
  'quiz.saved': { en: 'Your answers are saved. You can come back within 7 days.', lo: 'ຄຳຕອບຂອງເຈົ້າຖືກບັນທຶກແລ້ວ. ເຈົ້າສາມາດກັບມາຕໍ່ໄດ້ພາຍໃນ 7 ມື້.' },
  'quiz.unanswered': { en: 'Answer every question to see your results.', lo: 'ຕອບທຸກຂໍ້ ເພື່ອເບິ່ງຜົນ.' },
  'quiz.saveFailed': { en: 'That answer was not saved. Check your connection and choose it again.', lo: 'ຄຳຕອບນັ້ນຍັງບໍ່ໄດ້ບັນທຶກ. ກວດເບິ່ງອິນເຕີເນັດ ແລ້ວເລືອກອີກຄັ້ງ.' },

  'quiz.result.title': { en: 'Your topics', lo: 'ບົດຮຽນຂອງເຈົ້າ' },
  'quiz.result.note': {
    en: 'From this quiz only. It shows which topics to practise first, not how well you will do in exams.',
    lo: 'ຈາກແບບທົດສອບນີ້ເທົ່ານັ້ນ. ມັນສະແດງວ່າ ບົດໃດຄວນຝຶກກ່ອນ, ບໍ່ແມ່ນການຄາດຄະເນຜົນສອບເສັງ.',
  },
  'quiz.result.score': { en: '{correct} of {total} correct', lo: 'ຖືກ {correct} ຈາກ {total} ຂໍ້' },
  'quiz.band.secure': { en: 'Secure', lo: 'ເຂົ້າໃຈດີ' },
  'quiz.band.developing': { en: 'Developing', lo: 'ກຳລັງພັດທະນາ' },
  'quiz.band.needs_practice': { en: 'Needs practice', lo: 'ຄວນຝຶກຕື່ມ' },
  'quiz.band.not_enough': { en: 'Not enough questions to judge', lo: 'ຄຳຖາມບໍ່ພໍທີ່ຈະຕັດສິນ' },
  'quiz.review.title': { en: 'Review your answers', lo: 'ທົບທວນຄຳຕອບຂອງເຈົ້າ' },
  'quiz.review.yours': { en: 'Your answer', lo: 'ຄຳຕອບຂອງເຈົ້າ' },
  'quiz.review.correct': { en: 'Correct answer', lo: 'ຄຳຕອບທີ່ຖືກ' },
  'quiz.review.right': { en: 'Correct', lo: 'ຖືກ' },
  'quiz.review.wrong': { en: 'Not correct', lo: 'ບໍ່ຖືກ' },
  'quiz.review.explanation': { en: 'Why', lo: 'ເປັນຫຍັງ' },
  'quiz.review.ai': { en: 'Explanation drafted with AI and checked by a teacher', lo: 'ຄຳອະທິບາຍຮ່າງດ້ວຍ AI ແລະ ກວດໂດຍຄູ' },
  'quiz.back': { en: 'Back to {subject}', lo: 'ກັບໄປ {subject}' },
  'quiz.backDashboard': { en: 'Back to your dashboard', lo: 'ກັບໄປໜ້າສະຫຼຸບ' },

  'quiz.error.unavailable': { en: 'This quiz is not available.', lo: 'ແບບທົດສອບນີ້ບໍ່ມີໃຫ້ໃຊ້.' },
  'quiz.error.closed': { en: 'This quiz is closed. Start it again from the subject page.', lo: 'ແບບທົດສອບນີ້ປິດແລ້ວ. ເລີ່ມໃໝ່ຈາກໜ້າວິຊາ.' },
} as const satisfies Record<string, { en: string; lo: string }>
