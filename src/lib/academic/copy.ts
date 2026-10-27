import { useLanguage } from '@/context/LanguageContext'
import { insightsCopy } from './insightsCopy'
import { quizCopy } from './quizCopy'
import { reportCopy } from './reportCopy'
import { recommendationCopy } from './recommendationCopy'
import { ocrCopy } from './ocrCopy'
import { entitlementCopy } from './entitlementCopy'
import { plannerCopy } from './plannerCopy'
import { careerCopy } from './careerCopy'
import { guardianCopy } from './guardianCopy'
import { coachCopy } from './coachCopy'
import { examCopy } from './examCopy'

// Every Schooling interface string, in one place.
//
// Lao copy reviewed and confirmed by the owner (UX-005, #14, 2026-10-23).
// New or changed `lo` strings need the same review before release.
// Tone rules (NOTIF-004, PRD §14.13): encouraging, never shaming, no
// comparison with other students.

const copy = {
  // Shell and entry points
  'shell.title': { en: 'Schooling', lo: 'ໂຮງຮຽນ' },
  'shell.subtitle': { en: 'Your school results, privately', lo: 'ຜົນການຮຽນຂອງເຈົ້າ ເປັນສ່ວນຕົວ' },
  'shell.back': { en: 'Back to Academy', lo: 'ກັບໄປ Academy' },
  'entry.tile': { en: 'Schooling', lo: 'ໂຮງຮຽນ' },
  'entry.profileLink': { en: 'Schooling', lo: 'ໂຮງຮຽນ' },

  // Module states
  'state.unavailable.title': { en: 'Schooling is coming soon', lo: 'ໂຮງຮຽນ ຈະມາໃນໄວໆນີ້' },
  'state.unavailable.body': {
    en: 'We are getting monthly score tracking ready for students. It will appear here when it opens.',
    lo: 'ພວກເຮົາກຳລັງກຽມລະບົບບັນທຶກຄະແນນປະຈຳເດືອນສຳລັບນັກຮຽນ. ເມື່ອເປີດໃຫ້ໃຊ້ ຈະສະແດງຢູ່ບ່ອນນີ້.',
  },
  'state.error.title': { en: 'We could not load Schooling', lo: 'ບໍ່ສາມາດໂຫຼດ ໂຮງຮຽນ ໄດ້' },
  'state.error.body': { en: 'Check your connection and try again.', lo: 'ກວດເບິ່ງອິນເຕີເນັດ ແລ້ວລອງໃໝ່ອີກຄັ້ງ.' },
  'state.error.rateLimited': { en: 'Too many requests. Wait a minute, then try again.', lo: 'ມີການຮ້ອງຂໍຫຼາຍເກີນໄປ. ລໍຖ້າໜຶ່ງນາທີ ແລ້ວລອງໃໝ່.' },
  'state.retry': { en: 'Try again', lo: 'ລອງໃໝ່' },
  'state.next.onboarding': { en: 'Set up Schooling', lo: 'ຕັ້ງຄ່າ ໂຮງຮຽນ' },
  'state.next.consent': { en: 'Review the privacy notice', lo: 'ອ່ານແຈ້ງການຄວາມເປັນສ່ວນຕົວ' },
  'state.next.newSchoolYear': { en: 'A new school year has started', lo: 'ສົກຮຽນໃໝ່ເລີ່ມແລ້ວ' },
  'state.next.ready': { en: 'Your dashboard', lo: 'ໜ້າສະຫຼຸບຂອງເຈົ້າ' },
  'state.placeholder': { en: 'This screen is being built.', lo: 'ໜ້ານີ້ກຳລັງສ້າງຢູ່.' },

  // Common
  'common.back': { en: 'Back', lo: 'ກັບຄືນ' },
  'common.next': { en: 'Next', lo: 'ຕໍ່ໄປ' },
  'common.save': { en: 'Save', lo: 'ບັນທຶກ' },
  'common.cancel': { en: 'Cancel', lo: 'ຍົກເລີກ' },
  'common.optional': { en: 'optional', lo: 'ບໍ່ບັງຄັບ' },
  'common.stepOf': { en: 'Step {step} of {total}', lo: 'ຂັ້ນຕອນ {step} ຈາກ {total}' },
  'feedback.title': { en: 'Two quick questions', lo: 'ສອງຄຳຖາມສັ້ນໆ' },
  'feedback.anonymous': { en: 'Answers are counted without your name.', lo: 'ຄຳຕອບຖືກນັບໂດຍບໍ່ມີຊື່ຂອງເຈົ້າ.' },
  'feedback.useful': { en: 'How useful is Schooling for you?', lo: 'ໂຮງຮຽນ ມີປະໂຫຍດຕໍ່ເຈົ້າຫຼາຍປານໃດ?' },
  'feedback.useful.low': { en: 'Not useful', lo: 'ບໍ່ມີປະໂຫຍດ' },
  'feedback.useful.high': { en: 'Very useful', lo: 'ມີປະໂຫຍດຫຼາຍ' },
  'feedback.ease': { en: 'How easy is it to enter your scores?', lo: 'ການປ້ອນຄະແນນງ່າຍປານໃດ?' },
  'feedback.ease.low': { en: 'Hard', lo: 'ຍາກ' },
  'feedback.ease.high': { en: 'Easy', lo: 'ງ່າຍ' },
  'feedback.send': { en: 'Send', lo: 'ສົ່ງ' },
  'feedback.later': { en: 'Not now', lo: 'ເທື່ອໜ້າ' },
  'feedback.thanks': { en: 'Thank you! This helps us improve Schooling.', lo: 'ຂອບໃຈ! ສິ່ງນີ້ຊ່ວຍພວກເຮົາປັບປຸງ ໂຮງຮຽນ.' },
  'pilot.title': { en: 'Enter your pilot code', lo: 'ໃສ່ລະຫັດທົດລອງ' },
  'pilot.hint': {
    en: 'Schooling is being tried out with a few schools first. Your school or club gives you a 6-character code.',
    lo: 'ໂຮງຮຽນ ກຳລັງທົດລອງກັບບາງໂຮງຮຽນກ່ອນ. ໂຮງຮຽນ ຫຼື ຊົມລົມຂອງເຈົ້າຈະໃຫ້ລະຫັດ 6 ຕົວອັກສອນ.',
  },
  'pilot.code': { en: 'Pilot code', lo: 'ລະຫັດທົດລອງ' },
  'pilot.joined': { en: 'Code accepted: {name}', lo: 'ລະຫັດຖືກຕ້ອງ: {name}' },
  'pilot.noCode': {
    en: 'No code? Schooling opens to everyone after the pilot. We will let you know in the Academy.',
    lo: 'ບໍ່ມີລະຫັດບໍ? ໂຮງຮຽນ ຈະເປີດໃຫ້ທຸກຄົນຫຼັງການທົດລອງ. ພວກເຮົາຈະແຈ້ງໃຫ້ຮູ້ໃນ Academy.',
  },
  'pilot.error.required': { en: 'Enter the pilot code from your school.', lo: 'ກະລຸນາໃສ່ລະຫັດທົດລອງຈາກໂຮງຮຽນຂອງເຈົ້າ.' },
  'pilot.error.invalid': { en: 'This code is not valid. Check it with your school.', lo: 'ລະຫັດນີ້ບໍ່ຖືກຕ້ອງ. ກະລຸນາກວດກັບໂຮງຮຽນຂອງເຈົ້າ.' },
  'pilot.error.full': { en: 'This pilot group is full. Ask your school for help.', lo: 'ກຸ່ມທົດລອງນີ້ເຕັມແລ້ວ. ກະລຸນາສອບຖາມໂຮງຮຽນຂອງເຈົ້າ.' },
  'error.generic': { en: 'Something went wrong. Please try again.', lo: 'ມີບາງຢ່າງຜິດພາດ. ກະລຸນາລອງໃໝ່.' },
  'error.noticeOutdated': { en: 'The privacy notice was updated. Please read it again.', lo: 'ແຈ້ງການຄວາມເປັນສ່ວນຕົວຖືກປັບປຸງ. ກະລຸນາອ່ານອີກຄັ້ງ.' },
  'error.versionConflict': { en: 'This changed on another device. Reload and try again.', lo: 'ຂໍ້ມູນນີ້ຖືກປ່ຽນຢູ່ອຸປະກອນອື່ນ. ໂຫຼດໃໝ່ ແລ້ວລອງອີກຄັ້ງ.' },
  'error.calendarMissing': { en: 'Your school year is not set up yet. Please check back soon.', lo: 'ສົກຮຽນຂອງເຈົ້າຍັງບໍ່ທັນຕັ້ງຄ່າ. ກະລຸນາກັບມາເບິ່ງໃໝ່ໄວໆນີ້.' },

  // Privacy notice (PRIV-001): layered, summary under 150 words.
  'notice.title': { en: 'Before you start', lo: 'ກ່ອນເລີ່ມຕົ້ນ' },
  'notice.updatedTitle': { en: 'We updated the privacy notice', lo: 'ພວກເຮົາປັບປຸງແຈ້ງການຄວາມເປັນສ່ວນຕົວແລ້ວ' },
  'notice.pausedTitle': { en: 'Schooling is paused', lo: 'ໂຮງຮຽນ ຖືກຢຸດໄວ້' },
  'notice.pausedBody': { en: 'You withdrew permission, so nothing new is saved. Agree again to keep recording, or delete your data in My data.', lo: 'ເຈົ້າໄດ້ຖອນການອະນຸຍາດ ຈຶ່ງບໍ່ມີການບັນທຶກຫຍັງໃໝ່. ຍອມຮັບອີກຄັ້ງເພື່ອບັນທຶກຕໍ່ ຫຼື ລຶບຂໍ້ມູນຢູ່ໃນ ຂໍ້ມູນຂອງຂ້ອຍ.' },
  'notice.what': {
    en: 'What we keep: the name you choose to show, your age group, province, school, grade and the scores you type in. We never ask for your date of birth, phone number or address.',
    lo: 'ສິ່ງທີ່ເກັບໄວ້: ຊື່ທີ່ເຈົ້າເລືອກສະແດງ, ກຸ່ມອາຍຸ, ແຂວງ, ໂຮງຮຽນ, ຊັ້ນຮຽນ ແລະ ຄະແນນທີ່ເຈົ້າປ້ອນ. ພວກເຮົາບໍ່ຖາມວັນເດືອນປີເກີດ, ເບີໂທ ຫຼື ທີ່ຢູ່.',
  },
  'notice.why': {
    en: 'Why: to show you your own averages and how your scores change over time.',
    lo: 'ເພື່ອຫຍັງ: ເພື່ອສະແດງຄ່າສະເລ່ຍ ແລະ ການປ່ຽນແປງຄະແນນຂອງເຈົ້າເອງຕາມເວລາ.',
  },
  'notice.stats': {
    en: 'Usage statistics: we count which screens are used and how long entering scores takes, without your name or scores, to improve Schooling. You can switch this off in My data.',
    lo: 'ສະຖິຕິການນຳໃຊ້: ພວກເຮົານັບວ່າໜ້າໃດຖືກໃຊ້ ແລະ ການປ້ອນຄະແນນໃຊ້ເວລາດົນປານໃດ ໂດຍບໍ່ມີຊື່ ຫຼື ຄະແນນຂອງເຈົ້າ ເພື່ອປັບປຸງ ໂຮງຮຽນ. ເຈົ້າປິດໄດ້ຢູ່ໃນ ຂໍ້ມູນຂອງຂ້ອຍ.',
  },
  'notice.who': {
    en: 'Who sees it: only you. It is not shared with your school, parents or other students. Support staff can look only when helping with a problem, and every look is recorded.',
    lo: 'ໃຜເຫັນ: ມີແຕ່ເຈົ້າ. ບໍ່ແບ່ງປັນໃຫ້ໂຮງຮຽນ, ພໍ່ແມ່ ຫຼື ນັກຮຽນຄົນອື່ນ. ພະນັກງານຊ່ວຍເຫຼືອເບິ່ງໄດ້ສະເພາະຕອນຊ່ວຍແກ້ບັນຫາ ແລະ ທຸກຄັ້ງຖືກບັນທຶກໄວ້.',
  },
  'notice.choices': {
    en: 'Your choices: download everything, correct any score, or delete your scores or your whole profile at any time in My data.',
    lo: 'ທາງເລືອກຂອງເຈົ້າ: ດາວໂຫຼດທັງໝົດ, ແກ້ໄຂຄະແນນ, ຫຼື ລຶບຄະແນນ ຫຼື ໂປຣໄຟລ໌ທັງໝົດໄດ້ທຸກເວລາ ຢູ່ໃນ ຂໍ້ມູນຂອງຂ້ອຍ.',
  },
  'notice.selfReported': {
    en: 'Scores are entered by you. They are not official school records.',
    lo: 'ຄະແນນແມ່ນເຈົ້າປ້ອນເອງ. ບໍ່ແມ່ນເອກະສານທາງການຂອງໂຮງຮຽນ.',
  },
  'notice.more': { en: 'Read the full notice', lo: 'ອ່ານແຈ້ງການເຕັມ' },
  'notice.full': {
    en: [
      'Data is stored on Bitdoin\'s servers with the rest of your Bitdoin account and protected by access controls. We keep it until you delete it, or for 3 years after you last use Schooling, after a reminder. Records that you agreed to this notice are kept as proof even after deletion.',
      ocrCopy['scan.consent.provider'].en,
      ocrCopy['scan.consent.review'].en,
      ocrCopy['scan.consent.retention'].en,
      ocrCopy['scan.consent.withdraw'].en,
      'We do not use your scores for advertising, ranking or any comparison with other students.',
    ].join(' '),
    lo: [
      'ຂໍ້ມູນເກັບໄວ້ໃນເຊີບເວີຂອງ Bitdoin ພ້ອມກັບບັນຊີ Bitdoin ຂອງເຈົ້າ ແລະ ມີການຄວບຄຸມການເຂົ້າເຖິງ. ພວກເຮົາເກັບໄວ້ຈົນກວ່າເຈົ້າຈະລຶບ ຫຼື 3 ປີຫຼັງຈາກເຈົ້າໃຊ້ຄັ້ງສຸດທ້າຍ ໂດຍຈະແຈ້ງເຕືອນກ່ອນ. ບັນທຶກວ່າເຈົ້າຍອມຮັບແຈ້ງການນີ້ ຈະເກັບໄວ້ເປັນຫຼັກຖານ ເຖິງແມ່ນລຶບແລ້ວ.',
      ocrCopy['scan.consent.provider'].lo,
      ocrCopy['scan.consent.review'].lo,
      ocrCopy['scan.consent.retention'].lo,
      ocrCopy['scan.consent.withdraw'].lo,
      'ພວກເຮົາບໍ່ໃຊ້ຄະແນນຂອງເຈົ້າເພື່ອໂຄສະນາ, ຈັດອັນດັບ ຫຼື ປຽບທຽບກັບນັກຮຽນຄົນອື່ນ.',
    ].join(' '),
  },
  'notice.version': { en: 'Notice version {version}', lo: 'ແຈ້ງການ ເວີຊັນ {version}' },
  'notice.agree': { en: 'I have read this and agree', lo: 'ຂ້ອຍໄດ້ອ່ານ ແລະ ຍອມຮັບ' },
  'notice.continue': { en: 'Agree and continue', lo: 'ຍອມຮັບ ແລະ ສືບຕໍ່' },

  // Age band (PRIV-002)
  'age.title': { en: 'How old are you?', lo: 'ເຈົ້າອາຍຸເທົ່າໃດ?' },
  'age.hint': { en: 'We ask for an age group only, never your birthday.', lo: 'ພວກເຮົາຖາມແຕ່ກຸ່ມອາຍຸ ບໍ່ຖາມວັນເກີດ.' },
  'age.u13': { en: 'Under 13', lo: 'ຕ່ຳກວ່າ 13 ປີ' },
  'age.13_15': { en: '13–15', lo: '13–15 ປີ' },
  'age.16_17': { en: '16–17', lo: '16–17 ປີ' },
  'age.18_plus': { en: '18 or older', lo: '18 ປີຂຶ້ນໄປ' },
  'age.u13Title': { en: 'Schooling is for older students for now', lo: 'ຕອນນີ້ ໂຮງຮຽນ ສຳລັບນັກຮຽນທີ່ໃຫຍ່ກວ່າ' },
  'age.u13Body': { en: 'It is open to students aged 13 and over. You can still use the rest of Bitdoin Academy.', lo: 'ເປີດໃຫ້ນັກຮຽນອາຍຸ 13 ປີຂຶ້ນໄປ. ເຈົ້າຍັງໃຊ້ສ່ວນອື່ນຂອງ Bitdoin Academy ໄດ້.' },

  // About you and your school (PROFILE-001/002)
  'details.title': { en: 'Your school year', lo: 'ສົກຮຽນຂອງເຈົ້າ' },
  'details.name': { en: 'Name to show', lo: 'ຊື່ທີ່ຈະສະແດງ' },
  'details.nameHint': { en: 'Only you see it. A nickname is fine.', lo: 'ມີແຕ່ເຈົ້າເຫັນ. ໃຊ້ຊື່ຫຼິ້ນກໍໄດ້.' },
  'details.nameError': { en: 'Enter a name of up to 40 characters', lo: 'ປ້ອນຊື່ບໍ່ເກີນ 40 ຕົວອັກສອນ' },
  'details.year': { en: 'School year', lo: 'ສົກຮຽນ' },
  'details.grade': { en: 'Grade', lo: 'ຊັ້ນຮຽນ' },
  'details.gradeError': { en: 'Choose your grade', lo: 'ເລືອກຊັ້ນຮຽນ' },
  'details.province': { en: 'Province', lo: 'ແຂວງ' },
  'details.provinceError': { en: 'Choose your province', lo: 'ເລືອກແຂວງ' },
  'details.district': { en: 'District', lo: 'ເມືອງ' },
  'details.choose': { en: 'Choose…', lo: 'ເລືອກ…' },
  'school.label': { en: 'School', lo: 'ໂຮງຮຽນ' },
  'school.placeholder': { en: "Type your school's name", lo: 'ພິມຊື່ໂຮງຮຽນຂອງເຈົ້າ' },
  'school.searchOrSelect': { en: 'Select a school below or search by name', lo: 'ເລືອກໂຮງຮຽນຂ້າງລຸ່ມ ຫຼື ຄົ້ນຫາຕາມຊື່' },
  'school.refine': { en: 'Showing the first 20 schools. Choose a district or type a name to narrow the list.', lo: 'ສະແດງ 20 ໂຮງຮຽນທຳອິດ. ເລືອກເມືອງ ຫຼື ພິມຊື່ເພື່ອຄົ້ນຫາໃຫ້ແຄບລົງ.' },
  'school.searchError': { en: 'Could not load schools. Please try again.', lo: 'ບໍ່ສາມາດໂຫຼດລາຍຊື່ໂຮງຮຽນໄດ້. ກະລຸນາລອງໃໝ່.' },
  'school.searching': { en: 'Searching…', lo: 'ກຳລັງຊອກຫາ…' },
  'school.noResults': { en: 'No school found with that name.', lo: 'ບໍ່ພົບໂຮງຮຽນຊື່ນີ້.' },
  'school.useTyped': { en: 'My school is not listed: use “{name}”', lo: 'ບໍ່ມີໂຮງຮຽນຂອງຂ້ອຍ: ໃຊ້ “{name}”' },
  'school.unverified': { en: 'We will check this school name and add it to the list.', lo: 'ພວກເຮົາຈະກວດຊື່ໂຮງຮຽນນີ້ ແລະ ເພີ່ມເຂົ້າລາຍຊື່.' },
  'school.change': { en: 'Change', lo: 'ປ່ຽນ' },
  'school.error': { en: 'Choose your school or type its name', lo: 'ເລືອກໂຮງຮຽນ ຫຼື ພິມຊື່ໂຮງຮຽນ' },

  // Subjects (PROFILE-003)
  'subjects.title': { en: 'Your subjects', lo: 'ວິຊາຂອງເຈົ້າ' },
  'subjects.hint': { en: 'Match your score book. You can change this later.', lo: 'ໃຫ້ກົງກັບປຶ້ມຄະແນນຂອງເຈົ້າ. ປ່ຽນພາຍຫຼັງໄດ້.' },
  'subjects.more': { en: 'More subjects', lo: 'ວິຊາອື່ນ' },
  'subjects.custom': { en: 'Add a subject not on the list', lo: 'ເພີ່ມວິຊາທີ່ບໍ່ມີໃນລາຍການ' },
  'subjects.add': { en: 'Add', lo: 'ເພີ່ມ' },
  'subjects.count': { en: '{count} of up to {max} subjects', lo: '{count} ຈາກສູງສຸດ {max} ວິຊາ' },
  'subjects.none': { en: 'Choose at least one subject', lo: 'ເລືອກຢ່າງໜ້ອຍໜຶ່ງວິຊາ' },
  'subjects.remove': { en: 'Remove {name}', lo: 'ເອົາ {name} ອອກ' },

  // Goals (PROFILE-006)
  'goals.title': { en: 'Anything you are aiming for?', lo: 'ເຈົ້າມີເປົ້າໝາຍຫຍັງບໍ?' },
  'goals.hint': { en: 'Optional. It helps us suggest useful lessons later.', lo: 'ບໍ່ບັງຄັບ. ຊ່ວຍໃຫ້ພວກເຮົາແນະນຳບົດຮຽນທີ່ເປັນປະໂຫຍດພາຍຫຼັງ.' },
  'goals.chip.exams': { en: 'Pass my exams', lo: 'ເສັງຜ່ານ' },
  'goals.chip.university': { en: 'Get into university', lo: 'ເຂົ້າມະຫາວິທະຍາໄລ' },
  'goals.chip.weak': { en: 'Improve weaker subjects', lo: 'ປັບປຸງວິຊາທີ່ອ່ອນ' },
  'goals.chip.scholarship': { en: 'Win a scholarship', lo: 'ໄດ້ທຶນການສຶກສາ' },
  'goals.text': { en: 'In your own words', lo: 'ຂຽນດ້ວຍຄຳເວົ້າຂອງເຈົ້າເອງ' },
  'goals.interests': { en: 'Subjects you enjoy', lo: 'ວິຊາທີ່ເຈົ້າມັກ' },
  'goals.skip': { en: 'Skip for now', lo: 'ຂ້າມໄປກ່ອນ' },
  'goals.finish': { en: 'Finish', lo: 'ສຳເລັດ' },

  // New school year and transfers (PROFILE-004/005)
  'year.title': { en: 'A new school year has started', lo: 'ສົກຮຽນໃໝ່ເລີ່ມແລ້ວ' },
  'year.body': { en: 'How did last year end? Your earlier scores stay exactly as they are.', lo: 'ປີທີ່ຜ່ານມາເປັນແນວໃດ? ຄະແນນເກົ່າຂອງເຈົ້າຍັງຢູ່ຄືເກົ່າ.' },
  'year.promoted': { en: 'I moved up to {grade}', lo: 'ຂ້ອຍຂຶ້ນ {grade}' },
  'year.repeated': { en: 'I am repeating {grade}', lo: 'ຂ້ອຍຮຽນຊ້ຳ {grade}' },
  'year.transferred': { en: 'I changed school', lo: 'ຂ້ອຍຍ້າຍໂຮງຮຽນ' },
  'year.left': { en: 'I left school', lo: 'ຂ້ອຍອອກຈາກໂຮງຮຽນ' },
  'year.startTitle': { en: 'Start your {year} school year', lo: 'ເລີ່ມສົກຮຽນ {year} ຂອງເຈົ້າ' },
  'year.startBody': { en: 'Tell us your grade and school for this year.', lo: 'ບອກຊັ້ນຮຽນ ແລະ ໂຮງຮຽນຂອງເຈົ້າໃນປີນີ້.' },
  'year.confirm': { en: 'Confirm', lo: 'ຢືນຢັນ' },
  'year.leftTitle': { en: 'Your history is kept', lo: 'ປະຫວັດຂອງເຈົ້າຍັງຖືກເກັບໄວ້' },
  'year.leftBody': { en: 'You can come back and start a new school year at any time.', lo: 'ເຈົ້າກັບມາເລີ່ມສົກຮຽນໃໝ່ໄດ້ທຸກເວລາ.' },
  'year.lastGrade': { en: 'You finished the last grade. Choose "I left school", or pick your grade below.', lo: 'ເຈົ້າຮຽນຈົບຊັ້ນສຸດທ້າຍແລ້ວ. ເລືອກ "ຂ້ອຍອອກຈາກໂຮງຮຽນ" ຫຼື ເລືອກຊັ້ນຮຽນຂ້າງລຸ່ມ.' },
  'transfer.title': { en: 'Changed school during the year?', lo: 'ຍ້າຍໂຮງຮຽນລະຫວ່າງປີບໍ?' },
  'transfer.month': { en: 'First month at the new school', lo: 'ເດືອນທຳອິດຢູ່ໂຮງຮຽນໃໝ່' },
  'transfer.body': { en: 'Scores before this month stay with your old school.', lo: 'ຄະແນນກ່ອນເດືອນນີ້ຍັງຢູ່ກັບໂຮງຮຽນເກົ່າ.' },
  'transfer.done': { en: 'School change saved', lo: 'ບັນທຶກການຍ້າຍໂຮງຮຽນແລ້ວ' },

  // My data (PROFILE-007)
  'data.title': { en: 'My data', lo: 'ຂໍ້ມູນຂອງຂ້ອຍ' },
  'data.link': { en: 'My data and privacy', lo: 'ຂໍ້ມູນ ແລະ ຄວາມເປັນສ່ວນຕົວ' },
  'data.profile': { en: 'Profile', lo: 'ໂປຣໄຟລ໌' },
  'data.ageBand': { en: 'Age group', lo: 'ກຸ່ມອາຍຸ' },
  'data.held': { en: 'What Schooling holds', lo: 'ຂໍ້ມູນທີ່ ໂຮງຮຽນ ເກັບໄວ້' },
  'data.count.enrolments': { en: 'School years', lo: 'ສົກຮຽນ' },
  'data.count.periods': { en: 'Months saved', lo: 'ເດືອນທີ່ບັນທຶກ' },
  'data.count.drafts': { en: 'Unsaved drafts', lo: 'ສະບັບຮ່າງ' },
  'data.count.scores': { en: 'Scores', lo: 'ຄະແນນ' },
  'data.count.corrections': { en: 'Corrections', lo: 'ການແກ້ໄຂ' },
  'data.count.uploads': { en: 'Score-book photos', lo: 'ຮູບປຶ້ມຄະແນນ' },
  'data.count.guardians': { en: 'Family links', lo: 'ການເຊື່ອມຕໍ່ກັບຄອບຄົວ' },
  'data.consents': { en: 'Permissions you gave', lo: 'ການອະນຸຍາດທີ່ເຈົ້າໃຫ້' },
  'data.consentActive': { en: 'Given {date}', lo: 'ໃຫ້ເມື່ອ {date}' },
  'data.consentWithdrawn': { en: 'Withdrawn {date}', lo: 'ຖອນເມື່ອ {date}' },
  'data.edit': { en: 'Edit', lo: 'ແກ້ໄຂ' },
  'data.saved': { en: 'Saved', lo: 'ບັນທຶກແລ້ວ' },
  // Score entry (SCORE-001..009)
  'entry.cta': { en: 'Add scores', lo: 'ເພີ່ມຄະແນນ' },
  'entry.subtitle': { en: 'Add your scores', lo: 'ເພີ່ມຄະແນນຂອງເຈົ້າ' },
  'entry.period': { en: 'Month', lo: 'ເດືອນ' },
  'entry.official': { en: '{label} · official result', lo: '{label} · ຜົນທາງການ' },
  'entry.periodState.submitted': { en: 'saved', lo: 'ບັນທຶກແລ້ວ' },
  'entry.periodState.draft': { en: 'draft', lo: 'ຮ່າງ' },
  'entry.scaleHint': { en: 'Scores out of {max}', lo: 'ຄະແນນເຕັມ {max}' },
  'entry.status.label': { en: 'Status for {subject}', lo: 'ສະຖານະຂອງ {subject}' },
  'entry.status.scored': { en: 'Score', lo: 'ມີຄະແນນ' },
  'entry.status.missing': { en: 'Not recorded yet', lo: 'ຍັງບໍ່ມີຄະແນນ' },
  'entry.status.not_applicable': { en: 'Not this month', lo: 'ບໍ່ມີເດືອນນີ້' },
  'entry.status.exempt': { en: 'Absent / exempt', lo: 'ຂາດ / ຍົກເວັ້ນ' },
  'entry.error.range': { en: 'Score must be between {min} and {max}', lo: 'ຄະແນນຕ້ອງຢູ່ລະຫວ່າງ {min} ຫາ {max}' },
  'entry.error.rangeStep': { en: 'Score must be between {min} and {max} in steps of {step}', lo: 'ຄະແນນຕ້ອງຢູ່ລະຫວ່າງ {min} ຫາ {max} ເທື່ອລະ {step}' },
  'entry.error.number': { en: 'Enter a number', lo: 'ປ້ອນຕົວເລກ' },
  'entry.error.level': { en: 'Use one of: {levels}', lo: 'ໃຊ້ໜຶ່ງໃນ: {levels}' },
  'entry.saving': { en: 'Saving…', lo: 'ກຳລັງບັນທຶກ…' },
  'entry.savedDraft': { en: 'Draft saved', lo: 'ບັນທຶກຮ່າງແລ້ວ' },
  'entry.savedLocal': { en: 'Offline: saved on this phone', lo: 'ອອບລາຍ: ບັນທຶກໄວ້ໃນເຄື່ອງນີ້' },
  'entry.review': { en: 'Review', lo: 'ກວດຄືນ' },
  'entry.reviewTitle': { en: 'Check before saving', lo: 'ກວດກ່ອນບັນທຶກ' },
  'entry.reviewHint': { en: 'Only saved months are used for your averages.', lo: 'ສະເພາະເດືອນທີ່ບັນທຶກແລ້ວ ຈຶ່ງໃຊ້ຄິດໄລ່ຄ່າສະເລ່ຍ.' },
  'entry.unfilled': { en: '{count} subjects still need a score or a status', lo: 'ຍັງມີ {count} ວິຊາ ທີ່ຕ້ອງໃສ່ຄະແນນ ຫຼື ສະຖານະ' },
  'entry.confirm': { en: 'Confirm and save', lo: 'ຢືນຢັນ ແລະ ບັນທຶກ' },
  'entry.backToEdit': { en: 'Back to edit', lo: 'ກັບໄປແກ້ໄຂ' },
  'entry.saved': { en: '{period} saved', lo: 'ບັນທຶກ {period} ແລ້ວ' },
  'entry.queued': { en: 'You are offline. It will save automatically when you reconnect.', lo: 'ເຈົ້າອອບລາຍຢູ່. ຈະບັນທຶກອັດຕະໂນມັດເມື່ອເຊື່ອມຕໍ່ໄດ້.' },
  'entry.duplicate': { en: 'Scores for this month were already saved. Here they are.', lo: 'ຄະແນນເດືອນນີ້ບັນທຶກໄວ້ແລ້ວ. ນີ້ແມ່ນຄະແນນເຫຼົ່ານັ້ນ.' },
  'entry.submittedOn': { en: 'Saved {date}', lo: 'ບັນທຶກເມື່ອ {date}' },
  'entry.readOnly': { en: 'This school year is closed. Scores can be viewed but not changed.', lo: 'ສົກຮຽນນີ້ປິດແລ້ວ. ເບິ່ງຄະແນນໄດ້ ແຕ່ແກ້ໄຂບໍ່ໄດ້.' },
  'entry.noPeriods': { en: 'No months are open for this school year yet.', lo: 'ຍັງບໍ່ມີເດືອນທີ່ເປີດສຳລັບສົກຮຽນນີ້.' },
  'entry.edited': { en: 'Edited', lo: 'ແກ້ໄຂແລ້ວ' },
  'entry.badge.verified': { en: 'Verified', lo: 'ຢືນຢັນແລ້ວ' },
  'entry.edit': { en: 'Correct', lo: 'ແກ້ໄຂ' },
  'entry.history': { en: 'History', lo: 'ປະຫວັດ' },
  'entry.correctTitle': { en: 'Correct {subject}', lo: 'ແກ້ໄຂ {subject}' },
  'entry.reason': { en: 'Reason (optional)', lo: 'ເຫດຜົນ (ບໍ່ບັງຄັບ)' },
  'entry.saveCorrection': { en: 'Save correction', lo: 'ບັນທຶກການແກ້ໄຂ' },
  'entry.corrected': { en: 'Correction saved. The old value stays in history.', lo: 'ບັນທຶກການແກ້ໄຂແລ້ວ. ຄ່າເກົ່າຍັງຢູ່ໃນປະຫວັດ.' },
  'entry.revisionBy.student': { en: 'by you', lo: 'ໂດຍເຈົ້າ' },
  'entry.revisionBy.admin': { en: 'by Bitdoin support', lo: 'ໂດຍທີມຊ່ວຍເຫຼືອ Bitdoin' },
  'entry.revisionBy.system': { en: 'by the system', lo: 'ໂດຍລະບົບ' },
  'entry.noRevisions': { en: 'No corrections yet.', lo: 'ຍັງບໍ່ມີການແກ້ໄຂ.' },

  // Dashboard (DASH-001..004, 006, 008). Descriptive only in Phase 1:
  // no labels, predictions or comparison with other students.
  'dash.average': { en: 'Average', lo: 'ຄ່າສະເລ່ຍ' },
  'dash.coverage': { en: '{recorded} of {active} subjects recorded', lo: 'ບັນທຶກ {recorded} ຈາກ {active} ວິຊາ' },
  'dash.missing': { en: '{count} not recorded yet', lo: '{count} ວິຊາຍັງບໍ່ມີຄະແນນ' },
  'dash.change.up': { en: 'Up {value} since {period}', lo: 'ເພີ່ມຂຶ້ນ {value} ຈາກ {period}' },
  'dash.change.down': { en: 'Down {value} since {period}', lo: 'ຫຼຸດລົງ {value} ຈາກ {period}' },
  'dash.change.same': { en: 'About the same as {period}', lo: 'ປະມານເທົ່າກັບ {period}' },
  'dash.change.first': { en: 'Add next month to see the change.', lo: 'ເພີ່ມເດືອນໜ້າ ເພື່ອເບິ່ງການປ່ຽນແປງ.' },
  'dash.lowCoverage': { en: 'Not enough subjects recorded for an average yet.', lo: 'ຍັງບັນທຶກວິຊາບໍ່ພໍສຳລັບຄິດຄ່າສະເລ່ຍ.' },
  'dash.oneMonth': { en: 'One month is not a trend. Keep adding months to see the pattern.', lo: 'ເດືອນດຽວຍັງບໍ່ແມ່ນແນວໂນ້ມ. ເພີ່ມເດືອນຕໍ່ໄປ ເພື່ອເບິ່ງຮູບແບບ.' },
  'dash.selfReported': { en: 'Scores you entered yourself, not official school records.', lo: 'ຄະແນນທີ່ເຈົ້າປ້ອນເອງ ບໍ່ແມ່ນເອກະສານທາງການຂອງໂຮງຮຽນ.' },
  'dash.stale': { en: 'Offline: showing what was loaded on {date}', lo: 'ອອບລາຍ: ສະແດງຂໍ້ມູນທີ່ໂຫຼດເມື່ອ {date}' },
  'dash.empty.title': { en: 'Add your first month', lo: 'ເພີ່ມເດືອນທຳອິດຂອງເຈົ້າ' },
  'dash.empty.body': { en: 'Copy the scores from your score book. It takes about a minute.', lo: 'ສຳເນົາຄະແນນຈາກປຶ້ມຄະແນນ. ໃຊ້ເວລາປະມານໜຶ່ງນາທີ.' },
  'dash.trend.title': { en: 'Monthly average', lo: 'ຄ່າສະເລ່ຍປະຈຳເດືອນ' },
  'dash.trend.rolling': { en: '3-month average', lo: 'ຄ່າສະເລ່ຍ 3 ເດືອນ' },
  'dash.trend.empty': { en: 'Add scores for at least 2 months to see how your average moves.', lo: 'ເພີ່ມຄະແນນຢ່າງໜ້ອຍ 2 ເດືອນ ເພື່ອເບິ່ງການເຄື່ອນໄຫວຂອງຄ່າສະເລ່ຍ.' },
  'dash.trend.gap': { en: 'Gaps are months without an average.', lo: 'ບ່ອນຫວ່າງ ແມ່ນເດືອນທີ່ບໍ່ມີຄ່າສະເລ່ຍ.' },
  'dash.trend.schoolChanged': { en: 'New school from {period}', lo: 'ໂຮງຮຽນໃໝ່ ຕັ້ງແຕ່ {period}' },
  'dash.compare.title': { en: 'Subjects in {period}', lo: 'ວິຊາໃນ {period}' },
  'dash.compare.others': { en: 'Without a score', lo: 'ບໍ່ມີຄະແນນ' },
  'dash.subjects.title': { en: 'Your subjects', lo: 'ວິຊາຂອງເຈົ້າ' },
  'dash.subjects.average': { en: 'Average {value} over {count} months', lo: 'ສະເລ່ຍ {value} ໃນ {count} ເດືອນ' },
  'dash.subjects.fewMonths': { en: 'Needs 2 months for an average', lo: 'ຕ້ອງມີ 2 ເດືອນຈຶ່ງມີຄ່າສະເລ່ຍ' },
  'dash.subject.back': { en: 'All subjects', lo: 'ວິຊາທັງໝົດ' },
  // Compare school years (DASH-007).
  'dash.years.title': { en: 'Compare school years', lo: 'ປຽບທຽບສົກຮຽນ' },
  'dash.years.show': { en: 'Compare years', lo: 'ປຽບທຽບປີ' },
  'dash.years.hide': { en: 'Hide', lo: 'ເຊື່ອງ' },
  'dash.years.with': { en: 'Compare with', lo: 'ປຽບທຽບກັບ' },
  'dash.years.chart': { en: '{subject}: this year and before', lo: '{subject}: ປີນີ້ ແລະ ກ່ອນໜ້າ' },
  'dash.years.percent': { en: 'Shown as a share of each year’s scale ({now} and {before}), because the scales differ.', lo: 'ສະແດງເປັນສ່ວນຮ້ອຍຂອງລະດັບຄະແນນແຕ່ລະປີ ({now} ແລະ {before}), ເພາະລະດັບຄະແນນຕ່າງກັນ.' },
  'dash.years.differentScale': { en: '{year} used a different kind of scale, so the years cannot be compared.', lo: '{year} ໃຊ້ລະດັບຄະແນນຄົນລະແບບ, ສະນັ້ນຈຶ່ງປຽບທຽບປີບໍ່ໄດ້.' },
  'dash.years.notNormalisable': { en: 'The scale used in {year} cannot be converted, so the years cannot be compared.', lo: 'ລະດັບຄະແນນທີ່ໃຊ້ໃນ {year} ປ່ຽນທຽບບໍ່ໄດ້, ສະນັ້ນຈຶ່ງປຽບທຽບປີບໍ່ໄດ້.' },
  'dash.years.note': { en: 'Months are lined up by the calendar. Different teachers and grades can change scores, so look at the overall direction.', lo: 'ເດືອນຖືກຈັດລຽງຕາມປະຕິທິນ. ຄູ ແລະ ຊັ້ນຮຽນທີ່ຕ່າງກັນ ອາດເຮັດໃຫ້ຄະແນນປ່ຽນ, ສະນັ້ນໃຫ້ເບິ່ງທິດທາງລວມ.' },
  'dash.subject.chart': { en: '{subject} by month', lo: '{subject} ແຕ່ລະເດືອນ' },
  'dash.subject.meanLine': { en: 'Your average', lo: 'ຄ່າສະເລ່ຍຂອງເຈົ້າ' },
  'dash.subject.latest': { en: 'Latest: {value} in {period}', lo: 'ລ່າສຸດ: {value} ໃນ {period}' },
  'dash.table.show': { en: 'View as table', lo: 'ເບິ່ງເປັນຕາຕະລາງ' },
  'dash.table.hide': { en: 'View as chart', lo: 'ເບິ່ງເປັນກຣາຟ' },
  'dash.table.month': { en: 'Month', lo: 'ເດືອນ' },
  'dash.table.subject': { en: 'Subject', lo: 'ວິຊາ' },
  'dash.table.score': { en: 'Score', lo: 'ຄະແນນ' },
  'dash.table.recorded': { en: 'Subjects recorded', lo: 'ວິຊາທີ່ບັນທຶກ' },

  // History (SCORE-010..012)
  'history.link': { en: 'History', lo: 'ປະຫວັດ' },
  'history.title': { en: 'Score history', lo: 'ປະຫວັດຄະແນນ' },
  'history.empty': { en: 'Nothing recorded yet.', lo: 'ຍັງບໍ່ມີການບັນທຶກ.' },
  'history.year': { en: '{year} · {grade}', lo: '{year} · {grade}' },
  'history.closed': { en: 'Closed · read-only', lo: 'ປິດແລ້ວ · ອ່ານໄດ້ຢ່າງດຽວ' },
  'history.closedReason.promoted': { en: 'Moved up', lo: 'ຂຶ້ນຊັ້ນ' },
  'history.closedReason.repeated': { en: 'Repeated', lo: 'ຮຽນຊ້ຳ' },
  'history.closedReason.transferred': { en: 'Changed school', lo: 'ຍ້າຍໂຮງຮຽນ' },
  'history.closedReason.left': { en: 'Left school', lo: 'ອອກຈາກໂຮງຮຽນ' },
  'history.closedReason.year_end': { en: 'Year ended', lo: 'ສິ້ນສຸດປີ' },
  'history.term': { en: 'Term {term}', lo: 'ພາກຮຽນ {term}' },
  'history.otherPeriods': { en: 'Other results', lo: 'ຜົນອື່ນໆ' },
  'history.notRecorded': { en: 'Not recorded', lo: 'ບໍ່ໄດ້ບັນທຶກ' },
  'history.draft': { en: 'Draft, not counted yet', lo: 'ຮ່າງ ຍັງບໍ່ໄດ້ນັບ' },
  'history.officialResult': { en: 'Official result', lo: 'ຜົນທາງການ' },
  'history.calculated': { en: 'Term average · calculated by Bitdoin', lo: 'ສະເລ່ຍພາກຮຽນ · ຄິດໄລ່ໂດຍ Bitdoin' },
  'history.calculatedHint': { en: 'From your saved monthly scores. Your school may calculate it differently.', lo: 'ຈາກຄະແນນປະຈຳເດືອນທີ່ບັນທຶກ. ໂຮງຮຽນອາດຄິດໄລ່ຕ່າງກັນ.' },
  'history.months': { en: '{count} months', lo: '{count} ເດືອນ' },
  'history.monthOne': { en: '1 month', lo: '1 ເດືອນ' },
  'history.add': { en: 'Add', lo: 'ເພີ່ມ' },
  'history.open': { en: 'Open', lo: 'ເປີດ' },
  'history.source.ocr_confirmed': { en: 'From photo', lo: 'ຈາກຮູບ' },
  'history.source.school_import': { en: 'From school', lo: 'ຈາກໂຮງຮຽນ' },
  'history.verification.guardian_acknowledged': { en: 'Checked by family', lo: 'ຄອບຄົວກວດແລ້ວ' },
  'history.verification.school_verified': { en: 'Verified by school', lo: 'ໂຮງຮຽນຢືນຢັນ' },
  'history.scale': { en: 'Scale {min}–{max}', lo: 'ສະເກວ {min}–{max}' },

  // Privacy actions (PRIV-003..005)
  'privacy.title': { en: 'Your choices', lo: 'ທາງເລືອກຂອງເຈົ້າ' },
  'privacy.withdraw': { en: 'Stop', lo: 'ຢຸດ' },
  'privacy.withdrawModuleTitle': { en: 'Stop keeping new scores?', lo: 'ຢຸດເກັບຄະແນນໃໝ່ບໍ?' },
  'privacy.withdrawModuleBody': { en: 'Nothing new will be saved and your scores become read-only. Your scores are not deleted; use "Delete" below for that. You can turn it back on any time.', lo: 'ຈະບໍ່ບັນທຶກຫຍັງໃໝ່ ແລະ ຄະແນນຂອງເຈົ້າຈະອ່ານໄດ້ຢ່າງດຽວ. ຄະແນນບໍ່ຖືກລຶບ; ຖ້າຢາກລຶບ ໃຫ້ໃຊ້ "ລຶບ" ຂ້າງລຸ່ມ. ເປີດຄືນໄດ້ທຸກເວລາ.' },
  'privacy.withdrawConfirm': { en: 'Yes, stop', lo: 'ແມ່ນ, ຢຸດ' },
  'privacy.export.title': { en: 'Download my data', lo: 'ດາວໂຫຼດຂໍ້ມູນຂອງຂ້ອຍ' },
  'privacy.export.body': { en: 'A ZIP file with your profile, school years, scores, corrections and permissions. It is made on this device right now.', lo: 'ໄຟລ໌ ZIP ທີ່ມີໂປຣໄຟລ໌, ສົກຮຽນ, ຄະແນນ, ການແກ້ໄຂ ແລະ ການອະນຸຍາດຂອງເຈົ້າ. ສ້າງຢູ່ໃນອຸປະກອນນີ້ທັນທີ.' },
  'privacy.export.button': { en: 'Download ZIP', lo: 'ດາວໂຫຼດ ZIP' },
  'privacy.export.done': { en: 'Your data was downloaded.', lo: 'ດາວໂຫຼດຂໍ້ມູນແລ້ວ.' },
  'privacy.export.reauthBody': { en: 'To protect your data, downloading it needs a fresh sign-in. You will come back here.', lo: 'ເພື່ອປົກປ້ອງຂໍ້ມູນ ການດາວໂຫຼດຕ້ອງເຂົ້າສູ່ລະບົບໃໝ່. ເຈົ້າຈະກັບມາໜ້ານີ້.' },
  'privacy.delete.title': { en: 'Delete', lo: 'ລຶບ' },
  'privacy.delete.scores': { en: 'Delete my scores only', lo: 'ລຶບສະເພາະຄະແນນ' },
  'privacy.delete.scoresBody': { en: 'Removes every saved score, draft and correction. Your profile and school years stay, so you can start recording again.', lo: 'ລຶບຄະແນນ, ຮ່າງ ແລະ ການແກ້ໄຂທັງໝົດ. ໂປຣໄຟລ໌ ແລະ ສົກຮຽນຍັງຢູ່ ເພື່ອໃຫ້ເລີ່ມບັນທຶກໃໝ່ໄດ້.' },
  'privacy.delete.profile': { en: 'Delete my whole Schooling profile', lo: 'ລຶບໂປຣໄຟລ໌ ໂຮງຮຽນ ທັງໝົດ' },
  'privacy.delete.profileBody': { en: 'Removes your profile, school years, scores and corrections. Your Bitdoin account and Academy membership are not affected.', lo: 'ລຶບໂປຣໄຟລ໌, ສົກຮຽນ, ຄະແນນ ແລະ ການແກ້ໄຂ. ບັນຊີ Bitdoin ແລະ ສະມາຊິກ Academy ບໍ່ໄດ້ຮັບຜົນກະທົບ.' },
  'privacy.delete.grace': { en: 'You have 14 days to change your mind. A record that you agreed to the privacy notice is kept as required.', lo: 'ເຈົ້າມີເວລາ 14 ມື້ ເພື່ອປ່ຽນໃຈ. ບັນທຶກວ່າເຈົ້າຍອມຮັບແຈ້ງການຄວາມເປັນສ່ວນຕົວ ຈະຖືກເກັບໄວ້ຕາມທີ່ກຳນົດ.' },
  'privacy.delete.continue': { en: 'Continue', lo: 'ສືບຕໍ່' },
  'privacy.delete.confirm': { en: 'Yes, delete in 14 days', lo: 'ແມ່ນ, ລຶບໃນ 14 ມື້' },
  'privacy.delete.reauthTitle': { en: 'Please sign in again', lo: 'ກະລຸນາເຂົ້າສູ່ລະບົບອີກຄັ້ງ' },
  'privacy.delete.reauthBody': { en: 'To protect your data, deleting needs a fresh sign-in. You will come back here.', lo: 'ເພື່ອປົກປ້ອງຂໍ້ມູນ ການລຶບຕ້ອງເຂົ້າສູ່ລະບົບໃໝ່. ເຈົ້າຈະກັບມາໜ້ານີ້.' },
  'privacy.delete.reauthButton': { en: 'Sign in again', lo: 'ເຂົ້າສູ່ລະບົບອີກຄັ້ງ' },
  'privacy.pending.title': { en: 'Deletion scheduled', lo: 'ກຳນົດການລຶບແລ້ວ' },
  'privacy.pending.scores': { en: 'Your scores will be deleted on {date}.', lo: 'ຄະແນນຂອງເຈົ້າຈະຖືກລຶບໃນວັນທີ {date}.' },
  'privacy.pending.profile': { en: 'Your Schooling profile will be deleted on {date}.', lo: 'ໂປຣໄຟລ໌ ໂຮງຮຽນ ຈະຖືກລຶບໃນວັນທີ {date}.' },
  'privacy.pending.readOnly': { en: 'Until then everything is read-only.', lo: 'ຈົນກວ່າຮອດມື້ນັ້ນ ທຸກຢ່າງອ່ານໄດ້ຢ່າງດຽວ.' },
  'privacy.pending.cancel': { en: 'Cancel deletion', lo: 'ຍົກເລີກການລຶບ' },
  'privacy.pending.cancelled': { en: 'Deletion cancelled.', lo: 'ຍົກເລີກການລຶບແລ້ວ.' },
  'privacy.readOnly': { en: 'Saving is paused because you stopped "Keep my scores in Schooling".', lo: 'ການບັນທຶກຖືກຢຸດ ເພາະເຈົ້າຢຸດ "ເກັບຄະແນນໄວ້ໃນ ໂຮງຮຽນ".' },

  // Reminders inbox and settings (BE-009, #27). Lao month labels are bare
  // names (ຕຸລາ), so `ເດືອນ` is part of the Lao templates.
  'inbox.title': { en: 'Reminders', lo: 'ການແຈ້ງເຕືອນ' },
  'inbox.open': { en: 'Reminders', lo: 'ການແຈ້ງເຕືອນ' },
  'inbox.openUnread': { en: 'Reminders, {count} new', lo: 'ການແຈ້ງເຕືອນ, ໃໝ່ {count}' },
  'inbox.empty.title': { en: 'You are all caught up', lo: 'ບໍ່ມີການແຈ້ງເຕືອນໃໝ່' },
  'inbox.empty.body': { en: 'When a month ends without scores, a gentle reminder appears here.', lo: 'ເມື່ອໝົດເດືອນແລ້ວ ແຕ່ຍັງບໍ່ມີຄະແນນ ຈະມີການແຈ້ງເຕືອນຢູ່ບ່ອນນີ້.' },
  'inbox.reminder.title': { en: 'Add your {month} scores', lo: 'ເພີ່ມຄະແນນເດືອນ{month}' },
  'inbox.reminder.titleAny': { en: "Add this month's scores", lo: 'ເພີ່ມຄະແນນປະຈຳເດືອນ' },
  'inbox.reminder.first': { en: 'Whenever you are ready, copy them from your score book. It only takes a minute.', lo: 'ເມື່ອພ້ອມແລ້ວ ຄັດລອກຈາກປຶ້ມຄະແນນໄດ້ເລີຍ. ໃຊ້ເວລາບໍ່ດົນ.' },
  'inbox.reminder.second': { en: 'This month is still open. Add it whenever you like, or mark subjects as "Not recorded yet".', lo: 'ເດືອນນີ້ຍັງເປີດຢູ່. ເພີ່ມໄດ້ທຸກເວລາ ຫຼື ໝາຍວິຊາວ່າ "ຍັງບໍ່ມີຄະແນນ".' },
  'inbox.new': { en: 'New', lo: 'ໃໝ່' },
  'inbox.dismiss': { en: 'Remove this reminder', lo: 'ລຶບການແຈ້ງເຕືອນນີ້' },
  'inbox.later': { en: 'Later', lo: 'ພາຍຫຼັງ' },
  'inbox.more': { en: 'Show older', lo: 'ສະແດງອັນເກົ່າກວ່າ' },
  'inbox.settings.title': { en: 'Reminder settings', lo: 'ຕັ້ງຄ່າການແຈ້ງເຕືອນ' },
  'inbox.settings.inApp': { en: 'Score reminders', lo: 'ແຈ້ງເຕືອນໃຫ້ເພີ່ມຄະແນນ' },
  'inbox.settings.inAppBody': { en: 'Shown here 7 days after a month ends without scores. At most 2 per month.', lo: 'ສະແດງຢູ່ບ່ອນນີ້ 7 ມື້ຫຼັງໝົດເດືອນ ຖ້າຍັງບໍ່ມີຄະແນນ. ບໍ່ເກີນ 2 ຄັ້ງຕໍ່ເດືອນ.' },
  'inbox.settings.push': { en: 'Also send to this device', lo: 'ສົ່ງໄປທີ່ອຸປະກອນນີ້ນຳ' },
  'inbox.settings.pushBody': { en: 'Never between {start} and {end} (Laos time), and at most 1 a day. The lock screen never shows scores.', lo: 'ບໍ່ສົ່ງລະຫວ່າງ {start} ຫາ {end} (ເວລາລາວ) ແລະ ບໍ່ເກີນມື້ລະ 1 ຄັ້ງ. ໜ້າຈໍລັອກບໍ່ສະແດງຄະແນນ.' },
  'inbox.settings.otherDevice': { en: 'Already on for another device.', lo: 'ເປີດຢູ່ໃນອຸປະກອນອື່ນແລ້ວ.' },
  'inbox.settings.ios': { en: 'On iPhone / iPad, notifications work once Bitdoin is on your Home Screen.', lo: 'ໃນ iPhone / iPad, ການແຈ້ງເຕືອນເຮັດວຽກເມື່ອເພີ່ມ Bitdoin ໃສ່ໜ້າຈໍໂຮມແລ້ວເທົ່ານັ້ນ.' },
  'inbox.settings.blocked': { en: 'Notifications for Bitdoin are blocked. Allow them in your browser or phone settings, then reload this page.', lo: 'ການແຈ້ງເຕືອນຂອງ Bitdoin ຖືກບລັອກໄວ້. ເປີດໃນການຕັ້ງຄ່າຂອງບຣາວເຊີ ຫຼື ໂທລະສັບ, ແລ້ວໂຫຼດໜ້ານີ້ໃໝ່.' },
  'inbox.settings.unsupported': { en: "This browser can't receive notifications. Try Chrome, Edge, Firefox or Safari.", lo: 'ບຣາວເຊີນີ້ບໍ່ຮອງຮັບການແຈ້ງເຕືອນ. ລອງໃຊ້ Chrome, Edge, Firefox ຫຼື Safari.' },
  'inbox.settings.denied': { en: 'Notifications are blocked. Allow them in your settings.', lo: 'ການແຈ້ງເຕືອນຖືກບລັອກ. ກະລຸນາອະນຸຍາດໃນການຕັ້ງຄ່າ.' },
  'inbox.settings.failed': { en: 'Could not update notifications. Please try again.', lo: 'ບັນທຶກບໍ່ສຳເລັດ. ກະລຸນາລອງໃໝ່.' },
  'inbox.settings.pushOn': { en: 'Reminders will also come to this device.', lo: 'ການແຈ້ງເຕືອນຈະສົ່ງມາອຸປະກອນນີ້ນຳ.' },

  'consent.purpose.module_processing': { en: 'Keep my scores in Schooling', lo: 'ເກັບຄະແນນໄວ້ໃນ ໂຮງຮຽນ' },
  'consent.purpose.push': { en: 'Send reminders to my device', lo: 'ສົ່ງການແຈ້ງເຕືອນໄປທີ່ອຸປະກອນ' },
  'consent.purpose.email': { en: 'Email me', lo: 'ສົ່ງອີເມວຫາຂ້ອຍ' },
  'consent.email.body': { en: 'E-mails about your account to the address on your Bitdoin account, such as 7 days and 1 day before Academy Premium ends.', lo: 'ອີເມວກ່ຽວກັບບັນຊີ ໄປທີ່ອີເມວໃນບັນຊີ Bitdoin ຂອງເຈົ້າ, ເຊັ່ນ ກ່ອນ Academy Premium ໝົດ 7 ມື້ ແລະ 1 ມື້.' },
  'consent.purpose.usage_statistics': { en: 'Usage statistics', lo: 'ສະຖິຕິການນຳໃຊ້' },
  'consent.usageStats.body': {
    en: 'Which screens you use and how long entering scores takes. Never your scores or name.',
    lo: 'ໜ້າທີ່ເຈົ້າໃຊ້ ແລະ ການປ້ອນຄະແນນໃຊ້ເວລາດົນປານໃດ. ບໍ່ມີຄະແນນ ຫຼື ຊື່ຂອງເຈົ້າ.',
  },
  'consent.usageStats.off': { en: 'Off', lo: 'ປິດຢູ່' },
  'consent.usageStats.turnOff': { en: 'Turn off', lo: 'ປິດ' },
  'consent.usageStats.turnOn': { en: 'Turn on', lo: 'ເປີດ' },

  // Subject labels, trends and explanations (P2-ANL)
  ...insightsCopy,
  // Diagnostic quizzes (P2-ANL)
  ...quizCopy,
  // Report a problem (PRIV-008)
  ...reportCopy,
  // Weekly next actions and practice sets (P2-REC)
  ...recommendationCopy,
  // Score-book scanning (P2-OCR)
  ...ocrCopy,
  // Academy Premium in Schooling (P3-BIL)
  ...entitlementCopy,
  // Study planner (P3-PLAN)
  ...plannerCopy,
  ...careerCopy,
  ...guardianCopy,
  // AI Coach in Schooling (P3-AI)
  ...coachCopy,
  // Mock exams (P5-EXAM)
  ...examCopy,
} as const satisfies Record<string, { en: string; lo: string }>

export type AcademicCopyKey = keyof typeof copy

function interpolate(text: string, vars?: Record<string, string | number>) {
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match))
}

/** Module strings in the user's Bitdoin language (AUTH-003: the shared EN/ລາວ setting). */
export function useAcademicCopy() {
  const { language } = useLanguage()
  const lo = language === 'lo'
  // Unknown keys (e.g. a consent purpose added later) fall back to the key itself.
  const t = (key: AcademicCopyKey, vars?: Record<string, string | number>) => interpolate((copy[key] as { en: string; lo: string } | undefined)?.[lo ? 'lo' : 'en'] ?? key, vars)
  return { t, lo, language }
}
