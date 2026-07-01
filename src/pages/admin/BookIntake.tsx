import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import {
  BookOpen, CheckCircle2, Plus, Rocket, Upload,
  Bold, Italic, Underline, List, ListOrdered, CornerDownLeft, RemoveFormatting,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'
import type { Category } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useToast } from '@/components/ui/Toast'
import { useLanguage } from '@/context/LanguageContext'
import { formatPrice } from '@/lib/utils'

const MAX_COVER_SIZE = 5 * 1024 * 1024
const ALLOWED_COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp']

interface PendingBookRow {
  id: string
  title: string
  author?: string
  cover_image_url?: string
  prices: { id: string; bookstore_price: number; bookstore: { name: string } | null }[]
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

export function AdminBookIntake() {
  const qc = useQueryClient()
  const { success, error } = useToast()
  const { currency } = useLanguage()

  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [coverError, setCoverError] = useState<string | null>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const descRef = useRef<HTMLDivElement>(null)

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<BookForm>()

  useEffect(() => {
    if (modalOpen && descRef.current) descRef.current.innerHTML = ''
  }, [modalOpen])

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

  const { data: pendingBooks, isLoading } = useQuery({
    queryKey: ['admin', 'book-intake'],
    queryFn: async () => {
      const { data } = await supabase
        .from('books')
        .select('id, title, author, cover_image_url, prices:book_prices(id, bookstore_price, bookstore:bookstores(name))')
        .eq('is_active', false)
        .order('created_at', { ascending: false })
      return (data ?? []) as unknown as PendingBookRow[]
    },
  })

  const readyToPublish = (pendingBooks ?? []).filter(b => b.prices.length > 0)

  function openAdd() {
    reset({})
    setCoverFile(null)
    setCoverPreview(null)
    setCoverError(null)
    if (coverInputRef.current) coverInputRef.current.value = ''
    if (descRef.current) descRef.current.innerHTML = ''
    setModalOpen(true)
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
    return supabase.storage.from('books').getPublicUrl(path).data.publicUrl
  }

  async function onSubmit(form: BookForm) {
    setSaving(true)
    let uploadedCoverUrl: string | null = null
    try {
      const payload: Record<string, string | number | boolean | null> = {
        isbn: form.isbn || null,
        title: form.title,
        author: form.author || null,
        publisher: form.publisher || null,
        language: form.language || 'Lao',
        category_id: form.category_id || null,
        description: form.description || null,
        pages: form.pages ? parseInt(form.pages) : null,
        publication_date: form.publication_date || null,
        is_active: false,
      }
      if (coverFile) {
        uploadedCoverUrl = await uploadCover(coverFile)
        payload.cover_image_url = uploadedCoverUrl
      }

      const { error: err } = await supabase.from('books').insert(payload)
      if (err) throw err
      success('Book added to the intake list')
      await qc.invalidateQueries({ queryKey: ['admin', 'book-intake'] })
      setModalOpen(false)
    } catch (err) {
      if (uploadedCoverUrl) {
        const uploadedPath = uploadedCoverUrl.split('/books/')[1]
        if (uploadedPath) await supabase.storage.from('books').remove([uploadedPath])
      }
      error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function handlePublish() {
    if (readyToPublish.length === 0) return
    setPublishing(true)
    try {
      const ids = readyToPublish.map(b => b.id)
      const { error: err } = await supabase.from('books').update({ is_active: true }).in('id', ids)
      if (err) throw err
      await logAudit({
        entity: 'book',
        action: 'BOOKS_PUBLISHED',
        newValue: { count: ids.length, book_ids: ids },
      })
      success(`Published ${ids.length} book${ids.length === 1 ? '' : 's'} to the store`)
      await qc.invalidateQueries({ queryKey: ['admin', 'book-intake'] })
    } catch (err) {
      error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setPublishing(false)
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

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Book Intake</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Add books awaiting a bookstore price. Share each bookstore's link from the Bookstores page.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={openAdd}>
            Add Book
          </Button>
          <Button
            size="sm"
            variant="secondary"
            icon={<Rocket className="h-4 w-4" />}
            loading={publishing}
            disabled={readyToPublish.length === 0}
            onClick={handlePublish}
          >
            Publish {readyToPublish.length > 0 ? `(${readyToPublish.length})` : ''}
          </Button>
        </div>
      </div>

      {isLoading ? <LoadingSpinner /> : (
        (pendingBooks ?? []).length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center shadow-card">
            <BookOpen className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm font-semibold text-gray-700">No books waiting for a price</p>
            <p className="mt-1 text-xs text-gray-400">Add a book to start collecting prices from bookstores.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pendingBooks!.map(book => (
              <div key={book.id} className="flex gap-3 rounded-2xl bg-white p-3 shadow-card">
                <div className="h-24 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {book.cover_image_url ? (
                    <img src={book.cover_image_url} alt={book.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-primary-50">
                      <BookOpen className="h-5 w-5 text-primary-300" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{book.title}</p>
                  {book.author && <p className="truncate text-xs text-gray-400">{book.author}</p>}
                  <div className="mt-2 space-y-0.5">
                    {book.prices.length === 0 ? (
                      <p className="text-xs text-gray-400">No submissions yet</p>
                    ) : (
                      book.prices.map(p => (
                        <p key={p.id} className="flex items-center gap-1 text-xs text-green-700">
                          <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                          {p.bookstore?.name ?? 'Store'} · {formatPrice(p.bookstore_price, currency)}
                        </p>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Book to Intake List"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button loading={saving} onClick={handleSubmit(onSubmit)}>Save</Button>
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
                  id="intake-book-cover"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={handleCoverChange}
                />
                <label
                  htmlFor="intake-book-cover"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                >
                  <Upload className="h-4 w-4" />
                  {coverPreview ? 'Change image' : 'Upload image'}
                </label>
                <p className="text-xs text-gray-500">JPG, PNG, or WebP. Maximum 5 MB.</p>
                {coverError && <p className="text-xs text-red-600">{coverError}</p>}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="ISBN" {...register('isbn')} />
            <Select label="Language" options={langOptions} placeholder="Select language" {...register('language')} />
          </div>
          <Input label="Title" required error={errors.title?.message} {...register('title', { required: true })} />
          <Input label="Author" {...register('author')} />
          <Input label="Publisher" {...register('publisher')} />
          <Select
            label="Category"
            options={catOptions}
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
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); document.execCommand('bold') }}
                className="rounded p-1.5 text-gray-600 hover:bg-gray-200 active:bg-gray-300"
                title="Bold (Ctrl+B)"
              ><Bold className="h-3.5 w-3.5" /></button>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); document.execCommand('italic') }}
                className="rounded p-1.5 text-gray-600 hover:bg-gray-200 active:bg-gray-300"
                title="Italic (Ctrl+I)"
              ><Italic className="h-3.5 w-3.5" /></button>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); document.execCommand('underline') }}
                className="rounded p-1.5 text-gray-600 hover:bg-gray-200 active:bg-gray-300"
                title="Underline (Ctrl+U)"
              ><Underline className="h-3.5 w-3.5" /></button>
              <div className="mx-1 h-4 w-px bg-gray-300" />
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); document.execCommand('insertUnorderedList') }}
                className="rounded p-1.5 text-gray-600 hover:bg-gray-200 active:bg-gray-300"
                title="Bullet List"
              ><List className="h-3.5 w-3.5" /></button>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); document.execCommand('insertOrderedList') }}
                className="rounded p-1.5 text-gray-600 hover:bg-gray-200 active:bg-gray-300"
                title="Numbered List"
              ><ListOrdered className="h-3.5 w-3.5" /></button>
              <div className="mx-1 h-4 w-px bg-gray-300" />
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  descRef.current?.focus()
                  document.execCommand('insertHTML', false, '<br>')
                }}
                className="rounded p-1.5 text-gray-600 hover:bg-gray-200 active:bg-gray-300"
                title="Insert Line Break"
              ><CornerDownLeft className="h-3.5 w-3.5" /></button>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); document.execCommand('removeFormat') }}
                className="rounded p-1.5 text-gray-600 hover:bg-gray-200 active:bg-gray-300"
                title="Clear Formatting"
              ><RemoveFormatting className="h-3.5 w-3.5" /></button>
            </div>
            <div
              ref={descRef}
              contentEditable
              suppressContentEditableWarning
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
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
    </div>
  )
}
