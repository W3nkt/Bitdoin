// Strings for "Report a problem" (PRIV-008). Spread into copy.ts. Lao strings
// reviewed and approved by the owner on 2026-10-25; changes need the same review.
http://localhost:5173/academy-admin/scores?tab=subjects
export const reportCopy = {
  'report.link': { en: 'Report a problem', lo: 'ລາຍງານບັນຫາ' },
  'report.title': { en: 'Report a problem', lo: 'ລາຍງານບັນຫາ' },
  'report.body': {
    en: 'Tell us what went wrong. Our support team reads every report and replies to your Bitdoin account.',
    lo: 'ບອກພວກເຮົາວ່າ ມີຫຍັງຜິດພາດ. ທີມຊ່ວຍເຫຼືອອ່ານທຸກລາຍງານ ແລະ ຕອບກັບຫາບັນຊີ Bitdoin ຂອງເຈົ້າ.',
  },
  'report.category': { en: 'What is it about?', lo: 'ກ່ຽວກັບຫຍັງ?' },
  'report.category.guardian_link': { en: 'Wrong guardian or parent link', lo: 'ການເຊື່ອມຕໍ່ຜູ້ປົກຄອງບໍ່ຖືກຕ້ອງ' },
  'report.category.ai_answer': { en: 'An AI answer that was wrong or not appropriate', lo: 'ຄຳຕອບຈາກ AI ທີ່ຜິດ ຫຼື ບໍ່ເໝາະສົມ' },
  'report.category.account_misuse': { en: 'Someone using my account or pretending to be me', lo: 'ມີຄົນໃຊ້ບັນຊີຂອງຂ້ອຍ ຫຼື ປອມເປັນຂ້ອຍ' },
  'report.category.other': { en: 'Something else', lo: 'ອື່ນໆ' },
  'report.description': { en: 'What happened?', lo: 'ເກີດຫຍັງຂຶ້ນ?' },
  'report.descriptionHint': { en: 'At least 5 characters. Never include a password.', lo: 'ຢ່າງໜ້ອຍ 5 ຕົວອັກສອນ. ຢ່າໃສ່ລະຫັດຜ່ານ.' },
  'report.send': { en: 'Send report', lo: 'ສົ່ງລາຍງານ' },
  'report.done': { en: 'Thank you. Our support team will reply by {date}.', lo: 'ຂອບໃຈ. ທີມຊ່ວຍເຫຼືອຈະຕອບກັບພາຍໃນ {date}.' },
  'report.error.limit': { en: 'You have sent several reports today. Please try again tomorrow.', lo: 'ມື້ນີ້ເຈົ້າສົ່ງລາຍງານຫຼາຍແລ້ວ. ກະລຸນາລອງໃໝ່ມື້ອື່ນ.' },
} as const satisfies Record<string, { en: string; lo: string }>
