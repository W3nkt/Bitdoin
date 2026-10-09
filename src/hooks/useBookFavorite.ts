import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

// A guest who taps the heart is asked to sign in first. The book is remembered
// here so it still gets saved after Google/Facebook sign-in reloads the page.
const PENDING_KEY = 'bitdoin_pending_favorite'

export function rememberPendingFavorite(bookId: string | null) {
  try {
    if (bookId) sessionStorage.setItem(PENDING_KEY, bookId)
    else sessionStorage.removeItem(PENDING_KEY)
  } catch {
    // Blocked storage only means the heart must be tapped again after signing in.
  }
}

function takePendingFavorite(bookId: string) {
  try {
    if (sessionStorage.getItem(PENDING_KEY) !== bookId) return false
    sessionStorage.removeItem(PENDING_KEY)
    return true
  } catch {
    return false
  }
}

/** Whether the signed-in customer has favorited a book, and a way to change it. */
export function useBookFavorite(bookId: string | undefined, onSavedAfterSignIn?: () => void) {
  const { supabaseUser } = useAuth()
  const userId = supabaseUser?.id
  const queryClient = useQueryClient()
  const queryKey = ['book-favorite', userId, bookId]

  const { data: isFavorite = false } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('book_favorites')
        .select('book_id')
        .eq('book_id', bookId!)
        .maybeSingle()
      if (error) throw error
      return !!data
    },
    enabled: !!userId && !!bookId,
  })

  const mutation = useMutation({
    mutationFn: async (favorite: boolean) => {
      // user_id defaults to auth.uid() in the database.
      const { error } = favorite
        ? await supabase.from('book_favorites').upsert({ book_id: bookId! }, { onConflict: 'user_id,book_id', ignoreDuplicates: true })
        : await supabase.from('book_favorites').delete().eq('book_id', bookId!)
      if (error) throw error
    },
    onMutate: favorite => {
      const previous = queryClient.getQueryData<boolean>(queryKey)
      queryClient.setQueryData(queryKey, favorite)
      return { previous }
    },
    onError: (_error, _favorite, context) => queryClient.setQueryData(queryKey, context?.previous ?? false),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['book-favorite', userId] }),
  })

  // Finish the favorite a guest started once they come back signed in.
  useEffect(() => {
    if (!userId || !bookId || !takePendingFavorite(bookId)) return
    mutation.mutate(true, { onSuccess: onSavedAfterSignIn })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, bookId])

  return {
    isSignedIn: !!userId,
    isFavorite,
    isSaving: mutation.isPending,
    setFavorite: (favorite: boolean) => mutation.mutateAsync(favorite),
  }
}
