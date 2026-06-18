import { useState } from 'react'
import { BookOpen, ChevronDown, Clock, Flame, Sparkles, Tag } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Category } from '@/types'
import { useLanguage } from '@/context/LanguageContext'
import { cn } from '@/lib/utils'

interface BrowseSidebarProps {
  categories?: Category[]
  activeCategoryId?: string
  onSelectCategory: (categoryId: string) => void
  onSelectQuickLink?: (value: string) => void
  className?: string
  showFilters?: boolean
  activeLanguage?: string
  onSelectLanguage?: (language: string) => void
}

const quickLinks = [
  { labelKey: 'sidebar.bestSeller', value: 'best',     icon: Flame    },
  { labelKey: 'sidebar.justArrived',value: 'newest',   icon: Clock    },
  { labelKey: 'sidebar.editorPicks', value: 'featured', icon: Sparkles },
]

export function BrowseSidebar({
  categories,
  activeCategoryId,
  onSelectCategory,
  onSelectQuickLink,
  className,
  showFilters = false,
  activeLanguage = '',
  onSelectLanguage,
}: BrowseSidebarProps) {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const [expanded, setExpanded] = useState(false)

  // Label shown in the collapsed toggle (current selection)
  const activeLabel = activeCategoryId
    ? categories?.find(c => c.id === activeCategoryId)?.[language === 'lo' ? 'name_lo' : 'name_en']
    : t('sidebar.allBooks')

  function close() { setExpanded(false) }

  return (
    <aside className={cn(
      'bg-[#30343a] text-white lg:max-h-none lg:h-[calc(100vh-4rem)] lg:overflow-y-auto scrollbar-hide',
      className,
    )}>

      {/* ── Mobile toggle — hidden on lg+ ── */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="lg:hidden flex w-full items-center justify-between px-4 py-3.5 text-white"
      >
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="h-4 w-4 text-accent-400 flex-shrink-0" />
          <span className="text-sm font-semibold">{t('sidebar.browse')}</span>
          {!expanded && activeLabel && (
            <span className="ml-1 truncate rounded-full bg-accent-500/20 px-2 py-0.5 text-[10px] font-bold text-accent-400 max-w-[130px]">
              {activeLabel}
            </span>
          )}
        </div>
        <ChevronDown className={cn(
          'h-4 w-4 flex-shrink-0 text-white/60 transition-transform duration-200',
          expanded && 'rotate-180',
        )} />
      </button>

      {/* ── Sidebar content ──
          Mobile:  max-h-0 (collapsed) / max-h-[640px] (expanded), overflow-hidden
          Desktop: lg:max-h-none lg:overflow-visible always visible
      ── */}
      <div className={cn(
        'overflow-hidden transition-[max-height] duration-300 ease-in-out',
        'lg:!max-h-none lg:!overflow-visible',
        expanded ? 'max-h-[640px]' : 'max-h-0',
      )}>
        <div className="space-y-5 p-4">

          {/* Quick links */}
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-white/45">
              {t('sidebar.browse')}
            </p>
            <div className="space-y-0.5">
              {quickLinks.map(({ labelKey, value, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => { onSelectQuickLink?.(value); close() }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2.5 text-left text-xs font-medium text-white/82 transition-colors hover:bg-white/10 hover:text-white active:bg-white/20"
                >
                  <Icon className="h-3.5 w-3.5 flex-shrink-0 text-accent-400" />
                  {t(labelKey)}
                </button>
              ))}
              <button
                onClick={() => { onSelectCategory(''); close() }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-2 py-2.5 text-left text-xs font-medium transition-colors',
                  !activeCategoryId
                    ? 'bg-white text-[#30343a] font-semibold'
                    : 'text-white/82 hover:bg-white/10 hover:text-white active:bg-white/20',
                )}
              >
                <BookOpen className="h-3.5 w-3.5 flex-shrink-0 text-accent-400" />
                {t('sidebar.allBooks')}
              </button>
            </div>
          </div>

          {/* Language filter */}
          {showFilters && (
            <div className="border-t border-white/10 pt-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-white/45">
                {t('sidebar.language')}
              </p>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { label: t('common.all'),      value: ''        },
                  { label: t('sidebar.lao'),     value: 'Lao'     },
                  { label: t('sidebar.english'), value: 'English' },
                ].map(option => (
                  <button
                    key={option.value || 'all'}
                    onClick={() => onSelectLanguage?.(option.value)}
                    className={cn(
                      'min-w-0 rounded-lg px-1 py-2 text-[11px] font-semibold leading-none transition-colors',
                      activeLanguage === option.value
                        ? 'bg-white text-[#30343a]'
                        : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white',
                    )}
                  >
                    <span className="block truncate">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Categories */}
          <div className="border-t border-white/10 pt-4">
            <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-white/45">
              <Tag className="h-3 w-3" />
              {t('sidebar.category')}
            </p>
            <div className="space-y-0.5 pr-1">
              {categories?.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { onSelectCategory(cat.id); close() }}
                  className={cn(
                    'block w-full rounded-lg px-2 py-2.5 text-left text-xs transition-colors',
                    activeCategoryId === cat.id
                      ? 'bg-accent-500 text-white font-semibold'
                      : 'text-white/74 hover:bg-white/10 hover:text-white active:bg-white/20',
                  )}
                >
                  {language === 'lo' ? cat.name_lo : cat.name_en}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div className="border-t border-white/10 pt-4 text-[11px] leading-relaxed text-white/60">
            {t('sidebar.note')}
          </div>

        </div>
      </div>

    </aside>
  )
}
