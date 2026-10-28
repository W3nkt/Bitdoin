import { GraduationCap, LayoutDashboard, School, Store } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { ResponsiveAcademyMenu, type AcademyMenuItem } from '@/components/academy/AcademyMenu'

function preloadAdminDestination(path: string) {
  if (path === '/academy-admin/learning') return import('@/pages/premium/LearningAdmin').catch(() => undefined)
  if (path === '/academy-admin/scores') return import('@/pages/premium/MyScoresAdmin').catch(() => undefined)
  if (path === '/admin') return import('@/pages/admin/Dashboard').catch(() => undefined)
  return import('@/pages/premium/AdminDashboard').catch(() => undefined)
}

export function AcademyAdminMenu({ sections }: { sections?: AcademyMenuItem[] }) {
  const { pathname } = useLocation()
  const items: AcademyMenuItem[] = [
    ...(sections ?? [{ id: 'overview', en: 'Overview', lo: 'ພາບລວມ', detail: 'Memberships, payments and Academy activity.', detailLo: 'ສະມາຊິກ ການຊຳລະ ແລະ ກິດຈະກຳ Academy', icon: LayoutDashboard, color: '#e48b26', path: '/academy-admin', active: pathname === '/academy-admin' }]),
    { id: 'learning', en: 'Learning Content', lo: 'ເນື້ອຫາການຮຽນ', detail: 'Manage lessons, opportunities and challenges.', detailLo: 'ຈັດການບົດຮຽນ ໂອກາດ ແລະ ສິ່ງທ້າທາຍ', icon: GraduationCap, color: '#3989cd', path: '/academy-admin/learning', active: pathname === '/academy-admin/learning' },
    { id: 'schooling', en: 'Schooling', lo: 'ໂຮງຮຽນ', detail: 'School configuration and student support.', detailLo: 'ການຕັ້ງຄ່າໂຮງຮຽນ ແລະ ຊ່ວຍເຫຼືອນັກຮຽນ', icon: School, color: '#6366f1', path: '/academy-admin/scores', active: pathname === '/academy-admin/scores' },
    { id: 'bookstore', en: 'Bookstore Admin', lo: 'ຈັດການຮ້ານປຶ້ມ', detail: 'Switch to the Bookstore admin platform.', detailLo: 'ສະຫຼັບໄປໜ້າຈັດການຮ້ານປຶ້ມ', icon: Store, color: '#31a59a', path: '/admin' },
  ]

  return <ResponsiveAcademyMenu key={pathname} pathname={pathname} items={items}
    title={{ en: 'Academy Admin menu', lo: 'ເມນູຈັດການ Academy' }} brand="BITDOIN ACADEMY ADMIN" preload={preloadAdminDestination} docked />
}
