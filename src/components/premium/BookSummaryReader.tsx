import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Check, List, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { FlipBook, type FlipBookPage } from '@/components/premium/FlipBook'

type ReaderListItem = { label?: string; body: string }
type ReaderBlock =
  | { type: 'p'; text: string }
  | { type: 'h4'; text: string }
  | { type: 'list'; items: ReaderListItem[] }
  | { type: 'term'; term: string; body: string }
  | { type: 'oneline'; text: string }
type ReaderSection = { heading: string; body?: string; blocks?: ReaderBlock[]; oneline?: string }
type ReaderGlossaryTerm = { term: string; body: string }
type ReaderQuizQuestion = { id: string; prompt: string; options: string[] }

interface BookSummaryReaderProps {
  language: 'en' | 'lo'
  title: string
  deck: string
  estimatedMinutes: number
  difficulty: string
  bookTitle?: string
  bookAuthor?: string | null
  coverImageUrl?: string | null
  bookHref?: string
  sections: ReaderSection[]
  takeaways: string[]
  glossary: ReaderGlossaryTerm[]
  reflectionQuestions: string[]
  quiz: ReaderQuizQuestion[]
  answers: Record<string, number>
  onAnswer: (questionId: string, index: number) => void
  completed: boolean
  completing: boolean
  allAnswered: boolean
  onComplete: () => void
}

const STRINGS: Record<string, { en: string; lo: string }> = {
  'Book Summary':          { en: 'Book Summary', lo: 'ສະຫຼຸບປຶ້ມ' },
  'A summary of':          { en: 'A summary of', lo: 'ສະຫຼຸບຈາກປຶ້ມ' },
  'by':                    { en: 'by', lo: 'ໂດຍ' },
  'min read':              { en: 'min read', lo: 'ນາທີອ່ານ' },
  'chapters':              { en: 'chapters', lo: 'ບົດ' },
  'Chapter':                { en: 'Chapter', lo: 'ບົດທີ' },
  'continued':             { en: 'continued', lo: 'ຕໍ່' },
  'In one line.':          { en: 'In one line. ', lo: 'ໂດຍສະຫຼຸບ. ' },
  'Keep these ideas':      { en: 'Keep these ideas', lo: 'ຈື່ແນວຄິດເຫຼົ່ານີ້' },
  'Key Takeaways':         { en: 'Key Takeaways', lo: 'ແນວຄິດສຳຄັນ' },
  'Glossary':              { en: 'Glossary', lo: 'ຄຳສັບ' },
  'Terms worth remembering': { en: 'Terms worth remembering', lo: 'ຄຳສັບຄວນຈື່' },
  'Reflect':               { en: 'Reflect', lo: 'ໄຕ່ຕອງ' },
  'Questions to sit with': { en: 'Questions to sit with', lo: 'ຄຳຖາມໃຫ້ຄິດຕໍ່' },
  'Quick check':           { en: 'Quick check', lo: 'ກວດຄວາມເຂົ້າໃຈ' },
  'You reached the end':   { en: 'You reached the end', lo: 'ທ່ານອ່ານຈົບແລ້ວ' },
  'Lesson completed':      { en: 'Lesson completed', lo: 'ບົດຮຽນສຳເລັດ' },
  'Complete lesson':       { en: 'Complete lesson', lo: 'ສຳເລັດບົດຮຽນ' },
  'View in Bookstore':     { en: 'View in Bookstore', lo: 'ເບິ່ງໃນຮ້ານປຶ້ມ' },
  'Contents':              { en: 'Contents', lo: 'ສາລະບານ' },
  'Cover':                 { en: 'Cover', lo: 'ໜ້າປົກ' },
  'Finish':                { en: 'Finish', lo: 'ຈົບບົດຮຽນ' },
}

function useBookReaderStrings(language: 'en' | 'lo') {
  return (key: keyof typeof STRINGS) => STRINGS[key][language]
}

function usePageMetrics(language: 'en' | 'lo') {
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const pageWidth = Math.min(vp.w * 0.92, 460)
  const pageHeight = Math.min(vp.h * 0.70, 600)
  const charWidth = language === 'lo' ? 5.8 : 6.6
  const lineHeight = language === 'lo' ? 24 : 21
  const charsPerLine = Math.max(24, Math.floor((pageWidth - 48) / charWidth))
  // Headings render larger than body text, so fewer characters fit per line.
  const headingCharsPerLine = Math.max(14, Math.round(charsPerLine * 0.72))
  const headingLineHeight = 25
  // Continuation pages only show a slim running eyebrow, so their budget is
  // flat. The first page of a section also carries a title (and sometimes a
  // subtitle/byline) whose height varies a lot — from a one-line chapter
  // heading to a long book title wrapping several lines — so that budget is
  // computed per-title from its actual estimated line count instead of a
  // fixed guess. Both are deliberately a little conservative; a scroll
  // fallback inside the page covers any remaining estimation error.
  const continuationBudget = Math.max(160, pageHeight - 48 - 36)
  function firstPageBudgetFor(titleText?: string, hasSubtitle?: boolean) {
    if (!titleText) return continuationBudget
    const titleLines = Math.max(1, Math.ceil(titleText.length / headingCharsPerLine))
    const chrome = 18 /* eyebrow */ + titleLines * headingLineHeight + 4 /* mt-1 */ + (hasSubtitle ? lineHeight * 0.9 + 4 : 0) + 16 /* mt-4 */
    return Math.max(120, pageHeight - 48 - chrome)
  }
  return { charsPerLine, lineHeight, continuationBudget, firstPageBudgetFor }
}

function paginateWeighted<T>(items: T[], weight: (item: T) => number, budgetFor: (pageIndex: number) => number): T[][] {
  const groups: T[][] = []
  let current: T[] = []
  let sum = 0
  for (const item of items) {
    const w = weight(item)
    const budget = budgetFor(groups.length)
    if (current.length && sum + w > budget) {
      groups.push(current)
      current = []
      sum = 0
    }
    current.push(item)
    sum += w
  }
  if (current.length) groups.push(current)
  return groups
}

function renderBlock(block: ReaderBlock, i: number, t: (k: keyof typeof STRINGS) => string) {
  if (block.type === 'p') return <p key={i} className="mt-3 text-[13.5px] leading-6 text-slate-600 first:mt-0">{block.text}</p>
  if (block.type === 'h4') return <h4 key={i} className="mt-5 text-sm font-black text-slate-900 first:mt-0">{block.text}</h4>
  if (block.type === 'oneline') return (
    <div key={i} className="mt-4 border-l-2 border-primary-600 pl-3 first:mt-0">
      <p className="text-[12.5px] leading-5 text-slate-600"><span className="font-black text-slate-900">{t('In one line.')}</span>{block.text}</p>
    </div>
  )
  if (block.type === 'term') return (
    <div key={i} className="mt-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100 first:mt-0">
      <p className="text-xs font-black text-slate-900">{block.term}</p>
      <p className="mt-1 text-xs leading-5 text-slate-600">{block.body}</p>
    </div>
  )
  return (
    <ul key={i} className="mt-3 list-disc space-y-2 pl-4 text-[13px] leading-5 text-slate-600 first:mt-0">
      {block.items.map((item, ii) => (
        <li key={ii}>{item.label && <b className="font-black text-slate-900">{item.label} </b>}{item.body}</li>
      ))}
    </ul>
  )
}

function FlowPage({ eyebrow, title, subtitle, children }: { eyebrow: string; title?: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex h-full flex-col p-6">
      <header className="shrink-0">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary-500">{eyebrow}</p>
        {title && <h3 className="mt-1 text-lg font-black leading-snug text-slate-900">{title}</h3>}
        {subtitle && <p className="mt-1 text-xs font-semibold text-slate-500">{subtitle}</p>}
      </header>
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">{children}</div>
    </div>
  )
}

// Splits flowing prose into sentence-sized chunks so a long "about this
// summary" deck can be paginated like any other block content, instead of
// overflowing a single fixed-height page.
function splitIntoSentences(text: string): string[] {
  const parts = text.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) ?? [text]
  return parts.map(s => s.trim()).filter(Boolean)
}

type PageSpec = { id: string; numbered: boolean; paper?: 'cover' | 'sheet'; render: ReactNode; toc?: string }

function CoverImage({ src }: { src: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <div className="absolute inset-0 bg-gradient-to-br from-primary-900 via-primary-950 to-black" />
  return <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" onError={() => setFailed(true)} />
}

export function BookSummaryReader(props: BookSummaryReaderProps) {
  const {
    language, title, deck, estimatedMinutes, difficulty, bookTitle, bookAuthor, coverImageUrl, bookHref,
    sections, takeaways, glossary, reflectionQuestions, quiz, answers, onAnswer, completed, completing, allAnswered, onComplete,
  } = props
  const t = useBookReaderStrings(language)
  const { charsPerLine, lineHeight, continuationBudget, firstPageBudgetFor } = usePageMetrics(language)
  const [pageIndex, setPageIndex] = useState(0)
  const [tocOpen, setTocOpen] = useState(false)

  const { pages, toc } = useMemo(() => {
    function makeBudgetFor(titleText?: string, hasSubtitle?: boolean) {
      const first = firstPageBudgetFor(titleText, hasSubtitle)
      return (pageIndexInGroup: number) => pageIndexInGroup === 0 ? first : continuationBudget
    }
    function linesFor(text: string) { return Math.max(1, Math.ceil(text.length / charsPerLine)) }
    function blockHeight(b: ReaderBlock): number {
      if (b.type === 'p') return linesFor(b.text) * lineHeight + 12
      if (b.type === 'h4') return lineHeight + 20
      if (b.type === 'oneline') return linesFor(b.text) * lineHeight + 24
      if (b.type === 'term') return linesFor(b.term) * lineHeight * 0.9 + linesFor(b.body) * lineHeight + 32
      return b.items.reduce((sum, it) => sum + linesFor(`${it.label ?? ''} ${it.body}`) * lineHeight, 0) + b.items.length * 8 + 12
    }
    function fixOrphanHeadings(groups: ReaderBlock[][]) {
      for (let i = 0; i < groups.length - 1; i++) {
        const g = groups[i]
        const last = g[g.length - 1]
        if (last?.type === 'h4' && g.length > 1) {
          g.pop()
          groups[i + 1].unshift(last)
        }
      }
    }

    const specs: PageSpec[] = []

    specs.push({
      id: 'cover', numbered: false, paper: 'cover', toc: t('Cover'),
      render: (
        <div className="relative flex h-full flex-col">
          {coverImageUrl ? (
            <CoverImage src={coverImageUrl} />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary-900 via-primary-950 to-black" />
          )}
          <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full border-[44px] border-primary-500/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/40" />
          <div className="relative mt-auto flex flex-col p-7 text-white">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary-200">{t('Book Summary')}</p>
            <h1 className="mt-3 text-3xl font-black leading-[1.05]">{bookTitle ?? title}</h1>
            {bookAuthor && <p className="mt-2 text-sm font-semibold text-white/70">{bookAuthor}</p>}
            <p className="mt-6 text-xs font-bold uppercase tracking-wide text-white/50">
              {estimatedMinutes} {t('min read')} · {difficulty.toLowerCase()} · {sections.length} {t('chapters')}
            </p>
          </div>
        </div>
      ),
    })

    if (deck) {
      const sentences = splitIntoSentences(deck)
      const aboutTitle = bookTitle ?? title
      const groups = paginateWeighted(sentences, s => linesFor(s) * lineHeight, makeBudgetFor(aboutTitle, Boolean(bookAuthor)))
      groups.forEach((group, gi) => specs.push({
        id: `about-${gi}`, numbered: true, toc: gi === 0 ? t('A summary of') : undefined,
        render: (
          <FlowPage
            eyebrow={`${t('A summary of')}${gi > 0 ? ` · ${t('continued')}` : ''}`}
            title={gi === 0 ? (bookTitle ?? title) : undefined}
            subtitle={gi === 0 && bookAuthor ? `${t('by')} ${bookAuthor}` : undefined}
          >
            <p className="text-[13px] leading-6 text-slate-600">{group.join(' ')}</p>
          </FlowPage>
        ),
      }))
    }

    sections.forEach((section, si) => {
      const n = si + 1
      specs.push({
        id: `divider-${si}`, numbered: false, toc: `${String(n).padStart(2, '0')} · ${section.heading}`,
        render: (
          <div className="flex h-full flex-col items-center justify-center gap-5 p-10 text-center">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-primary-500">{t('Chapter')}</p>
            <p className="text-7xl font-black text-slate-100">{String(n).padStart(2, '0')}</p>
            <div>
              <h2 className="text-2xl font-black leading-tight text-slate-900">{section.heading}</h2>
            </div>
          </div>
        ),
      })

      const flowBlocks: ReaderBlock[] = section.blocks?.length
        ? [...section.blocks]
        : section.body ? [{ type: 'p', text: section.body }] : []
      if (section.oneline) flowBlocks.push({ type: 'oneline', text: section.oneline })

      if (flowBlocks.length) {
        const groups = paginateWeighted(flowBlocks, blockHeight, makeBudgetFor(section.heading))
        fixOrphanHeadings(groups)
        groups.forEach((group, gi) => {
          specs.push({
            id: `chapter-${si}-${gi}`, numbered: true,
            render: (
              <FlowPage
                eyebrow={`${t('Chapter')} ${String(n).padStart(2, '0')}${gi > 0 ? ` · ${t('continued')}` : ''}`}
                title={gi === 0 ? section.heading : undefined}
              >
                {group.map((b, bi) => renderBlock(b, bi, t))}
              </FlowPage>
            ),
          })
        })
      }
    })

    if (takeaways.length) {
      const groups = paginateWeighted(takeaways, s => linesFor(s) * lineHeight + 20, makeBudgetFor(t('Key Takeaways')))
      groups.forEach((group, gi) => specs.push({
        id: `takeaways-${gi}`, numbered: true, toc: gi === 0 ? t('Key Takeaways') : undefined,
        render: (
          <FlowPage eyebrow={t('Keep these ideas')} title={gi === 0 ? t('Key Takeaways') : undefined}>
            <ul className="space-y-2.5">
              {group.map((item, ii) => (
                <li key={ii} className="flex gap-2.5 text-[13px] leading-5 text-slate-600">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </FlowPage>
        ),
      }))
    }

    if (glossary.length) {
      const groups = paginateWeighted(glossary, g => linesFor(g.term) * lineHeight * 0.9 + linesFor(g.body) * lineHeight + 32, makeBudgetFor(t('Terms worth remembering')))
      groups.forEach((group, gi) => specs.push({
        id: `glossary-${gi}`, numbered: true, toc: gi === 0 ? t('Glossary') : undefined,
        render: (
          <FlowPage eyebrow={t('Glossary')} title={gi === 0 ? t('Terms worth remembering') : undefined}>
            <div className="space-y-3">
              {group.map((item, ii) => (
                <div key={ii} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                  <p className="text-xs font-black text-slate-900">{item.term}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{item.body}</p>
                </div>
              ))}
            </div>
          </FlowPage>
        ),
      }))
    }

    if (reflectionQuestions.length) {
      const groups = paginateWeighted(reflectionQuestions, q => linesFor(q) * lineHeight + 24, makeBudgetFor(t('Questions to sit with')))
      let seen = 0
      groups.forEach((group, gi) => {
        const startIndex = seen
        seen += group.length
        specs.push({
          id: `reflection-${gi}`, numbered: true, toc: gi === 0 ? t('Questions to sit with') : undefined,
          render: (
            <FlowPage eyebrow={t('Reflect')} title={gi === 0 ? t('Questions to sit with') : undefined}>
              <ol className="space-y-3">
                {group.map((q, ii) => (
                  <li key={ii} className="text-[13px] leading-6 text-slate-600">
                    <span className="font-black text-slate-900">{startIndex + ii + 1}.</span> {q}
                  </li>
                ))}
              </ol>
            </FlowPage>
          ),
        })
      })
    }

    quiz.forEach((q, qi) => specs.push({
      id: `quiz-${q.id}`, numbered: true, toc: qi === 0 ? t('Quick check') : undefined,
      render: (
        <FlowPage eyebrow={`${t('Quick check')} · ${qi + 1}/${quiz.length}`} title={q.prompt}>
          <div className="grid gap-2">
            {q.options.map((option, oi) => (
              <button
                key={oi}
                type="button"
                onClick={() => onAnswer(q.id, oi)}
                className={cn(
                  'rounded-xl border px-3.5 py-2.5 text-left text-[13px] font-semibold transition',
                  answers[q.id] === oi ? 'border-primary-600 bg-primary-50 text-primary-900' : 'border-slate-200 bg-white hover:border-primary-300',
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </FlowPage>
      ),
    }))

    specs.push({
      id: 'complete', numbered: false, toc: t('Finish'),
      render: (
        <div className="flex h-full flex-col items-center justify-center gap-5 p-8 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
            <Check className="h-6 w-6" />
          </span>
          <div>
            <h3 className="text-xl font-black text-slate-900">{completed ? t('Lesson completed') : t('You reached the end')}</h3>
            <p className="mx-auto mt-2 max-w-[28ch] text-[13px] leading-6 text-slate-500">{title}</p>
          </div>
          <div className="w-full max-w-[240px]">
            <Button
              fullWidth
              disabled={!allAnswered || completed}
              loading={completing}
              onClick={onComplete}
              icon={<Check className="h-4 w-4" />}
            >
              {completed ? t('Lesson completed') : t('Complete lesson')}
            </Button>
          </div>
          {bookHref && (
            <Link to={bookHref} className="text-xs font-bold text-primary-700">{t('View in Bookstore')} →</Link>
          )}
        </div>
      ),
    })

    let counter = 0
    const flipPages: FlipBookPage[] = specs.map(spec => {
      if (spec.numbered) counter++
      return { key: spec.id, pageNumber: spec.numbered ? counter : undefined, content: spec.render, paper: spec.paper }
    })
    const tocEntries = specs
      .map((spec, index) => ({ index, label: spec.toc }))
      .filter((entry): entry is { index: number; label: string } => Boolean(entry.label))

    return { pages: flipPages, toc: tocEntries }
  }, [language, title, deck, estimatedMinutes, difficulty, bookTitle, bookAuthor, coverImageUrl, bookHref, sections, takeaways, glossary, reflectionQuestions, quiz, answers, completed, completing, allAnswered, charsPerLine, lineHeight, continuationBudget, firstPageBudgetFor])

  useEffect(() => {
    if (pageIndex > pages.length - 1) setPageIndex(0)
  }, [pages.length, pageIndex])

  const totalPages = pages.reduce((max, p) => p.pageNumber ? Math.max(max, p.pageNumber) : max, 0)
  const clampedIndex = Math.min(pageIndex, pages.length - 1)

  return (
    <div className="flex flex-col items-center px-4 py-6">
      <div className="mb-4 flex w-full max-w-[460px] justify-end">
        <button
          type="button"
          onClick={() => setTocOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-black text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:text-primary-700"
        >
          <List className="h-3.5 w-3.5" /> {t('Contents')}
        </button>
      </div>

      <FlipBook pages={pages} totalPages={totalPages} index={clampedIndex} onNavigate={setPageIndex} />

      {tocOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setTocOpen(false)}>
          <div
            className="max-h-[75vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">{t('Contents')}</h3>
              <button type="button" onClick={() => setTocOpen(false)} className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 divide-y divide-slate-100">
              {toc.map(entry => (
                <button
                  key={entry.index}
                  type="button"
                  onClick={() => { setPageIndex(entry.index); setTocOpen(false) }}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 py-3 text-left text-sm font-semibold transition',
                    entry.index === clampedIndex ? 'text-primary-700' : 'text-slate-700 hover:text-primary-700',
                  )}
                >
                  <span className="flex items-center gap-2 truncate"><BookOpen className="h-3.5 w-3.5 shrink-0 text-slate-300" />{entry.label}</span>
                  {pages[entry.index]?.pageNumber != null && (
                    <span className="shrink-0 text-xs font-bold text-slate-400">{pages[entry.index].pageNumber}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
