import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, Eye, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { AuditLog } from '@/types'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { useLanguage } from '@/context/LanguageContext'
import { formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 20

const ENTITY_OPTIONS = [
  { value: '', label: 'All Entities' },
  { value: 'order', label: 'Orders' },
  { value: 'payment', label: 'Payments' },
  { value: 'bookstore_payment', label: 'Bookstore Payments' },
  { value: 'delivery', label: 'Deliveries' },
  { value: 'book_price', label: 'Book Prices' },
  { value: 'margin_rule', label: 'Margin Rules' },
]

const ACTION_LABELS: Record<string, string> = {
  ORDER_STATUS_CHANGED: 'Order Status Changed',
  BOOKSTORE_PAYMENT_RECORDED: 'Bookstore Payment Recorded',
  BOOKSTORE_PAYMENT_UPDATED: 'Bookstore Payment Updated',
  PAYMENT_VERIFIED: 'Payment Verified',
  PAYMENT_REJECTED: 'Payment Rejected',
  DELIVERY_CREATED: 'Delivery Created',
  DELIVERY_UPDATED: 'Delivery Updated',
  BOOK_PRICE_CREATED: 'Book Price Created',
  BOOK_PRICE_UPDATED: 'Book Price Updated',
  BOOK_PRICE_DELETED: 'Book Price Deleted',
  MARGIN_RULE_CREATED: 'Margin Rule Created',
}

function actionBadge(action: string): string {
  if (action.endsWith('_DELETED') || action.endsWith('_REJECTED')) return 'bg-red-100 text-red-700'
  if (action.endsWith('_CREATED') || action.endsWith('_VERIFIED') || action.endsWith('_RECORDED')) return 'bg-green-100 text-green-700'
  return 'bg-blue-100 text-blue-700'
}

function entityBadge(entity: string): string {
  const map: Record<string, string> = {
    order: 'bg-purple-100 text-purple-700',
    payment: 'bg-yellow-100 text-yellow-700',
    bookstore_payment: 'bg-orange-100 text-orange-700',
    delivery: 'bg-indigo-100 text-indigo-700',
    book_price: 'bg-teal-100 text-teal-700',
    margin_rule: 'bg-pink-100 text-pink-700',
  }
  return map[entity] ?? 'bg-gray-100 text-gray-700'
}

function changeSummary(log: AuditLog): string {
  const o = log.old_value
  const n = log.new_value
  if (o?.status && n?.status) return `${o.status} → ${n.status}`
  if (n?.status) return `→ ${String(n.status)}`
  if (n?.amount) return `Amount: ${String(n.amount)}`
  if (n?.name) return String(n.name)
  if (o?.bookstore_price && n?.bookstore_price) return `Price: ${o.bookstore_price} → ${n.bookstore_price}`
  return '—'
}

export function AdminAuditLogs() {
  const { language } = useLanguage()
  const [page, setPage] = useState(1)
  const [entityFilter, setEntityFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selected, setSelected] = useState<AuditLog | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit-logs', entityFilter, dateFrom, dateTo, page],
    queryFn: async () => {
      let q = supabase
        .from('audit_logs')
        .select('*, user:users(name, role)', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (entityFilter) q = q.eq('entity', entityFilter)
      if (dateFrom) q = q.gte('created_at', new Date(dateFrom).toISOString())
      if (dateTo) {
        const end = new Date(dateTo)
        end.setDate(end.getDate() + 1)
        q = q.lt('created_at', end.toISOString())
      }

      const from = (page - 1) * PAGE_SIZE
      const { data: rows, count } = await q.range(from, from + PAGE_SIZE - 1)
      return { data: (rows ?? []) as AuditLog[], count: count ?? 0 }
    },
  })

  const hasFilters = entityFilter || dateFrom || dateTo

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary-600" />
            Audit Logs
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {data ? `${data.count} events recorded` : 'Track all important platform actions'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <select
            value={entityFilter}
            onChange={e => { setEntityFilter(e.target.value); setPage(1) }}
            className="appearance-none rounded-2xl border border-gray-200 bg-white pl-3.5 pr-9 py-2.5 text-sm focus:outline-none focus:border-primary-400 shadow-sm cursor-pointer"
          >
            {ENTITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
        <input
          type="date"
          value={dateFrom}
          onChange={e => { setDateFrom(e.target.value); setPage(1) }}
          className="rounded-2xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:border-primary-400 shadow-sm"
        />
        <span className="text-xs text-gray-400">to</span>
        <input
          type="date"
          value={dateTo}
          onChange={e => { setDateTo(e.target.value); setPage(1) }}
          className="rounded-2xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:border-primary-400 shadow-sm"
        />
        {hasFilters && (
          <button
            onClick={() => { setEntityFilter(''); setDateFrom(''); setDateTo(''); setPage(1) }}
            className="text-sm text-gray-400 hover:text-gray-600 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {isLoading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Time</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Entity</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden xl:table-cell">Change</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.data.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                    No audit events found
                  </td>
                </tr>
              )}
              {data?.data.map(log => (
                <tr
                  key={log.id}
                  className="hover:bg-gray-50/80 transition-colors cursor-pointer"
                  onClick={() => setSelected(log)}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-xs text-gray-700">{formatDateTime(log.created_at, language)}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-xs font-medium text-gray-700">
                      {(log.user as { name?: string } | undefined)?.name ?? '—'}
                    </p>
                    <p className="text-xs text-gray-400 capitalize">
                      {(log.user as { role?: string } | undefined)?.role?.toLowerCase() ?? ''}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', actionBadge(log.action))}>
                      {ACTION_LABELS[log.action] ?? log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', entityBadge(log.entity))}>
                      {log.entity.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell">
                    <p className="text-xs text-gray-500 font-mono">{changeSummary(log)}</p>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setSelected(log)}
                      className="p-2 rounded-xl hover:bg-primary-50 text-gray-400 hover:text-primary-700 transition-colors"
                      title="View details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
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

      {/* Detail modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Audit Event Detail"
        size="lg"
        footer={<Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>}
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Timestamp</p>
                <p className="text-sm font-medium text-gray-800">{formatDateTime(selected.created_at, language)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Actor</p>
                <p className="text-sm font-medium text-gray-800">
                  {(selected.user as { name?: string } | undefined)?.name ?? '—'}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {(selected.user as { role?: string } | undefined)?.role?.toLowerCase() ?? ''}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Action</p>
                <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', actionBadge(selected.action))}>
                  {ACTION_LABELS[selected.action] ?? selected.action.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Entity</p>
                <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', entityBadge(selected.entity))}>
                  {selected.entity.replace(/_/g, ' ')}
                </span>
                {selected.entity_id && (
                  <p className="text-xs text-gray-400 font-mono mt-1.5 break-all">{selected.entity_id}</p>
                )}
              </div>
            </div>

            {(selected.old_value || selected.new_value) && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Before</p>
                  {selected.old_value ? (
                    <pre className="text-xs bg-red-50 border border-red-100 rounded-xl p-3 overflow-auto max-h-52 font-mono text-gray-700 leading-relaxed">
                      {JSON.stringify(selected.old_value, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-xs text-gray-300 italic">—</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">After</p>
                  {selected.new_value ? (
                    <pre className="text-xs bg-green-50 border border-green-100 rounded-xl p-3 overflow-auto max-h-52 font-mono text-gray-700 leading-relaxed">
                      {JSON.stringify(selected.new_value, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-xs text-gray-300 italic">—</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
