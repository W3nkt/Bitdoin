import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import type { Category } from '@/types'

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
      <h1 className="text-xl font-bold text-gray-900">{t('admin.settings')}</h1>

      {/* Categories */}
      <section className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Book Categories</h2>

        <div className="space-y-2">
          {categories?.map(cat => (
            <div key={cat.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-800">{cat.name_en}</p>
                <p className="text-xs text-gray-400">{cat.name_lo} · /{cat.slug}</p>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={hsCat(addCategory)} className="grid grid-cols-3 gap-3 pt-2 border-t border-gray-50">
          <Input label="English Name" required {...rCat('name_en', { required: true })} />
          <Input label="Lao Name" required {...rCat('name_lo', { required: true })} />
          <Input label="Slug (auto)" {...rCat('slug')} />
          <div className="col-span-3">
            <Button type="submit" size="sm" loading={savingCat}>Add Category</Button>
          </div>
        </form>
      </section>

      {/* Platform info */}
      <section className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Platform</h2>
        <div className="text-sm text-gray-600 space-y-1">
          <p><span className="text-gray-400">Name:</span> Pwen Books</p>
          <p><span className="text-gray-400">Market:</span> Lao PDR</p>
          <p><span className="text-gray-400">Currencies:</span> LAK, USD</p>
          <p><span className="text-gray-400">Languages:</span> Lao, English</p>
          <p><span className="text-gray-400">Version:</span> 1.0.0</p>
        </div>
      </section>
    </div>
  )
}
