import { ArrowDownAZ, Clock, Flame, Sparkles, type LucideIcon } from 'lucide-react'

export const SORTS = ['best', 'newest', 'featured', 'title'] as const
export type Sort = typeof SORTS[number]

export function parseSort(value: string | null): Sort {
  return SORTS.includes(value as Sort) ? value as Sort : 'best'
}

/** The four ways to order the catalog, in the order the page offers them. */
export const SORT_OPTIONS: { value: Sort; labelKey: string; hintKey: string; icon: LucideIcon }[] = [
  { value: 'best', labelKey: 'sidebar.bestSeller', hintKey: 'catalog.sortHint.best', icon: Flame },
  { value: 'newest', labelKey: 'sidebar.justArrived', hintKey: 'catalog.sortHint.newest', icon: Clock },
  { value: 'featured', labelKey: 'sidebar.editorPicks', hintKey: 'catalog.sortHint.featured', icon: Sparkles },
  { value: 'title', labelKey: 'catalog.sortTitle', hintKey: 'catalog.sortHint.title', icon: ArrowDownAZ },
]
