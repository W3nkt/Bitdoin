import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, Eye, EyeOff, Star, StarOff, X, BookOpen,
  Quote, Lightbulb, Sparkles, User
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { KnowledgeCategory, KnowledgePost, KnowledgePostType } from '@/types'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

const POST_TYPES: { value: KnowledgePostType; label: string; icon: React.ElementType }[] = [
  { value: 'article',   label: 'Article',   icon: BookOpen },
  { value: 'quote',     label: 'Quote',     icon: Quote },
  { value: 'tip',       label: 'Tip',       icon: Lightbulb },
  { value: 'blog',      label: 'Blog',      icon: Sparkles },
  { value: 'biography', label: 'Biography', icon: User },
]

const TYPE_COLOR: Record<KnowledgePostType, string> = {
  article:   'bg-blue-100 text-blue-700',
  quote:     'bg-amber-100 text-amber-700',
  tip:       'bg-green-100 text-green-700',
  blog:      'bg-purple-100 text-purple-700',
  biography: 'bg-indigo-100 text-indigo-700',
}

interface PostForm {
  type: KnowledgePostType
  category_id: string
  title_en: string
  title_lo: string
  content_en: string
  content_lo: string
  excerpt_en: string
  excerpt_lo: string
  author: string
  tags: string
  is_published: boolean
  is_featured: boolean
}

const EMPTY_FORM: PostForm = {
  type: 'article',
  category_id: '',
  title_en: '',
  title_lo: '',
  content_en: '',
  content_lo: '',
  excerpt_en: '',
  excerpt_lo: '',
  author: 'Bitdoin Team',
  tags: '',
  is_published: false,
  is_featured: false,
}

export function AdminKnowledge() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { success, error: toastError } = useToast()

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<KnowledgePost | null>(null)
  const [form, setForm] = useState<PostForm>(EMPTY_FORM)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterPub, setFilterPub] = useState<string>('all')

  const { data: categories = [] } = useQuery({
    queryKey: ['knowledge-categories'],
    queryFn: async () => {
      const { data } = await supabase.from('knowledge_categories').select('*').order('sort_order')
      return (data ?? []) as KnowledgeCategory[]
    },
  })

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['knowledge-posts-admin'],
    queryFn: async () => {
      const { data } = await supabase
        .from('knowledge_posts')
        .select('*, category:knowledge_categories(*)')
        .order('created_at', { ascending: false })
      return (data ?? []) as KnowledgePost[]
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<KnowledgePost>) => {
      if (editing) {
        const { error } = await supabase
          .from('knowledge_posts')
          .update(payload)
          .eq('id', editing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('knowledge_posts').insert([payload])
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['knowledge-posts-admin'] })
      qc.invalidateQueries({ queryKey: ['knowledge-posts'] })
      closeModal()
      success(editing ? 'Post updated.' : 'Post created.')
    },
    onError: () => toastError('Failed to save post.'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('knowledge_posts').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['knowledge-posts-admin'] })
      qc.invalidateQueries({ queryKey: ['knowledge-posts'] })
      success('Post deleted.')
    },
    onError: () => toastError('Failed to delete post.'),
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: boolean }) => {
      const { error } = await supabase
        .from('knowledge_posts')
        .update({ [field]: value })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['knowledge-posts-admin'] })
      qc.invalidateQueries({ queryKey: ['knowledge-posts'] })
    },
  })

  function openCreate() {
    setEditing(null)
    setForm({ ...EMPTY_FORM, category_id: categories[0]?.id ?? '' })
    setShowModal(true)
  }

  function openEdit(post: KnowledgePost) {
    setEditing(post)
    setForm({
      type: post.type,
      category_id: post.category_id ?? '',
      title_en: post.title_en,
      title_lo: post.title_lo ?? '',
      content_en: post.content_en,
      content_lo: post.content_lo ?? '',
      excerpt_en: post.excerpt_en ?? '',
      excerpt_lo: post.excerpt_lo ?? '',
      author: post.author,
      tags: post.tags.join(', '),
      is_published: post.is_published,
      is_featured: post.is_featured,
    })
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditing(null)
    setForm(EMPTY_FORM)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    saveMutation.mutate({
      type: form.type,
      category_id: form.category_id || null,
      title_en: form.title_en.trim(),
      title_lo: form.title_lo.trim() || null,
      content_en: form.content_en.trim(),
      content_lo: form.content_lo.trim() || null,
      excerpt_en: form.excerpt_en.trim() || null,
      excerpt_lo: form.excerpt_lo.trim() || null,
      author: form.author.trim(),
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      is_published: form.is_published,
      is_featured: form.is_featured,
    })
  }

  const filtered = posts.filter(p => {
    if (filterType !== 'all' && p.type !== filterType) return false
    if (filterPub === 'published' && !p.is_published) return false
    if (filterPub === 'draft' && p.is_published) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('knowledge.adminTitle')}</h1>
          <p className="mt-0.5 text-sm text-gray-500">{posts.length} total posts</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-700 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t('knowledge.addPost')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {POST_TYPES.map(({ value, label, icon: Icon }) => {
          const count = posts.filter(p => p.type === value).length
          return (
            <div key={value} className="rounded-xl border border-gray-100 bg-white p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-4 w-4 text-gray-400" />
                <span className="text-xs font-medium text-gray-500">{label}s</span>
              </div>
              <p className="text-2xl font-bold text-gray-800">{count}</p>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-200"
        >
          <option value="all">All Types</option>
          {POST_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select
          value={filterPub}
          onChange={e => setFilterPub(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-200"
        >
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="py-8 text-center text-sm text-gray-400">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider hidden sm:table-cell">Type</th>
                <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider hidden md:table-cell">Category</th>
                <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(post => (
                <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800 line-clamp-1">{post.title_en}</p>
                    {post.title_lo && (
                      <p className="text-xs text-gray-400 line-clamp-1">{post.title_lo}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', TYPE_COLOR[post.type])}>
                      {post.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-gray-500">
                      {post.category ? `${post.category.icon} ${post.category.name_en}` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        post.is_published
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500',
                      )}>
                        {post.is_published ? 'Published' : 'Draft'}
                      </span>
                      {post.is_featured && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          ⭐
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {/* Toggle Published */}
                      <button
                        onClick={() => toggleMutation.mutate({
                          id: post.id, field: 'is_published', value: !post.is_published,
                        })}
                        title={t('knowledge.publishToggle')}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                      >
                        {post.is_published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                      {/* Toggle Featured */}
                      <button
                        onClick={() => toggleMutation.mutate({
                          id: post.id, field: 'is_featured', value: !post.is_featured,
                        })}
                        title={t('knowledge.featureToggle')}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-amber-100 hover:text-amber-600 transition-colors"
                      >
                        {post.is_featured ? <StarOff className="h-3.5 w-3.5" /> : <Star className="h-3.5 w-3.5" />}
                      </button>
                      {/* Edit */}
                      <button
                        onClick={() => openEdit(post)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => {
                          if (window.confirm(t('knowledge.confirmDelete'))) {
                            deleteMutation.mutate(post.id)
                          }
                        }}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-sm text-gray-400">
                    No posts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-8 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-bold text-gray-800">
                {editing ? t('knowledge.editPost') : t('knowledge.addPost')}
              </h2>
              <button
                onClick={closeModal}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              {/* Type + Category row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">
                    {t('knowledge.formType')} *
                  </label>
                  <select
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value as KnowledgePostType }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
                    required
                  >
                    {POST_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">
                    {t('knowledge.formCategory')}
                  </label>
                  <select
                    value={form.category_id}
                    onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
                  >
                    <option value="">— None —</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name_en}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Titles */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  label={`${t('knowledge.formTitle')} *`}
                  value={form.title_en}
                  onChange={v => setForm(f => ({ ...f, title_en: v }))}
                  required
                />
                <FormField
                  label={t('knowledge.formTitleLo')}
                  value={form.title_lo}
                  onChange={v => setForm(f => ({ ...f, title_lo: v }))}
                />
              </div>

              {/* Content */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  {t('knowledge.formContent')} *
                </label>
                <textarea
                  value={form.content_en}
                  onChange={e => setForm(f => ({ ...f, content_en: e.target.value }))}
                  rows={8}
                  required
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 resize-y font-mono"
                  placeholder="Supports ## headings and **bold** markdown…"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  {t('knowledge.formContentLo')}
                </label>
                <textarea
                  value={form.content_lo}
                  onChange={e => setForm(f => ({ ...f, content_lo: e.target.value }))}
                  rows={5}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 resize-y"
                />
              </div>

              {/* Excerpts */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  label={t('knowledge.formExcerpt')}
                  value={form.excerpt_en}
                  onChange={v => setForm(f => ({ ...f, excerpt_en: v }))}
                  placeholder="Short description shown in listing…"
                />
                <FormField
                  label={t('knowledge.formExcerptLo')}
                  value={form.excerpt_lo}
                  onChange={v => setForm(f => ({ ...f, excerpt_lo: v }))}
                />
              </div>

              {/* Author + Tags */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  label={t('knowledge.formAuthor')}
                  value={form.author}
                  onChange={v => setForm(f => ({ ...f, author: v }))}
                />
                <FormField
                  label={t('knowledge.formTags')}
                  value={form.tags}
                  onChange={v => setForm(f => ({ ...f, tags: v }))}
                  placeholder="motivation, life, education"
                />
              </div>

              {/* Flags */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_published}
                    onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-200"
                  />
                  {t('knowledge.formPublished')}
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_featured}
                    onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-200"
                  />
                  {t('knowledge.formFeatured')} ⭐
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="rounded-xl bg-primary-700 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-800 disabled:opacity-50 transition-colors"
                >
                  {saveMutation.isPending ? t('common.loading') : (form.is_published ? t('knowledge.publish') : t('knowledge.saveDraft'))}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function FormField({
  label, value, onChange, placeholder, required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-gray-600">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
      />
    </div>
  )
}
