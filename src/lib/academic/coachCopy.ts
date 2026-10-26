// Strings for the Coach in Schooling (P3-AI #53: AI-001, AI-009). Spread into
// copy.ts. New Lao strings need the owner's native-speaker review before
// release, like the other copy files.

export const coachCopy = {
  'coach.title': { en: 'Ask the Coach about your scores', lo: 'ຖາມຄູຝຶກກ່ຽວກັບຄະແນນຂອງເຈົ້າ' },
  'coach.body': { en: 'The Coach explains your own scores in simple words and suggests one next step. It never sees other students’ scores.', lo: 'ຄູຝຶກອະທິບາຍຄະແນນຂອງເຈົ້າເອງແບບງ່າຍໆ ແລະ ແນະນຳຂັ້ນຕໍ່ໄປໜຶ່ງຢ່າງ. ມັນບໍ່ເຫັນຄະແນນຂອງນັກຮຽນຄົນອື່ນ.' },
  'coach.open': { en: 'Ask the Coach', lo: 'ຖາມຄູຝຶກ' },
  'coach.askSubject': { en: 'Ask the Coach about {subject}', lo: 'ຖາມຄູຝຶກກ່ຽວກັບ {subject}' },
  'coach.askSubjectQuestion': { en: 'Explain my {subject} scores and what I should do next.', lo: 'ອະທິບາຍຄະແນນ {subject} ຂອງຂ້ອຍ ແລະ ຂ້ອຍຄວນເຮັດຫຍັງຕໍ່ໄປ.' },
  'coach.remaining': { en: '{remaining} of {limit} Coach messages left this month', lo: 'ເດືອນນີ້ເຫຼືອ {remaining} ຈາກ {limit} ຂໍ້ຄວາມ' },
  'coach.busy': { en: 'The Coach is busy right now. Try again later; everything else here still works.', lo: 'ຕອນນີ້ຄູຝຶກຫຍຸ້ງ. ລອງໃໝ່ພາຍຫຼັງ; ສ່ວນອື່ນໆຢູ່ນີ້ຍັງໃຊ້ໄດ້.' },
  'coach.summary': { en: 'Monthly summary', lo: 'ສະຫຼຸບປະຈຳເດືອນ' },
  'coach.summary.show': { en: 'Show my monthly summary', lo: 'ສະແດງສະຫຼຸບປະຈຳເດືອນ' },
  'coach.summary.ai': { en: 'Written by AI and checked against your scores.', lo: 'ຂຽນໂດຍ AI ແລະ ກວດກັບຄະແນນຂອງເຈົ້າແລ້ວ.' },
  'coach.summary.template': { en: 'Written from your scores.', lo: 'ຂຽນຈາກຄະແນນຂອງເຈົ້າ.' },
  'coach.summary.error': { en: 'The summary could not be made right now.', lo: 'ຕອນນີ້ສ້າງສະຫຼຸບບໍ່ໄດ້.' },
  // Consent for the weekly reviewer sample (ADMIN-009, migration 146).
  'consent.purpose.coach_review': { en: 'Let reviewers check Coach answers', lo: 'ໃຫ້ຜູ້ກວດສອບກວດຄຳຕອບຂອງຄູຝຶກ' },
  'consent.coachReview.body': {
    en: 'Each week a Bitdoin reviewer may read a few of your Coach chats about your scores, to check the answers are correct, safe and in good Lao. Your name is not shown. You can turn this off at any time.',
    lo: 'ແຕ່ລະອາທິດ ຜູ້ກວດສອບຂອງ Bitdoin ອາດຈະອ່ານບາງບົດສົນທະນາກັບຄູຝຶກກ່ຽວກັບຄະແນນຂອງເຈົ້າ, ເພື່ອກວດວ່າຄຳຕອບຖືກຕ້ອງ, ປອດໄພ ແລະ ໃຊ້ພາສາລາວທີ່ດີ. ຊື່ຂອງເຈົ້າຈະບໍ່ຖືກສະແດງ. ເຈົ້າປິດໄດ້ທຸກເວລາ.',
  },
} as const
