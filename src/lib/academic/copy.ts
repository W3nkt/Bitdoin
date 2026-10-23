import { useLanguage } from '@/context/LanguageContext'

// Every My Scores interface string, in one place.
//
// DRAFT Lao copy, pending the UX-005 Lao copy pack: a native educator must
// review every `lo` string before the module launches (my_scores_enabled).
// Tone rules (NOTIF-004, PRD §14.13): encouraging, never shaming, no
// comparison with other students.

const copy = {
  // Shell and entry points
  'shell.title': { en: 'My Scores', lo: 'ຄະແນນຂອງຂ້ອຍ' },
  'shell.subtitle': { en: 'Your school results, privately', lo: 'ຜົນການຮຽນຂອງເຈົ້າ ເປັນສ່ວນຕົວ' },
  'shell.back': { en: 'Back to Academy', lo: 'ກັບໄປ Academy' },
  'entry.tile': { en: 'My Scores', lo: 'ຄະແນນ' },
  'entry.profileLink': { en: 'My Scores', lo: 'ຄະແນນຂອງຂ້ອຍ' },

  // Module states
  'state.unavailable.title': { en: 'My Scores is coming soon', lo: 'ຄະແນນຂອງຂ້ອຍ ຈະມາໃນໄວໆນີ້' },
  'state.unavailable.body': {
    en: 'We are getting monthly score tracking ready for students. It will appear here when it opens.',
    lo: 'ພວກເຮົາກຳລັງກຽມລະບົບບັນທຶກຄະແນນປະຈຳເດືອນສຳລັບນັກຮຽນ. ເມື່ອເປີດໃຫ້ໃຊ້ ຈະສະແດງຢູ່ບ່ອນນີ້.',
  },
  'state.error.title': { en: 'We could not load My Scores', lo: 'ບໍ່ສາມາດໂຫຼດ ຄະແນນຂອງຂ້ອຍ ໄດ້' },
  'state.error.body': { en: 'Check your connection and try again.', lo: 'ກວດເບິ່ງອິນເຕີເນັດ ແລ້ວລອງໃໝ່ອີກຄັ້ງ.' },
  'state.error.rateLimited': { en: 'Too many requests. Wait a minute, then try again.', lo: 'ມີການຮ້ອງຂໍຫຼາຍເກີນໄປ. ລໍຖ້າໜຶ່ງນາທີ ແລ້ວລອງໃໝ່.' },
  'state.retry': { en: 'Try again', lo: 'ລອງໃໝ່' },
  'state.next.onboarding': { en: 'Set up My Scores', lo: 'ຕັ້ງຄ່າ ຄະແນນຂອງຂ້ອຍ' },
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
  'error.generic': { en: 'Something went wrong. Please try again.', lo: 'ມີບາງຢ່າງຜິດພາດ. ກະລຸນາລອງໃໝ່.' },
  'error.noticeOutdated': { en: 'The privacy notice was updated. Please read it again.', lo: 'ແຈ້ງການຄວາມເປັນສ່ວນຕົວຖືກປັບປຸງ. ກະລຸນາອ່ານອີກຄັ້ງ.' },
  'error.versionConflict': { en: 'This changed on another device. Reload and try again.', lo: 'ຂໍ້ມູນນີ້ຖືກປ່ຽນຢູ່ອຸປະກອນອື່ນ. ໂຫຼດໃໝ່ ແລ້ວລອງອີກຄັ້ງ.' },
  'error.calendarMissing': { en: 'Your school year is not set up yet. Please check back soon.', lo: 'ສົກຮຽນຂອງເຈົ້າຍັງບໍ່ທັນຕັ້ງຄ່າ. ກະລຸນາກັບມາເບິ່ງໃໝ່ໄວໆນີ້.' },

  // Privacy notice (PRIV-001): layered, summary under 150 words.
  'notice.title': { en: 'Before you start', lo: 'ກ່ອນເລີ່ມຕົ້ນ' },
  'notice.updatedTitle': { en: 'We updated the privacy notice', lo: 'ພວກເຮົາປັບປຸງແຈ້ງການຄວາມເປັນສ່ວນຕົວແລ້ວ' },
  'notice.pausedTitle': { en: 'My Scores is paused', lo: 'ຄະແນນຂອງຂ້ອຍ ຖືກຢຸດໄວ້' },
  'notice.pausedBody': { en: 'You withdrew permission, so nothing new is saved. Agree again to keep recording, or delete your data in My data.', lo: 'ເຈົ້າໄດ້ຖອນການອະນຸຍາດ ຈຶ່ງບໍ່ມີການບັນທຶກຫຍັງໃໝ່. ຍອມຮັບອີກຄັ້ງເພື່ອບັນທຶກຕໍ່ ຫຼື ລຶບຂໍ້ມູນຢູ່ໃນ ຂໍ້ມູນຂອງຂ້ອຍ.' },
  'notice.what': {
    en: 'What we keep: the name you choose to show, your age group, province, school, grade and the scores you type in. We never ask for your date of birth, phone number or address.',
    lo: 'ສິ່ງທີ່ເກັບໄວ້: ຊື່ທີ່ເຈົ້າເລືອກສະແດງ, ກຸ່ມອາຍຸ, ແຂວງ, ໂຮງຮຽນ, ຊັ້ນຮຽນ ແລະ ຄະແນນທີ່ເຈົ້າປ້ອນ. ພວກເຮົາບໍ່ຖາມວັນເດືອນປີເກີດ, ເບີໂທ ຫຼື ທີ່ຢູ່.',
  },
  'notice.why': {
    en: 'Why: to show you your own averages and how your scores change over time.',
    lo: 'ເພື່ອຫຍັງ: ເພື່ອສະແດງຄ່າສະເລ່ຍ ແລະ ການປ່ຽນແປງຄະແນນຂອງເຈົ້າເອງຕາມເວລາ.',
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
    en: 'Data is stored on Bitdoin\'s servers with the rest of your Bitdoin account and protected by access controls. We keep it until you delete it, or for 3 years after you last use My Scores, after a reminder. Records that you agreed to this notice are kept as proof even after deletion. Score books are not uploaded in this version. We do not use your scores for advertising, ranking or any comparison with other students.',
    lo: 'ຂໍ້ມູນເກັບໄວ້ໃນເຊີບເວີຂອງ Bitdoin ພ້ອມກັບບັນຊີ Bitdoin ຂອງເຈົ້າ ແລະ ມີການຄວບຄຸມການເຂົ້າເຖິງ. ພວກເຮົາເກັບໄວ້ຈົນກວ່າເຈົ້າຈະລຶບ ຫຼື 3 ປີຫຼັງຈາກເຈົ້າໃຊ້ຄັ້ງສຸດທ້າຍ ໂດຍຈະແຈ້ງເຕືອນກ່ອນ. ບັນທຶກວ່າເຈົ້າຍອມຮັບແຈ້ງການນີ້ ຈະເກັບໄວ້ເປັນຫຼັກຖານ ເຖິງແມ່ນລຶບແລ້ວ. ເວີຊັນນີ້ບໍ່ມີການອັບໂຫຼດປຶ້ມຄະແນນ. ພວກເຮົາບໍ່ໃຊ້ຄະແນນຂອງເຈົ້າເພື່ອໂຄສະນາ, ຈັດອັນດັບ ຫຼື ປຽບທຽບກັບນັກຮຽນຄົນອື່ນ.',
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
  'age.u13Title': { en: 'My Scores is for older students for now', lo: 'ຕອນນີ້ ຄະແນນຂອງຂ້ອຍ ສຳລັບນັກຮຽນທີ່ໃຫຍ່ກວ່າ' },
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
  'data.held': { en: 'What My Scores holds', lo: 'ຂໍ້ມູນທີ່ ຄະແນນຂອງຂ້ອຍ ເກັບໄວ້' },
  'data.count.enrolments': { en: 'School years', lo: 'ສົກຮຽນ' },
  'data.count.periods': { en: 'Months saved', lo: 'ເດືອນທີ່ບັນທຶກ' },
  'data.count.drafts': { en: 'Unsaved drafts', lo: 'ສະບັບຮ່າງ' },
  'data.count.scores': { en: 'Scores', lo: 'ຄະແນນ' },
  'data.count.corrections': { en: 'Corrections', lo: 'ການແກ້ໄຂ' },
  'data.count.uploads': { en: 'Score-book photos', lo: 'ຮູບປຶ້ມຄະແນນ' },
  'data.count.guardians': { en: 'Family links', lo: 'ການເຊື່ອມຕໍ່ຄອບຄົວ' },
  'data.consents': { en: 'Permissions you gave', lo: 'ການອະນຸຍາດທີ່ເຈົ້າໃຫ້' },
  'data.consentActive': { en: 'Given {date}', lo: 'ໃຫ້ເມື່ອ {date}' },
  'data.consentWithdrawn': { en: 'Withdrawn {date}', lo: 'ຖອນເມື່ອ {date}' },
  'data.edit': { en: 'Edit', lo: 'ແກ້ໄຂ' },
  'data.saved': { en: 'Saved', lo: 'ບັນທຶກແລ້ວ' },
  'consent.purpose.module_processing': { en: 'Keep my scores in My Scores', lo: 'ເກັບຄະແນນໄວ້ໃນ ຄະແນນຂອງຂ້ອຍ' },
  'consent.purpose.push': { en: 'Send reminders to my device', lo: 'ສົ່ງການແຈ້ງເຕືອນໄປທີ່ອຸປະກອນ' },
  'consent.purpose.email': { en: 'Email me', lo: 'ສົ່ງອີເມວຫາຂ້ອຍ' },
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
  const t = (key: AcademicCopyKey, vars?: Record<string, string | number>) => interpolate(copy[key][lo ? 'lo' : 'en'], vars)
  return { t, lo, language }
}
