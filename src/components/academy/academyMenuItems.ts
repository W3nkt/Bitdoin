import { Brain, Crown, Gamepad2, GraduationCap, Home, School, Sparkles, Users } from 'lucide-react'

export const academyNavigation = [
  { id: 'home', path: '/academy/home', en: 'Home', lo: 'ໜ້າຫຼັກ', detail: 'Your goals, streak and progress.', detailLo: 'ເປົ້າໝາຍ ແລະ ຄວາມກ້າວໜ້າຂອງທ່ານ', icon: Home, color: '#e48b26' },
  { id: 'learn', path: '/academy/learn', en: 'Learning Hub', lo: 'ສູນການຮຽນຮູ້', detail: 'Explore lessons and build new skills.', detailLo: 'ຄົ້ນຫາບົດຮຽນ ແລະ ສ້າງທັກສະໃໝ່', icon: GraduationCap, color: '#3989cd' },
  { id: 'scores', path: '/academy/scores', en: 'Schooling', lo: 'ໂຮງຮຽນ', detail: 'Your school results, privately.', detailLo: 'ຜົນການຮຽນຂອງເຈົ້າ ເປັນສ່ວນຕົວ', icon: School, color: '#6366f1' },
  { id: 'play', path: '/academy/play', en: 'Play & Learn', lo: 'ຮຽນຜ່ານການຫຼິ້ນ', detail: 'Practice with games and roleplay.', detailLo: 'ຝຶກຝົນຜ່ານເກມ ແລະ ບົດບາດສົມມຸດ', icon: Gamepad2, color: '#ab69ce' },
  { id: 'mentor', path: '/academy/mentor', en: 'Daily Mentor', lo: 'ຜູ້ແນະນຳປະຈຳວັນ', detail: 'Reflect, take a challenge and grow.', detailLo: 'ທົບທວນ ແລະ ທ້າທາຍຕົນເອງທຸກມື້', icon: Sparkles, color: '#df779d' },
  { id: 'community', path: '/academy/community', en: 'Community', lo: 'ຊຸມຊົນ', detail: 'Find member events and communities.', detailLo: 'ຄົ້ນຫາກິດຈະກຳ ແລະ ຊຸມຊົນສະມາຊິກ', icon: Users, color: '#31a59a' },
  { id: 'coach', path: '/academy/coach', en: 'AI Coach', lo: 'ຜູ້ຊ່ວຍ AI', detail: 'Talk through your next step.', detailLo: 'ປຶກສາກ່ຽວກັບກ້າວຕໍ່ໄປຂອງທ່ານ', icon: Brain, color: '#e5a832' },
  { id: 'membership', path: '/academy/membership', en: 'Membership', lo: 'ສະມາຊິກ', detail: 'Compare plans, manage membership and billing.', detailLo: 'ປຽບທຽບແຜນ ຈັດການສະມາຊິກ ແລະ ການຊຳລະ', icon: Crown, color: '#d59627' },
] as const

export type AcademySectionId = typeof academyNavigation[number]['id']

export function academySectionPath(id: string) {
  if (id === 'plans') return '/academy/membership'
  return academyNavigation.find(item => item.id === id)?.path
}
