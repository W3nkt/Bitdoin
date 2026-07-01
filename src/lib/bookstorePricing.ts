import { supabase } from '@/lib/supabase'

export interface PendingBook {
  id: string
  title: string
  author?: string
  publisher?: string
  cover_image_url?: string
  submitted_price?: number
}

export interface BookstorePendingBooks {
  bookstore: { id: string; name: string }
  books: PendingBook[]
}

export function bookstorePriceLinkUrl(token: string): string {
  return `${window.location.origin}${window.location.pathname}#/bookstore-pricing/${token}`
}

export async function generateBookstorePriceLink(bookstoreId: string): Promise<string> {
  const { data, error } = await supabase.rpc('generate_bookstore_price_link', { p_bookstore_id: bookstoreId })
  if (error) throw new Error(error.message)
  return data as string
}

export async function getPendingBooksForToken(token: string): Promise<BookstorePendingBooks> {
  const { data, error } = await supabase.rpc('get_bookstore_pending_books', { p_token: token })
  if (error) throw new Error(error.message)
  return data as BookstorePendingBooks
}

export async function submitBookstorePrice(token: string, bookId: string, price: number): Promise<{ final_price: number }> {
  const { data, error } = await supabase.rpc('submit_bookstore_price', {
    p_token: token,
    p_book_id: bookId,
    p_price: price,
  })
  if (error) throw new Error(error.message)
  return data as { final_price: number }
}
