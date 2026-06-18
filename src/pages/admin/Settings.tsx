import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import type { Category } from '@/types'

const platformInfo = [
  { label: 'Name', value: 'Bitdoin' },
  { label: 'Market', value: 'Lao PDR' },
  { label: 'Currencies', value: 'LAK, USD' },
  { label: 'Languages', value: 'Lao, English' },
  { label: 'Version', value: '1.0.0' },
]

export function AdminSettings() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { success, error } = useToast()

  const [savingCat, setSavingCat] = useState(false)
  const { register: rCat, handleSubmit: hsCat, reset: resetCat } = useForm<{ name_lo: string; name_en: string; slug: string }>()

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('*').order('name_en')
      return (data ?? []) as Category[]
    },
  })

  async function addCategory(form: { name_lo: string; name_en: string; slug: string }) {
    setSavingCat(true)
    try {
      await supabase.from('categories').insert({
        name_lo: form.name_lo,
        name_en: form.name_en,
        slug: form.slug || form.name_en.toLowerCase().replace(/\s+/g, '-'),
      })
      await qc.invalidateQueries({ queryKey: ['categories'] })
      resetCat({})
      success('Category added')
    } catch {
      error(t('common.error'))
    } finally {
      setSavingCat(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('admin.settings')}</h1>
          <p className="text-sm text-gray-400 mt-0.5">Platform configuration</p>
        </div>
      </div>

      {/* Categories section */}
      <section className="bg-white rounded-2xl shadow-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-800">Book Categories</h2>
          <span className="text-xs text-gray-400">{categories?.length ?? 0} categories</span>
        </div>

        {/* Category list — clean table-like rows */}
        <div className="rounded-xl border border-gray-100 overflow-hidden">
          {categories?.map((cat, idx) => (
            <div
              key={cat.id}
              className={`flex items-center gap-4 px-4 py-3 ${
                idx !== (categories.length - 1) ? 'border-b border-gray-50' : ''
              }`}
            >
              {/* EN name */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{cat.name_en}</p>
              </div>
              {/* Lao name */}
              <div className="flex-1 min-w-0 hidden sm:block">
                <p className="text-sm text-gray-500">{cat.name_lo}</p>
              </div>
              {/* Slug */}
              <div className="flex-shrink-0">
                <span className="inline-flex items-center rounded-lg bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-500">
                  /{cat.slug}
                </span>
              </div>
            </div>
          ))}
          {(!categories || categories.length === 0) && (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              No categories yet. Add one below.
            </div>
          )}
        </div>

        {/* Add category inline form */}
        <form onSubmit={hsCat(addCategory)} className="pt-3 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Add Category</p>
          <div className="grid grid-cols-3 gap-3">
            <Input label="English Name" required {...rCat('name_en', { required: true })} />
            <Input label="Lao Name" required {...rCat('name_lo', { required: true })} />
            <Input label="Slug (auto)" placeholder="auto-generated" {...rCat('slug')} />
          </div>
          <div className="mt-3">
            <Button type="submit" size="sm" loading={savingCat}>
              Add Category
            </Button>
          </div>
        </form>
      </section>

      {/* Platform info section */}
      <section className="bg-white rounded-2xl shadow-card p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-800">Platform</h2>

        <div className="rounded-xl border border-gray-100 overflow-hidden">
          {platformInfo.map((item, idx) => (
            <div
              key={item.label}
              className={`flex items-center px-4 py-3 ${
                idx !== platformInfo.length - 1 ? 'border-b border-gray-50' : ''
              }`}
            >
              <span className="text-sm text-gray-400 w-32 flex-shrink-0">{item.label}</span>
              <span className="text-sm font-semibold text-gray-800">{item.value}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
