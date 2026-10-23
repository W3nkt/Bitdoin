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
