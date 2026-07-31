import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen, CalendarRange, ExternalLink, FileEdit, Plus, Save, Search, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

type AdminTab = 'lessons' | 'challenges'
type Category = { id: string; slug: string; name_en: string }
type Lesson = {
  id: string; category_id: string; slug: string; title_en: string; title_lo: string
  summary_en: string; summary_lo: string; content_en: Array<{ heading: string; body: string }>
  content_lo: Array<{ heading: string; body: string }>; key_takeaways_en: string[]; key_takeaways_lo: string[]
  difficulty: string; estimated_minutes: number; lesson_type: string; source_url?: string | null
  source_verified_at?: string | null; application_deadline?: string | null; status: string; is_preview: boolean
  category?: Category
}
type Challenge = {
  id: string; slug: string; title_en: string; title_lo: string; description_en: string; description_lo: string
  category_slug: string; steps_en: string[]; steps_lo: string[]; starts_on: string; ends_on: string; points: number; is_active: boolean
}
type LessonSection = { heading_en: string; body_en: string; heading_lo: string; body_lo: string }
type LessonDraft = {
  id?: string; category_id: string; slug: string; title_en: string; title_lo: string
  summary_en: string; summary_lo: string; sections: LessonSection[]
  takeaways_en: string; takeaways_lo: string; difficulty: string; estimated_minutes: string
  lesson_type: string; source_url: string; application_deadline: string; status: string; is_preview: boolean
}
type ChallengeDraft = {
  id?: string; slug: string; title_en: string; title_lo: string; description_en: string; description_lo: string
  category_slug: string; steps_en: string; steps_lo: string; starts_on: string; ends_on: string; points: string; is_active: boolean
}

const blankSection: LessonSection = { heading_en: '', body_en: '', heading_lo: '', body_lo: '' }
const blankLesson: LessonDraft = {
  category_id: '', slug: '', title_en: '', title_lo: '', summary_en: '', summary_lo: '',
  sections: [{ ...blankSection }], takeaways_en: '', takeaways_lo: '',
  difficulty: 'BEGINNER', estimated_minutes: '8', lesson_type: 'LESSON', source_url: '',
  application_deadline: '', status: 'DRAFT', is_preview: false,
}
const dateString = (offset: number) => {
  const date = new Date(); date.setDate(date.getDate() + offset)
  return date.toISOString().slice(0, 10)
}
const blankChallenge: ChallengeDraft = {
  slug: '', title_en: '', title_lo: '', description_en: '', description_lo: '', category_slug: 'productivity',
  steps_en: '', steps_lo: '', starts_on: dateString(0), ends_on: dateString(6), points: '100', is_active: true,
}
const toSlug = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const lines = (value: string) => value.split('\n').map(item => item.trim()).filter(Boolean)

export function PremiumLearningAdmin() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const [tab, setTab] = useState<AdminTab>('lessons')
  const [search, setSearch] = useState('')
  const [lessonDraft, setLessonDraft] = useState<LessonDraft | null>(null)
  const [challengeDraft, setChallengeDraft] = useState<ChallengeDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const categories = useQuery({
    queryKey: ['premium-admin', 'learning-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('premium_learning_categories').select('id,slug,name_en').order('sort_order')
      if (error) throw error
      return data as Category[]
    },
  })
  const lessons = useQuery({
    queryKey: ['premium-admin', 'learning-lessons'],
    queryFn: async () => {
      const { data, error } = await supabase.from('premium_lessons').select('*,category:premium_learning_categories(id,slug,name_en)').order('updated_at', { ascending: false })
      if (error) throw error
      return data as Lesson[]
    },
  })
  const challenges = useQuery({
    queryKey: ['premium-admin', 'weekly-challenges'],
    queryFn: async () => {
      const { data, error } = await supabase.from('premium_weekly_challenges')
        .select('id,slug,title_en,title_lo,description_en,description_lo,category_slug,steps_en,steps_lo,starts_on,ends_on,points,is_active')
        .order('starts_on', { ascending: false })
      if (error) throw error
      return data as Challenge[]
    },
  })

  function editLesson(lesson: Lesson) {
    const sectionCount = Math.max(lesson.content_en.length, lesson.content_lo.length, 1)
    const sections: LessonSection[] = Array.from({ length: sectionCount }, (_, i) => ({
      heading_en: lesson.content_en[i]?.heading ?? '', body_en: lesson.content_en[i]?.body ?? '',
      heading_lo: lesson.content_lo[i]?.heading ?? '', body_lo: lesson.content_lo[i]?.body ?? '',
    }))
    setLessonDraft({
      id: lesson.id, category_id: lesson.category_id, slug: lesson.slug, title_en: lesson.title_en, title_lo: lesson.title_lo,
      summary_en: lesson.summary_en, summary_lo: lesson.summary_lo, sections,
      takeaways_en: lesson.key_takeaways_en.join('\n'), takeaways_lo: lesson.key_takeaways_lo.join('\n'),
      difficulty: lesson.difficulty, estimated_minutes: String(lesson.estimated_minutes), lesson_type: lesson.lesson_type,
      source_url: lesson.source_url ?? '', application_deadline: lesson.application_deadline ?? '',
      status: lesson.status, is_preview: lesson.is_preview,
    })
  }
  function updateSection(index: number, patch: Partial<LessonSection>) {
    setLessonDraft(draft => draft && {
      ...draft, sections: draft.sections.map((section, i) => i === index ? { ...section, ...patch } : section),
    })
  }
  function addSection() {
    setLessonDraft(draft => draft && { ...draft, sections: [...draft.sections, { ...blankSection }] })
  }
  function removeSection(index: number) {
    setLessonDraft(draft => draft && { ...draft, sections: draft.sections.filter((_, i) => i !== index) })
  }
  async function saveLesson() {
    if (!lessonDraft?.category_id || !lessonDraft.title_en.trim() || !lessonDraft.title_lo.trim()) return
    setSaving(true)
    const nonEmptySections = lessonDraft.sections.filter(s => s.heading_en.trim() || s.body_en.trim() || s.heading_lo.trim() || s.body_lo.trim())
    const payload = {
      category_id: lessonDraft.category_id, slug: lessonDraft.slug || toSlug(lessonDraft.title_en),
      title_en: lessonDraft.title_en.trim(), title_lo: lessonDraft.title_lo.trim(),
      summary_en: lessonDraft.summary_en.trim(), summary_lo: lessonDraft.summary_lo.trim(),
      content_en: nonEmptySections.map(s => ({ heading: s.heading_en.trim(), body: s.body_en.trim() })),
      content_lo: nonEmptySections.map(s => ({ heading: s.heading_lo.trim(), body: s.body_lo.trim() })),
      key_takeaways_en: lines(lessonDraft.takeaways_en), key_takeaways_lo: lines(lessonDraft.takeaways_lo),
      difficulty: lessonDraft.difficulty, estimated_minutes: Number(lessonDraft.estimated_minutes) || 5,
      lesson_type: lessonDraft.lesson_type, source_url: lessonDraft.source_url.trim() || null,
      source_verified_at: lessonDraft.source_url.trim() ? new Date().toISOString() : null,
      application_deadline: lessonDraft.application_deadline || null, status: lessonDraft.status,
      is_preview: lessonDraft.is_preview, published_at: lessonDraft.status === 'PUBLISHED' ? new Date().toISOString() : null,
    }
    const { error } = lessonDraft.id
      ? await supabase.from('premium_lessons').update(payload).eq('id', lessonDraft.id)
      : await supabase.from('premium_lessons').insert(payload)
    setSaving(false)
    if (error) return toast.error(error.message)
    setLessonDraft(null)
    qc.invalidateQueries({ queryKey: ['premium-admin', 'learning-lessons'] })
    toast.success('Lesson saved.')
  }
  async function deleteLesson(id: string) {
    if (!window.confirm('Delete this lesson and its learner progress?')) return
    const { error } = await supabase.from('premium_lessons').delete().eq('id', id)
    if (error) return toast.error(error.message)
    qc.invalidateQueries({ queryKey: ['premium-admin', 'learning-lessons'] })
  }
  function editChallenge(item: Challenge) {
    setChallengeDraft({ ...item, steps_en: item.steps_en.join('\n'), steps_lo: item.steps_lo.join('\n'), points: String(item.points) })
  }
  async function saveChallenge() {
    if (!challengeDraft?.title_en.trim() || !challengeDraft.title_lo.trim()) return
    setSaving(true)
    const payload = {
      slug: challengeDraft.slug || toSlug(challengeDraft.title_en), title_en: challengeDraft.title_en.trim(),
      title_lo: challengeDraft.title_lo.trim(), description_en: challengeDraft.description_en.trim(),
      description_lo: challengeDraft.description_lo.trim(), category_slug: challengeDraft.category_slug,
      steps_en: lines(challengeDraft.steps_en), steps_lo: lines(challengeDraft.steps_lo),
      starts_on: challengeDraft.starts_on, ends_on: challengeDraft.ends_on,
      points: Number(challengeDraft.points) || 100, is_active: challengeDraft.is_active,
    }
    const { error } = challengeDraft.id
      ? await supabase.from('premium_weekly_challenges').update(payload).eq('id', challengeDraft.id)
      : await supabase.from('premium_weekly_challenges').insert(payload)
    setSaving(false)
    if (error) return toast.error(error.message)
    setChallengeDraft(null)
    qc.invalidateQueries({ queryKey: ['premium-admin', 'weekly-challenges'] })
    toast.success('Challenge saved.')
  }

  const filteredLessons = (lessons.data ?? []).filter(item => `${item.title_en} ${item.title_lo} ${item.category?.name_en}`.toLowerCase().includes(search.toLowerCase()))
  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-800 bg-slate-950 text-white">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center gap-4 px-4">
          <button onClick={() => navigate('/academy-admin')} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10"><ArrowLeft className="h-5 w-5" /></button>
          <div className="flex-1"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-300">Academy Admin</p><h1 className="text-xl font-black">Learning content</h1></div>
          <a href="/academy/learn" target="_blank" className="hidden items-center gap-2 text-xs font-bold text-slate-300 sm:flex">Member view <ExternalLink className="h-4 w-4" /></a>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex gap-2">
              <Tab active={tab === 'lessons'} onClick={() => setTab('lessons')} icon={BookOpen}>Lessons & opportunities</Tab>
              <Tab active={tab === 'challenges'} onClick={() => setTab('challenges')} icon={CalendarRange}>Weekly challenges</Tab>
            </div>
            <p className="mt-4 text-sm text-slate-500">{tab === 'lessons' ? 'Publish bilingual lessons, summaries, scholarships, career guides, and business ideas.' : 'Schedule one clear member challenge at a time.'}</p>
          </div>
          <Button onClick={() => tab === 'lessons'
            ? setLessonDraft({ ...blankLesson, category_id: categories.data?.[0]?.id ?? '' })
            : setChallengeDraft(blankChallenge)
          } icon={<Plus className="h-4 w-4" />}>Create {tab === 'lessons' ? 'lesson' : 'challenge'}</Button>
        </div>

        {tab === 'lessons' ? (
          <>
            <label className="mt-6 flex max-w-md items-center gap-2 rounded-xl border border-slate-200 bg-white px-4">
              <Search className="h-4 w-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search content…" className="w-full py-3 text-sm outline-none" />
            </label>
            <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              {filteredLessons.map(item => (
                <div key={item.id} className="grid gap-3 border-b border-slate-100 p-5 last:border-0 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate font-black">{item.title_en}</h2>
                      <Badge tone={item.status === 'PUBLISHED' ? 'green' : 'gray'}>{item.status}</Badge>
                      <Badge>{item.lesson_type.replace('_', ' ')}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{item.category?.name_en} · {item.estimated_minutes} min · {item.title_lo}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => editLesson(item)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:border-primary-300 hover:text-primary-700"><FileEdit className="h-4 w-4" /></button>
                    <button onClick={() => deleteLesson(item.id)} className="rounded-lg border border-slate-200 p-2 text-slate-400 hover:border-red-200 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {(challenges.data ?? []).map(item => (
              <button key={item.id} onClick={() => editChallenge(item)} className="rounded-2xl bg-white p-5 text-left shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-center justify-between"><Badge tone={item.is_active ? 'green' : 'gray'}>{item.is_active ? 'ACTIVE' : 'INACTIVE'}</Badge><FileEdit className="h-4 w-4 text-slate-400" /></div>
                <h2 className="mt-4 text-xl font-black">{item.title_en}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">{item.description_en}</p>
                <p className="mt-4 text-xs font-black uppercase tracking-wide text-slate-400">{item.starts_on} → {item.ends_on} · {item.points} XP</p>
              </button>
            ))}
          </div>
        )}
      </main>

      <Modal open={Boolean(lessonDraft)} onClose={() => setLessonDraft(null)} title={lessonDraft?.id ? 'Edit learning content' : 'Create learning content'} size="xl">
        {lessonDraft && (
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category"><select value={lessonDraft.category_id} onChange={e => setLessonDraft({ ...lessonDraft, category_id: e.target.value })}>{categories.data?.map(item => <option key={item.id} value={item.id}>{item.name_en}</option>)}</select></Field>
              <Field label="Content type"><select value={lessonDraft.lesson_type} onChange={e => setLessonDraft({ ...lessonDraft, lesson_type: e.target.value })}>{['LESSON','READING_SUMMARY','SCHOLARSHIP','CAREER','BUSINESS_IDEA'].map(type => <option key={type}>{type}</option>)}</select></Field>
              <Field label="English title"><input value={lessonDraft.title_en} onChange={e => setLessonDraft({ ...lessonDraft, title_en: e.target.value, slug: lessonDraft.id ? lessonDraft.slug : toSlug(e.target.value) })} /></Field>
              <Field label="Lao title"><input value={lessonDraft.title_lo} onChange={e => setLessonDraft({ ...lessonDraft, title_lo: e.target.value })} /></Field>
              <Field label="English summary"><textarea rows={3} value={lessonDraft.summary_en} onChange={e => setLessonDraft({ ...lessonDraft, summary_en: e.target.value })} /></Field>
              <Field label="Lao summary"><textarea rows={3} value={lessonDraft.summary_lo} onChange={e => setLessonDraft({ ...lessonDraft, summary_lo: e.target.value })} /></Field>
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-wide text-slate-600">Sections ({lessonDraft.sections.length})</p>
                <button type="button" onClick={addSection} className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-primary-700 hover:border-primary-300"><Plus className="h-3.5 w-3.5" /> Add section</button>
              </div>
              {lessonDraft.sections.map((section, index) => (
                <div key={index} className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-2">
                  <div className="flex items-center justify-between sm:col-span-2">
                    <p className="text-xs font-black text-slate-400">Section {index + 1}</p>
                    {lessonDraft.sections.length > 1 && (
                      <button type="button" onClick={() => removeSection(index)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><X className="h-3.5 w-3.5" /></button>
                    )}
                  </div>
                  <Field label="English heading"><input value={section.heading_en} onChange={e => updateSection(index, { heading_en: e.target.value })} /></Field>
                  <Field label="Lao heading"><input value={section.heading_lo} onChange={e => updateSection(index, { heading_lo: e.target.value })} /></Field>
                  <Field label="English body"><textarea rows={4} value={section.body_en} onChange={e => updateSection(index, { body_en: e.target.value })} /></Field>
                  <Field label="Lao body"><textarea rows={4} value={section.body_lo} onChange={e => updateSection(index, { body_lo: e.target.value })} /></Field>
                </div>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="English takeaways (one per line)"><textarea rows={3} value={lessonDraft.takeaways_en} onChange={e => setLessonDraft({ ...lessonDraft, takeaways_en: e.target.value })} /></Field>
              <Field label="Lao takeaways (one per line)"><textarea rows={3} value={lessonDraft.takeaways_lo} onChange={e => setLessonDraft({ ...lessonDraft, takeaways_lo: e.target.value })} /></Field>
              <Field label="Official source URL"><input type="url" value={lessonDraft.source_url} onChange={e => setLessonDraft({ ...lessonDraft, source_url: e.target.value })} /></Field>
              <Field label="Application deadline"><input type="date" value={lessonDraft.application_deadline} onChange={e => setLessonDraft({ ...lessonDraft, application_deadline: e.target.value })} /></Field>
              <Field label="Reading minutes"><input type="number" min="1" value={lessonDraft.estimated_minutes} onChange={e => setLessonDraft({ ...lessonDraft, estimated_minutes: e.target.value })} /></Field>
              <Field label="Status"><select value={lessonDraft.status} onChange={e => setLessonDraft({ ...lessonDraft, status: e.target.value })}><option>DRAFT</option><option>PUBLISHED</option><option>ARCHIVED</option></select></Field>
            </div>
            <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={lessonDraft.is_preview} onChange={e => setLessonDraft({ ...lessonDraft, is_preview: e.target.checked })} /> Free preview</label>
            <Button fullWidth loading={saving} onClick={saveLesson} icon={<Save className="h-4 w-4" />}>Save content</Button>
          </div>
        )}
      </Modal>

      <Modal open={Boolean(challengeDraft)} onClose={() => setChallengeDraft(null)} title={challengeDraft?.id ? 'Edit weekly challenge' : 'Create weekly challenge'} size="lg">
        {challengeDraft && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="English title"><input value={challengeDraft.title_en} onChange={e => setChallengeDraft({ ...challengeDraft, title_en: e.target.value, slug: challengeDraft.id ? challengeDraft.slug : toSlug(e.target.value) })} /></Field>
            <Field label="Lao title"><input value={challengeDraft.title_lo} onChange={e => setChallengeDraft({ ...challengeDraft, title_lo: e.target.value })} /></Field>
            <Field label="English description"><textarea rows={3} value={challengeDraft.description_en} onChange={e => setChallengeDraft({ ...challengeDraft, description_en: e.target.value })} /></Field>
            <Field label="Lao description"><textarea rows={3} value={challengeDraft.description_lo} onChange={e => setChallengeDraft({ ...challengeDraft, description_lo: e.target.value })} /></Field>
            <Field label="English steps (one per line)"><textarea rows={5} value={challengeDraft.steps_en} onChange={e => setChallengeDraft({ ...challengeDraft, steps_en: e.target.value })} /></Field>
            <Field label="Lao steps (one per line)"><textarea rows={5} value={challengeDraft.steps_lo} onChange={e => setChallengeDraft({ ...challengeDraft, steps_lo: e.target.value })} /></Field>
            <Field label="Starts"><input type="date" value={challengeDraft.starts_on} onChange={e => setChallengeDraft({ ...challengeDraft, starts_on: e.target.value })} /></Field>
            <Field label="Ends"><input type="date" value={challengeDraft.ends_on} onChange={e => setChallengeDraft({ ...challengeDraft, ends_on: e.target.value })} /></Field>
            <Field label="XP points"><input type="number" value={challengeDraft.points} onChange={e => setChallengeDraft({ ...challengeDraft, points: e.target.value })} /></Field>
            <label className="flex items-center gap-2 self-end pb-3 text-sm font-bold"><input type="checkbox" checked={challengeDraft.is_active} onChange={e => setChallengeDraft({ ...challengeDraft, is_active: e.target.checked })} /> Active</label>
            <div className="sm:col-span-2"><Button fullWidth loading={saving} onClick={saveChallenge} icon={<Save className="h-4 w-4" />}>Save challenge</Button></div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function Tab({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: typeof BookOpen; children: React.ReactNode }) {
  return <button onClick={onClick} className={cn('flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black', active ? 'bg-slate-950 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200')}><Icon className="h-4 w-4" />{children}</button>
}
function Badge({ children, tone = 'blue' }: { children: React.ReactNode; tone?: 'blue' | 'green' | 'gray' }) {
  return <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide', tone === 'green' ? 'bg-emerald-100 text-emerald-700' : tone === 'gray' ? 'bg-slate-100 text-slate-600' : 'bg-primary-50 text-primary-700')}>{children}</span>
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-xs font-black text-slate-600 [&_input]:rounded-lg [&_input]:border [&_input]:border-slate-200 [&_input]:px-3 [&_input]:py-2.5 [&_input]:text-sm [&_input]:font-medium [&_input]:outline-none [&_select]:rounded-lg [&_select]:border [&_select]:border-slate-200 [&_select]:px-3 [&_select]:py-2.5 [&_select]:text-sm [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-slate-200 [&_textarea]:px-3 [&_textarea]:py-2.5 [&_textarea]:text-sm [&_textarea]:font-medium [&_textarea]:outline-none">{label}{children}</label>
}
