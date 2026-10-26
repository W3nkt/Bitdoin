// Strings for Academy Premium in Schooling (P3-BIL #51: BILLING-006, PRD
// §30.3–30.4). Spread into copy.ts. New Lao strings need the owner's
// native-speaker review before release, like the other copy files.

export const entitlementCopy = {
  'premium.badge': { en: 'Academy Premium', lo: 'Academy Premium' },
  'premium.see': { en: 'See Academy Premium', lo: 'ເບິ່ງ Academy Premium' },
  'premium.askParent': { en: 'Ask a parent', lo: 'ຖາມພໍ່ແມ່' },
  'premium.askParentText': {
    en: 'Could we get Academy Premium on Bitdoin? It unlocks full score explanations and more practice.',
    lo: 'ພວກເຮົາສະໝັກ Academy Premium ໃນ Bitdoin ໄດ້ບໍ? ມັນເປີດຄຳອະທິບາຍຄະແນນເຕັມ ແລະ ການຝຶກຫຼາຍຂຶ້ນ.',
  },
  'premium.linkCopied': { en: 'Link copied. Send it to a parent.', lo: 'ສຳເນົາລິ້ງແລ້ວ. ສົ່ງໃຫ້ພໍ່ແມ່.' },
  'premium.required': { en: 'This needs Academy Premium. Your scores and history stay free.', lo: 'ອັນນີ້ຕ້ອງໃຊ້ Academy Premium. ຄະແນນ ແລະ ປະຫວັດຂອງເຈົ້າຍັງໃຊ້ໄດ້ຟຣີ.' },
  'premium.insights': {
    en: 'The full evidence and how sure each result is come with Academy Premium.',
    lo: 'ຫຼັກຖານເຕັມ ແລະ ຄວາມໝັ້ນໃຈຂອງແຕ່ລະຜົນ ມີໃນ Academy Premium.',
  },
  'premium.explain': {
    en: 'Explanations of what your scores show, month by month, come with Academy Premium.',
    lo: 'ຄຳອະທິບາຍວ່າຄະແນນຂອງເຈົ້າສະແດງຫຍັງ ແຕ່ລະເດືອນ ມີໃນ Academy Premium.',
  },
  'premium.week': {
    en: '{count} more suggestions this week with Academy Premium.',
    lo: 'ມີຄຳແນະນຳອີກ {count} ຢ່າງໃນອາທິດນີ້ ກັບ Academy Premium.',
  },
  'premium.careers': {
    en: 'Your career options, with the reasons behind each, come with Academy Premium. Your interests and every career below stay free.',
    lo: 'ທາງເລືອກອາຊີບຂອງເຈົ້າ ພ້ອມເຫດຜົນຂອງແຕ່ລະອັນ ມີໃນ Academy Premium. ຄວາມສົນໃຈຂອງເຈົ້າ ແລະ ທຸກອາຊີບຂ້າງລຸ່ມ ຍັງຟຣີ.',
  },
  'premium.diagnostic': {
    en: 'You have used this term’s check for this subject. Re-tests come with Academy Premium.',
    lo: 'ເຈົ້າໃຊ້ການກວດຂອງວິຊານີ້ໃນພາກຮຽນນີ້ແລ້ວ. ການກວດຄືນມີໃນ Academy Premium.',
  },
  'insights.reason.aboveSummary': { en: 'Above your average lately', lo: 'ສູງກວ່າຄ່າສະເລ່ຍຂອງເຈົ້າໃນໄລຍະນີ້' },
  'insights.reason.belowSummary': { en: 'Below your average lately', lo: 'ຕ່ຳກວ່າຄ່າສະເລ່ຍຂອງເຈົ້າໃນໄລຍະນີ້' },

  'plan.title': { en: 'Your plan', lo: 'ແພັກເກດຂອງເຈົ້າ' },
  'plan.free': { en: 'Free', lo: 'ຟຣີ' },
  'plan.premiumUntil': { en: 'Academy Premium until {date}', lo: 'Academy Premium ຮອດວັນທີ {date}' },
  'plan.premiumOpen': { en: 'Academy Premium', lo: 'Academy Premium' },
  'plan.freeBody': {
    en: 'Your scores, history and charts are always free. Academy Premium adds full explanations, more suggestions and re-tests.',
    lo: 'ຄະແນນ, ປະຫວັດ ແລະ ກຣາຟຂອງເຈົ້າ ຟຣີສະເໝີ. Academy Premium ເພີ່ມຄຳອະທິບາຍເຕັມ, ຄຳແນະນຳຫຼາຍຂຶ້ນ ແລະ ການກວດຄືນ.',
  },
  'plan.keepData': { en: 'If Premium ends, everything you recorded stays.', lo: 'ຖ້າ Premium ໝົດ, ທຸກຢ່າງທີ່ເຈົ້າບັນທຶກໄວ້ຍັງຢູ່.' },
  'plan.scans': { en: 'Score-book scans this month: {remaining} of {limit} left', lo: 'ການສະແກນເດືອນນີ້: ເຫຼືອ {remaining} ຈາກ {limit}' },
  'plan.endsSoon': { en: 'Academy Premium ends in {count} days, on {date}.', lo: 'Academy Premium ຈະໝົດໃນ {count} ມື້, ວັນທີ {date}.' },
  'plan.endsTomorrow': { en: 'Academy Premium ends tomorrow, {date}.', lo: 'Academy Premium ຈະໝົດມື້ອື່ນ, ວັນທີ {date}.' },
  'plan.renew': { en: 'Renew', lo: 'ຕໍ່ອາຍຸ' },
} as const
