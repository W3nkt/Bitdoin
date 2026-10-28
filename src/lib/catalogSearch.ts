import { supabase } from '@/lib/supabase'
import type { Book, SearchFilters } from '@/types'

interface CatalogResult { data: Book[]; count: number }

function selectedCategoryIds(filters: SearchFilters) {
  return [...new Set(filters.category_ids?.length ? filters.category_ids : filters.category_id ? [filters.category_id] : [])]
}

async function fetchPage(filters: SearchFilters, sort: string, categoryId: string | null, from: number, size: number): Promise<CatalogResult> {
  const { data, error } = await supabase.rpc('search_books', {
    p_query: filters.query?.trim() || null, p_category_id: categoryId,
    p_language: filters.language || null, p_isbn: filters.isbn?.trim() || null,
    p_sort: sort, p_offset: from, p_limit: size,
  })
  if (error) throw error
  const result = data as { books?: Book[]; count?: number } | null
  return { data: result?.books ?? [], count: Number(result?.count ?? 0) }
}

/** How many books match, without loading a page of them (the filter sheet's live "Show N books"). */
export async function countCatalogBooks(filters: SearchFilters, sort: string): Promise<number> {
  const categoryIds = selectedCategoryIds(filters)
  if (categoryIds.length < 2) return (await fetchPage(filters, sort, categoryIds[0] ?? null, 0, 1)).count
  const counts = await Promise.all(categoryIds.map(id => fetchPage(filters, sort, id, 0, 1)))
  return counts.reduce((total, result) => total + result.count, 0)
}

/** Keep the existing server search/ranking for single and combined category links. */
export async function searchCatalogBooks(filters: SearchFilters, sort: string, offset: number, limit: number): Promise<CatalogResult> {
  const categoryIds = selectedCategoryIds(filters)
  if (categoryIds.length < 2) return fetchPage(filters, sort, categoryIds[0] ?? null, offset, limit)

  // Each book belongs to one category, so the individual counts form an exact union.
  const counts = await Promise.all(categoryIds.map(id => fetchPage(filters, sort, id, 0, 1)))
  const count = counts.reduce((total, result) => total + result.count, 0)
  if (count <= offset) return { data: [], count }

  // Filter ranked batches only until this page is full. This preserves the server's
  // bestseller/title ordering without incorrectly paginating each category separately.
  const selectedIds = new Set(categoryIds)
  const books: Book[] = []
  let matched = 0
  let cursor = 0
  while (books.length < limit) {
    const batch = await fetchPage(filters, sort, null, cursor, 50)
    for (const book of batch.data) {
      if (!book.category_id || !selectedIds.has(book.category_id)) continue
      if (matched++ >= offset) books.push(book)
      if (books.length === limit) break
    }
    cursor += batch.data.length
    if (!batch.data.length || cursor >= batch.count) break
  }
  return { data: books, count }
}
