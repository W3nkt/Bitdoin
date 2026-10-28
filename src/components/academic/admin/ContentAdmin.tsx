import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import {
  useAdminSubjects, useContentGaps, useContentItems, useExternalContent, useQuizBank, useSaveContent,
  type ContentGap, type ContentInput, type ContentItem, type ContentKind,
} from '@/lib/academic/adminApi'
import { cn } from '@/lib/utils'
import { Empty, Field, Panel, Pill, adminErrorText } from './AdminKit'

const KINDS: Array<{ value: ContentKind; label: string; hint: string }> = [
  { value: 'practice_set', label: 'Practice set', hint: 'Free: 5 approved items of a quiz topic, with answers and explanations.' },
  { value: 'academy_lesson', label: 'Academy lesson', hint: 'Recommended only to students with an Academy subscription (REC-ACCESS).' },
  { value: 'academy_challenge', label: 'Weekly challenge', hint: 'Recommended only in its week, to students with an Academy subscription.' },
  { value: 'book', label: 'Bookstore book', hint: 'LEARN-006: shown as "Books that may help" on its subjects (at most 2, in stock only); never a next action or in guardian reports.' },
]
const STATUS = { draft: { label: 'Draft', tone: 'gray' }, published: { label: 'Published', tone: 'green' }, retired: { label: 'Retired', tone: 'gray' } } as const
const DIFFICULTY = { 1: 'Foundation', 2: 'Core', 3: 'Stretch' } as const
const lines = (text: string) => text.split('\n').map(line => line.trim()).filter(Boolean)

const GAP_NEED: Record<ContentGap['rule_id'], string> = {
  R3: 'Foundation practice (difficulty 1)',
  R4: 'Core practice set (difficulty 2)',
  R7: 'Stretch challenge or lesson (difficulty 3)',
}

/** LEARN-003: what students needed in the last 30 days with nothing to recommend. */
function ContentGaps() {
  const gaps = useContentGaps()
  return (
    <Panel title="Content gaps" description="Topics and subjects where a rule fired in the last 30 days but no published, available content matched. Counts are students, never names. Stretch gaps include content that exists for Academy members only.">
      {gaps.isPending ? <Skeleton className="h-24 w-full rounded-2xl" /> : gaps.isError ? <Empty>{adminErrorText(gaps.error)}</Empty>
        : gaps.data.length === 0 ? <Empty>No gaps in the last 30 days.</Empty> : (
          <div tabIndex={0} className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <tr><th className="py-2 pr-4">Subject · grade</th><th className="py-2 pr-4">Topic</th><th className="py-2 pr-4">Needed</th><th className="py-2 pr-4">Students</th><th className="py-2">Last seen</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {gaps.data.map(gap => (
                  <tr key={`${gap.rule_id}-${gap.subject_code}-${gap.grade_code}-${gap.topic_id}`}>
                    <td className="py-2 pr-4 font-bold">{gap.subject_code ?? '—'} · {gap.grade_code ?? '—'}</td>
                    <td className="py-2 pr-4">{gap.topic_name ?? 'Any topic'}</td>
                    <td className="py-2 pr-4">{GAP_NEED[gap.rule_id]}</td>
                    <td className="py-2 pr-4 tabular-nums">{gap.students}</td>
                    <td className="py-2">{gap.last_seen}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </Panel>
  )
}

/**
 * Content catalogue (LEARN-004, migration 135): what recommendations may
 * suggest, tagged with subject, grade band, topics, difficulty, language and
 * minutes. Each entry points at an existing Academy lesson, weekly challenge
 * or quiz topic; only published entries whose record is available are shown
 * to students (LEARN-003).
 */
export function ContentAdmin() {
  return (
    <div className="grid gap-6">
      <ContentCatalogue />
      <ContentGaps />
    </div>
  )
}

function ContentCatalogue() {
  const toast = useToast()
  const items = useContentItems()
  const subjects = useAdminSubjects()
  const bank = useQuizBank()
  const save = useSaveContent()
  const [form, setForm] = useState<(ContentInput & { objectivesLo: string; objectivesEn: string }) | null>(null)
  const [search, setSearch] = useState('')
  const candidates = useExternalContent(form?.kind ?? 'practice_set', search)
  const topics = bank.data?.topics ?? []

  if (items.isPending) return <Skeleton className="h-48 w-full rounded-2xl" />
  if (items.isError) return <Empty>{adminErrorText(items.error)}</Empty>
  const edit = (item?: ContentItem) => {
    setSearch('')
    setForm(item
      ? { ...item, objectivesLo: item.objectives_lo.join('\n'), objectivesEn: item.objectives_en.join('\n') }
      : { kind: 'practice_set', external_id: '', subject_ids: [], grade_min: 10, grade_max: 12, topic_ids: [], difficulty: 2, language: 'lo', est_minutes: 10,
          objectives_lo: [], objectives_en: [], quality_score: null, status: 'draft', objectivesLo: '', objectivesEn: '' })
  }
  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter(x => x !== id) : [...list, id])

  return (
    <Panel title="Content for recommendations"
      description="Tag existing content so the weekly next actions can match it to a student's subjects, topics and level. Academy content has no school topics of its own, so tag it here. Untagged topics show students “We don't have practice for this topic yet” and appear as content gaps."
      actions={<Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => edit()}>Add content</Button>}>
      {items.data.length === 0 ? <Empty>Nothing catalogued yet. Start with practice sets for topics that have approved quiz items.</Empty> : (
        <div tabIndex={0} className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <tr><th className="py-2 pr-4">Content</th><th className="py-2 pr-4">Subjects · grades</th><th className="py-2 pr-4">Topics</th><th className="py-2 pr-4">Level</th><th className="py-2 pr-4">Status</th><th className="py-2" /></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.data.map(item => (
                <tr key={item.id}>
                  <td className="py-2 pr-4">
                    <span className="block font-bold">{item.external?.title_en ?? 'Missing record'}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{KINDS.find(k => k.value === item.kind)?.label} · {item.language.toUpperCase()} · {item.est_minutes} min</span>
                  </td>
                  <td className="py-2 pr-4">{item.subject_codes.join(', ')} · {item.grade_min}–{item.grade_max}</td>
                  <td className="py-2 pr-4">{item.topic_names.join(', ')}</td>
                  <td className="py-2 pr-4">{DIFFICULTY[item.difficulty]}{item.quality_score && ` · ★${item.quality_score}`}</td>
                  <td className="py-2 pr-4">
                    <span className="flex flex-wrap gap-1">
                      <Pill tone={STATUS[item.status].tone}>{STATUS[item.status].label}</Pill>
                      {item.status === 'published' && !item.external?.available && <Pill tone="amber">Not available now</Pill>}
                    </span>
                  </td>
                  <td className="py-2 text-right"><Button size="sm" variant="ghost" onClick={() => edit(item)}>Edit</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <form className="mt-5 grid gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-gray-800/60 sm:grid-cols-2" onSubmit={event => {
          event.preventDefault()
          const { objectivesLo, objectivesEn, ...input } = form
          save.mutate({ ...input, objectives_lo: lines(objectivesLo), objectives_en: lines(objectivesEn) }, {
            onSuccess: () => { setForm(null); toast.success('Content saved.') },
            onError: error => toast.error(adminErrorText(error)),
          })
        }}>
          <Field label="Type" hint={KINDS.find(k => k.value === form.kind)?.hint}>
            <select value={form.kind} disabled={!!form.id} onChange={event => { setSearch(''); setForm({ ...form, kind: event.target.value as ContentKind, external_id: '' }) }}>
              {KINDS.map(kind => <option key={kind.value} value={kind.value}>{kind.label}</option>)}
            </select>
          </Field>
          <Field label="Find the record" hint="Search by title. Only existing Academy lessons, challenges or quiz topics can be catalogued.">
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Title…" />
          </Field>
          <fieldset className="sm:col-span-2">
            <legend className="mb-1.5 text-xs font-black text-slate-600 dark:text-slate-300">Record</legend>
            <ul className="grid max-h-56 gap-1 overflow-y-auto rounded-xl bg-white p-2 ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-700">
              {(candidates.data ?? []).map(candidate => (
                <li key={candidate.id}>
                  <label className={cn('flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-gray-800', candidate.tagged && candidate.id !== form.external_id && 'opacity-60')}>
                    <input type="radio" name="external" className="mt-1" checked={form.external_id === candidate.id} disabled={candidate.tagged && candidate.id !== form.external_id}
                      onChange={() => setForm({ ...form, external_id: candidate.id, topic_ids: form.kind === 'practice_set' ? [candidate.id] : form.topic_ids })} />
                    <span className="flex-1">
                      <span className="font-bold">{candidate.title_en}</span> · {candidate.title_lo}
                      <span className="block text-xs text-slate-500 dark:text-slate-400">{candidate.detail}{!candidate.available && ' · not available now'}{candidate.tagged && ' · already catalogued'}</span>
                    </span>
                  </label>
                </li>
              ))}
              {candidates.data?.length === 0 && <li className="px-2 py-1.5 text-sm text-slate-500">No matches.</li>}
            </ul>
          </fieldset>
          <fieldset className="sm:col-span-2">
            <legend className="mb-1.5 text-xs font-black text-slate-600 dark:text-slate-300">Subjects</legend>
            <div className="flex flex-wrap gap-3">
              {(subjects.data ?? []).map(subject => (
                <label key={subject.id} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={form.subject_ids.includes(subject.id)} onChange={() => setForm({ ...form, subject_ids: toggle(form.subject_ids, subject.id) })} />
                  {subject.code} · {subject.name_en}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="sm:col-span-2">
            <legend className="mb-1.5 text-xs font-black text-slate-600 dark:text-slate-300">Topics (at least one, of the chosen subjects)</legend>
            <div className="flex flex-wrap gap-3">
              {topics.filter(topic => form.subject_ids.includes(topic.subject_id)).map(topic => (
                <label key={topic.id} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={form.topic_ids.includes(topic.id)} onChange={() => setForm({ ...form, topic_ids: toggle(form.topic_ids, topic.id) })} />
                  {topic.subject_code} {topic.grade_code} · {topic.name_en}
                </label>
              ))}
              {form.subject_ids.length === 0 && <span className="text-sm text-slate-500">Choose a subject first.</span>}
            </div>
          </fieldset>
          <Field label="Grades from"><input type="number" min={1} max={12} value={form.grade_min} onChange={event => setForm({ ...form, grade_min: Number(event.target.value) })} /></Field>
          <Field label="Grades to"><input type="number" min={1} max={12} value={form.grade_max} onChange={event => setForm({ ...form, grade_max: Number(event.target.value) })} /></Field>
          <Field label="Difficulty" hint="Foundation content is suggested before stretch content.">
            <select value={form.difficulty} onChange={event => setForm({ ...form, difficulty: Number(event.target.value) as 1 | 2 | 3 })}>
              {([1, 2, 3] as const).map(level => <option key={level} value={level}>{level} · {DIFFICULTY[level]}</option>)}
            </select>
          </Field>
          <Field label="Language">
            <select value={form.language} onChange={event => setForm({ ...form, language: event.target.value as 'lo' | 'en' | 'th' })}>
              <option value="lo">Lao</option><option value="en">English</option><option value="th">Thai</option>
            </select>
          </Field>
          <Field label="Minutes"><input type="number" min={1} max={240} value={form.est_minutes} onChange={event => setForm({ ...form, est_minutes: Number(event.target.value) })} /></Field>
          <Field label="Quality (1–5, optional)" hint="Reviewer rating; breaks ties between equally good matches.">
            <select value={form.quality_score ?? ''} onChange={event => setForm({ ...form, quality_score: event.target.value ? Number(event.target.value) : null })}>
              <option value="">Not rated</option>{[1, 2, 3, 4, 5].map(score => <option key={score} value={score}>{score}</option>)}
            </select>
          </Field>
          <Field label="Learning objectives (Lao, one per line)"><textarea rows={3} value={form.objectivesLo} onChange={event => setForm({ ...form, objectivesLo: event.target.value })} /></Field>
          <Field label="Learning objectives (English, one per line)"><textarea rows={3} value={form.objectivesEn} onChange={event => setForm({ ...form, objectivesEn: event.target.value })} /></Field>
          <Field label="Status" hint="Only published content can be recommended.">
            <select value={form.status} onChange={event => setForm({ ...form, status: event.target.value as ContentInput['status'] })}>
              <option value="draft">Draft</option><option value="published">Published</option><option value="retired">Retired</option>
            </select>
          </Field>
          <div className="flex items-end justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
            <Button type="submit" loading={save.isPending} disabled={!form.external_id}>Save</Button>
          </div>
        </form>
      )}
    </Panel>
  )
}
