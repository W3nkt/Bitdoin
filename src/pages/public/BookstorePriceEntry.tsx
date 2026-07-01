import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { BookOpen, Check, Tag } from 'lucide-react'
import { getPendingBooksForToken, submitBookstorePrice, type PendingBook } from '@/lib/bookstorePricing'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { publicAsset } from '@/lib/assets'

export function BookstorePriceEntry() {
  const { token } = useParams<{ token: string }>()
  const [storeName, setStoreName] = useState<string | null>(null)
  const [books, setBooks] = useState<PendingBook[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    getPendingBooksForToken(token)
      .then(result => {
        setStoreName(result.bookstore.name)
        setBooks(result.books)
      })
      .catch(err => setLoadError(err instanceof Error ? err.message : 'Unable to load this link'))
      .finally(() => setLoading(false))
  }, [token])

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center gap-3">
          <img
            src={publicAsset('icons/Bitdoin Logo H.png')}
            alt="Bitdoin"
            className="h-10 w-10 rounded-lg bg-white object-contain shadow-sm"
          />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Book Price Submission</h1>
            {storeName && <p className="text-sm text-gray-500">for {storeName}</p>}
          </div>
        </div>

        {loading && <LoadingSpinner />}

        {!loading && loadError && (
          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-10 text-center">
            <p className="text-sm font-semibold text-red-600">{loadError}</p>
            <p className="mt-1 text-xs text-gray-400">Please ask Bitdoin for a fresh link.</p>
          </div>
        )}

        {!loading && !loadError && (
          books.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white px-5 py-10 text-center">
              <Tag className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm font-semibold text-gray-700">No books are waiting for a price right now</p>
              <p className="mt-1 text-xs text-gray-400">Check back later — this link stays active.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                Enter your price (in LAK) for any book you carry, then press Save. You can come back to this
                same link anytime to update prices or add new books.
              </p>
              {books.map(book => (
                <BookPriceRow key={book.id} book={book} token={token!} />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}

function BookPriceRow({ book, token }: { book: PendingBook; token: string }) {
  const [price, setPrice] = useState(book.submitted_price ? String(Math.round(book.submitted_price)) : '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [rowError, setRowError] = useState<string | null>(null)

  const displayPrice = price ? Number(price).toLocaleString('en-US') : ''

  function handlePriceChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPrice(e.target.value.replace(/[^0-9]/g, ''))
    setSaved(false)
  }

  async function handleSave() {
    const value = parseFloat(price)
    if (!value || value <= 0) {
      setRowError('Enter a valid price')
      return
    }
    setRowError(null)
    setSaving(true)
    setSaved(false)
    try {
      await submitBookstorePrice(token, book.id, value)
      setSaved(true)
    } catch (err) {
      setRowError(err instanceof Error ? err.message : 'Could not save this price')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-card">
      <div className="h-20 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
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
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <Input
          type="text"
          inputMode="numeric"
          value={displayPrice}
          onChange={handlePriceChange}
          placeholder="0"
          rightIcon={<span className="text-xs font-semibold text-gray-400">LAK</span>}
          error={rowError ?? undefined}
          className="w-32 text-right"
        />
        <Button size="sm" loading={saving} onClick={handleSave} icon={saved ? <Check className="h-4 w-4" /> : undefined}>
          {saved ? 'Saved' : 'Save'}
        </Button>
      </div>
    </div>
  )
}
