import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import DOMPurify from 'dompurify'
import { Plus, Search, Edit2, Trash2, BookOpen, Upload, Bold, Italic, Underline, List, ListOrdered, CornerDownLeft, RemoveFormatting, Star } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { Book, Category } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Pagination } from '@/components/ui/Pagination'
import { useToast } from '@/components/ui/Toast'

const PAGE_SIZE = 15
const MAX_COVER_SIZE = 5 * 1024 * 1024
const ALLOWED_COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_DESCRIPTION_TAGS = [
  'p', 'div', 'br', 'span',
  'b', 'strong', 'i', 'em', 'u',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote',
]

function sanitizeDescription(html: string) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ALLOWED_DESCRIPTION_TAGS,
    ALLOWED_ATTR: [],
  }).trim()
}

interface BookForm {
  isbn: string
  title: string
  author: string
  publisher: string
  language: string
  category_id: string
  description: string
  pages: string
  publication_date: string
}

export function AdminBooks() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { success, error } = useToast()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteModal, setDeleteModal] = useState<Book | null>(null)
  const [editBook, setEditBook] = useState<Book | null>(null)
  const [saving, setSaving] = useState(false)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [coverError, setCoverError] = useState<string | null>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const descRef = useRef<HTMLDivElement>(null)

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<BookForm>()

  useEffect(() => {
    if (modalOpen && descRef.current) {
      descRef.current.innerHTML = editBook?.description ?? ''
    }
  }, [modalOpen, editBook])

  useEffect(() => {
    return () => {
      if (coverPreview?.startsWith('blob:')) URL.revokeObjectURL(coverPreview)
    }
  }, [coverPreview])

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('*').order('name_en')
      return (data ?? []) as Category[]
    },
  })

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'books', search, page],
    queryFn: async () => {
      let q = supabase
        .from('books')
        .select('*, category:categories(name_en)', { count: 'exact' })
      if (search) q = q.or(`title.ilike.%${search}%,author.ilike.%${search}%,isbn.eq.${search}`)
      const from = (page - 1) * PAGE_SIZE
      const { data, count } = await q.range(from, from + PAGE_SIZE - 1).order('created_at', { ascending: false })
      return { data: (data ?? []) as Book[], count: count ?? 0 }
    },
  })

  function openAdd() {
    setEditBook(null)
    reset({})
    setCoverFile(null)
    setCoverPreview(null)
    setCoverError(null)
    if (coverInputRef.current) coverInputRef.current.value = ''
    setModalOpen(true)
  }

  function openEdit(book: Book) {
    setEditBook(book)
    reset({
      isbn: book.isbn ?? '',
      title: book.title,
      author: book.author ?? '',
      publisher: book.publisher ?? '',
      language: book.language,
      category_id: book.category_id ?? '',
      description: book.description ?? '',
      pages: book.pages ? String(book.pages) : '',
      publication_date: book.publication_date?.split('T')[0] ?? '',
    })
    setCoverFile(null)
    setCoverPreview(book.cover_image_url ?? null)
    setCoverError(null)
    if (coverInputRef.current) coverInputRef.current.value = ''
    setModalOpen(true)
  }

  async function toggleFeatured(book: Book) {
    const { error: updateError } = await supabase
      .from('books')
      .update({ is_featured: !book.is_featured })
      .eq('id', book.id)

    if (updateError) {
      error('Could not update the featured book.')
      return
    }

    await Promise.all([
      qc.invalidateQueries({ queryKey: ['admin', 'books'] }),
      qc.invalidateQueries({ queryKey: ['books', 'featured'] }),
    ])
    success(book.is_featured ? 'Removed from featured favorites.' : 'Added to featured favorites.')
  }

  function closeBookModal() {
    setModalOpen(false)
    setCoverFile(null)
    setCoverPreview(null)
    setCoverError(null)
    if (coverInputRef.current) coverInputRef.current.value = ''
  }

  function handleCoverChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setCoverError(null)

    if (!file) return
    if (!ALLOWED_COVER_TYPES.includes(file.type)) {
      setCoverError('Choose a JPG, PNG, or WebP image.')
      event.target.value = ''
      return
    }
    if (file.size > MAX_COVER_SIZE) {
      setCoverError('The cover image must be 5 MB or smaller.')
      event.target.value = ''
      return
    }

    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  async function uploadCover(file: File) {
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `covers/${crypto.randomUUID()}.${extension}`
    const { error: uploadError } = await supabase.storage
      .from('books')
      .upload(path, file, { contentType: file.type, upsert: false })

    if (uploadError) throw uploadError
    const { data: { publicUrl } } = supabase.storage.from('books').getPublicUrl(path)
    return publicUrl
  }

  async function onSubmit(form: BookForm) {
    setSaving(true)
    let uploadedCoverUrl: string | null = null
    const payload: Record<string, string | number | null> = {
      isbn: form.isbn || null,
      title: form.title,
      author: form.author || null,
      publisher: form.publisher || null,
      language: form.language,
      category_id: form.category_id || null,
      description: form.description ? sanitizeDescription(form.description) : null,
      pages: form.pages ? parseInt(form.pages) : null,
      publication_date: form.publication_date || null,
    }
    try {
      if (coverFile) {
        uploadedCoverUrl = await uploadCover(coverFile)
        payload.cover_image_url = uploadedCoverUrl
      }

      if (editBook) {
        const { error: err } = await supabase.from('books').update(payload).eq('id', editBook.id)
        if (err) throw err
        success('Book updated')
      } else {
        const { error: err } = await supabase.from('books').insert(payload)
        if (err) throw err
        success('Book added')
      }
      await qc.invalidateQueries({ queryKey: ['admin', 'books'] })
      closeBookModal()
    } catch (err) {
      if (uploadedCoverUrl) {
        const uploadedPath = uploadedCoverUrl.split('/books/')[1]
        if (uploadedPath) await supabase.storage.from('books').remove([uploadedPath])
      }
      const message = err instanceof Error ? err.message : t('common.error')
      error(message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(book: Book) {
    try {
      await supabase.from('books').update({ is_active: false }).eq('id', book.id)
      await qc.invalidateQueries({ queryKey: ['admin', 'books'] })
      setDeleteModal(null)
      success('Book removed')
    } catch {
      error(t('common.error'))
    }
  }

  const catOptions = categories?.map(c => ({ value: c.id, label: c.name_en })) ?? []
  const langOptions = [
    { value: 'Lao', label: 'Lao' },
    { value: 'English', label: 'English' },
    { value: 'Thai', label: 'Thai' },
    { value: 'Chinese', label: 'Chinese' },
    { value: 'French', label: 'French' },
  ]
  // If the book being edited has a language/category outside the lists above (e.g. edited
  // directly in the database), add it so the select shows the real value instead of silently
  // blanking it out — which would otherwise overwrite it with the placeholder on next save.
  const editLangOptions = editBook?.language && !langOptions.some(o => o.value === editBook.language)
    ? [{ value: editBook.language, label: `${editBook.language} (unrecognized)` }, ...langOptions]
    : langOptions
  const editCatOptions = editBook?.category_id && !catOptions.some(o => o.value === editBook.category_id)
    ? [{ value: editBook.category_id, label: 'Unrecognized category' }, ...catOptions]
    : catOptions

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('admin.books')}</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage the book catalog</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" icon={<Upload className="h-4 w-4" />}>
            {t('admin.importCsv')}
          </Button>
          <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={openAdd}>
            {t('admin.addBook')}
          </Button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search by title, author or ISBN…"
          className="w-full rounded-2xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm focus:border-primary-400 focus:outline-none bg-white shadow-sm transition-shadow focus:shadow-card"
        />
      </div>

      {isLoading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-2xl shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Book</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Language</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">ISBN</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.data.map(book => (
                <tr key={book.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {/* Portrait book thumbnail */}
                      <div className="w-9 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 shadow-sm">
                        {book.cover_image_url
                          ? <img src={book.cover_image_url} alt={book.title} className="w-full h-full object-cover" />
                          : (
                            <div className="w-full h-full flex items-center justify-center bg-primary-50">
                              <BookOpen className="h-4 w-4 text-primary-300" />
                            </div>
                          )
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate max-w-xs">{book.title}</p>
                        {book.author && <p className="text-xs text-gray-400 truncate">{book.author}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
                      {(book.category as { name_en?: string } | undefined)?.name_en ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500">{book.language}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs font-mono text-gray-400">{book.isbn ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                     <div className="flex items-center justify-end gap-1.5">
                       <button
                         type="button"
                         onClick={() => toggleFeatured(book)}
                         className={cn(
                           'rounded-xl p-2 transition-colors',
                           book.is_featured
                             ? 'bg-amber-50 text-amber-500 hover:bg-amber-100'
                             : 'text-gray-400 hover:bg-amber-50 hover:text-amber-500',
                         )}
                         title={book.is_featured ? 'Remove featured star' : 'Add featured star'}
                         aria-label={book.is_featured ? `Remove featured star from ${book.title}` : `Feature ${book.title}`}
                       >
                         <Star className="h-3.5 w-3.5" fill={book.is_featured ? 'currentColor' : 'none'} />
                       </button>
                       <button
                        onClick={() => openEdit(book)}
                        className="p-2 rounded-xl hover:bg-primary-50 text-gray-400 hover:text-primary-700 transition-colors"
                        title="Edit"
                        aria-label={`Edit ${book.title}`}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteModal(book)}
                        className="p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                        title="Remove"
                        aria-label={`Remove ${book.title}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data && data.count > PAGE_SIZE && (
            <div className="px-4 py-3 border-t border-gray-50">
              <Pagination page={page} pageSize={PAGE_SIZE} total={data.count} onChange={setPage} />
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeBookModal}
        title={editBook ? 'Edit Book' : t('admin.addBook')}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={closeBookModal}>{t('common.cancel')}</Button>
            <Button loading={saving} onClick={handleSubmit(onSubmit)}>{t('common.save')}</Button>
          </>
        }
      >
        <form className="space-y-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Book Cover</span>
            <div className="flex items-center gap-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
              <div className="flex h-28 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white shadow-sm">
                {coverPreview ? (
                  <img src={coverPreview} alt="Book cover preview" className="h-full w-full object-cover" />
                ) : (
                  <BookOpen className="h-6 w-6 text-gray-300" />
                )}
              </div>
              <div className="space-y-2">
                <input
                  ref={coverInputRef}
                  id="book-cover"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={handleCoverChange}
                />
                <label
                  htmlFor="book-cover"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                >
                  <Upload className="h-4 w-4" />
                  {coverPreview ? 'Change image' : 'Upload image'}
                </label>
                <p className="text-xs text-gray-500">JPG, PNG, or WebP. Maximum 5 MB.</p>
                {coverFile && <p className="max-w-xs truncate text-xs text-gray-600">{coverFile.name}</p>}
                {coverError && <p className="text-xs text-red-600">{coverError}</p>}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="ISBN" {...register('isbn')} />
            <Select label="Language" options={editLangOptions} placeholder="Select language" {...register('language')} />
          </div>
          <Input label="Title" required error={errors.title?.message} {...register('title', { required: true })} />
          <Input label="Author" {...register('author')} />
          <Input label="Publisher" {...register('publisher')} />
          <Select
            label="Category"
            options={editCatOptions}
            placeholder="Select category"
            {...register('category_id')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Pages" type="number" {...register('pages')} />
            <Input label="Publication Date" type="date" {...register('publication_date')} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <div className="flex flex-wrap items-center gap-0.5 rounded-t-lg border border-b-0 border-gray-300 bg-gray-50 px-2 py-1.5">
              {/* Bold */}
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); document.execCommand('bold') }}
                className="rounded p-1.5 text-gray-600 hover:bg-gray-200 active:bg-gray-300"
                title="Bold (Ctrl+B)"
                aria-label="Bold"
              ><Bold className="h-3.5 w-3.5" /></button>
              {/* Italic */}
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); document.execCommand('italic') }}
                className="rounded p-1.5 text-gray-600 hover:bg-gray-200 active:bg-gray-300"
                title="Italic (Ctrl+I)"
                aria-label="Italic"
              ><Italic className="h-3.5 w-3.5" /></button>
              {/* Underline */}
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); document.execCommand('underline') }}
                className="rounded p-1.5 text-gray-600 hover:bg-gray-200 active:bg-gray-300"
                title="Underline (Ctrl+U)"
                aria-label="Underline"
              ><Underline className="h-3.5 w-3.5" /></button>
              <div className="mx-1 h-4 w-px bg-gray-300" />
              {/* Bullet list */}
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); document.execCommand('insertUnorderedList') }}
                className="rounded p-1.5 text-gray-600 hover:bg-gray-200 active:bg-gray-300"
                title="Bullet List"
                aria-label="Bullet list"
              ><List className="h-3.5 w-3.5" /></button>
              {/* Numbered list */}
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); document.execCommand('insertOrderedList') }}
                className="rounded p-1.5 text-gray-600 hover:bg-gray-200 active:bg-gray-300"
                title="Numbered List"
                aria-label="Numbered list"
              ><ListOrdered className="h-3.5 w-3.5" /></button>
              <div className="mx-1 h-4 w-px bg-gray-300" />
              {/* New line */}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  descRef.current?.focus()
                  document.execCommand('insertHTML', false, '<br>')
                }}
                className="rounded p-1.5 text-gray-600 hover:bg-gray-200 active:bg-gray-300"
                title="Insert Line Break"
                aria-label="Insert line break"
              ><CornerDownLeft className="h-3.5 w-3.5" /></button>
              {/* Clear formatting */}
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); document.execCommand('removeFormat') }}
                className="rounded p-1.5 text-gray-600 hover:bg-gray-200 active:bg-gray-300"
                title="Clear Formatting"
                aria-label="Clear formatting"
              ><RemoveFormatting className="h-3.5 w-3.5" /></button>
            </div>
            <div
              ref={descRef}
              contentEditable
              suppressContentEditableWarning
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  // Allow native Enter inside lists (creates new <li>)
                  const node = window.getSelection()?.anchorNode
                  const inList = (node as Element)?.closest?.('li') ?? (node?.parentElement)?.closest('li')
                  if (!inList) {
                    e.preventDefault()
                    document.execCommand('insertHTML', false, '<br>')
                  }
                }
              }}
              onInput={() => setValue('description', descRef.current?.innerHTML ?? '')}
              className="min-h-[220px] rounded-b-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 [&_ul]:ml-4 [&_ul]:list-disc [&_ol]:ml-4 [&_ol]:list-decimal"
              data-placeholder="Enter book description..."
            />
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="Remove Book"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteModal(null)}>{t('common.cancel')}</Button>
            <Button variant="danger" onClick={() => deleteModal && handleDelete(deleteModal)}>Remove</Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Remove <strong>{deleteModal?.title}</strong>? This will hide it from the catalog.
        </p>
      </Modal>
    </div>
  )
}
