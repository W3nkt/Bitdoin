import { ArrowLeftRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '@/context/LanguageContext'
import { cn } from '@/lib/utils'

export function AdminPlatformSwitch({ platform, sidebar = false }: { platform: 'academy' | 'bookstore'; sidebar?: boolean }) {
  const { language } = useLanguage()
  const academy = platform === 'bookstore'
  const destination = academy ? 'Academy Admin' : 'Bookstore Admin'
  const label = language === 'lo' ? `ສະຫຼັບໄປ ${destination}` : `Switch to ${destination}`

  return (
    <Link to={academy ? '/academy-admin' : '/admin'} aria-label={label} title={label}
      className={cn('inline-flex shrink-0 items-center justify-center gap-2 rounded-full text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300',
        sidebar ? 'w-full rounded-xl bg-sky-400/15 px-3 py-2.5 text-sky-200 hover:bg-sky-400/25 hover:text-white'
          : 'h-10 bg-white/10 px-3 text-inherit hover:bg-white/20')}>
      <ArrowLeftRight aria-hidden className="h-4 w-4" />
      <span className={sidebar ? '' : 'hidden xl:inline'}>{label}</span>
    </Link>
  )
}
