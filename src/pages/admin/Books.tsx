import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Edit2, Trash2, BookOpen, Upload } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { supabase } from '@/lib/supabase'
import type { Book, Category } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Pagination } from '@/components/ui/Pagination'
import { useToast } from '@/components/ui/Toast'

const PAGE_SIZE = 15

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

  const { register, handleSubmit, reset, formState: { errors } } = useForm<BookForm>()

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
    setModalOpen(true)
  }

  async function onSubmit(form: BookForm) {
    setSaving(true)
    const payload = {
      isbn: form.isbn || null,
      title: form.title,
      author: form.author || null,
      publisher: form.publisher || null,
      language: form.language,
      category_id: form.category_id || null,
      description: form.description || null,
      pages: form.pages ? parseInt(form.pages) : null,
      publication_date: form.publication_date || null,
    }
    try {
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
      setModalOpen(false)
    } catch {
      error(t('common.error'))
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">{t('admin.books')}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" icon={<Upload className="h-4 w-4" />}>
            {t('admin.importCsv')}
          </Button>
          <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={openAdd}>
            {t('admin.addBook')}
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search books…"
          className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm focus:border-primary-400 focus:outline-none bg-white"
        />
      </div>

      {isLoading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
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
                <tr key={book.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {book.cover_image_url
                          ? <img src={book.cover_image_url} alt={book.title} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><BookOpen className="h-4 w-4 text-gray-300" /></div>
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate max-w-xs">{book.title}</p>
                        {book.author && <p className="text-xs text-gray-400 truncate">{book.author}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-gray-500">
                      {(book.category as { name_en?: string } | undefined)?.name_en ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500">{book.language}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs font-mono text-gray-400">{book.isbn ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(book)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-primary-700">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteModal(book)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data && data.count > PAGE_SIZE && (
            <div className="px-4 py-2 border-t border-gray-50">
              <Pagination page={page} pageSize={PAGE_SIZE} total={data.count} onChange={setPage} />
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editBook ? 'Edit Book' : t('admin.addBook')}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
            <Button loading={saving} onClick={handleSubmit(onSubmit)}>{t('common.save')}</Button>
          </>
        }
      >
        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="ISBN" {...register('isbn')} />
            <Input label="Language" {...register('language')} />
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
          <Textarea label="Description" rows={4} {...register('description')} />
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
