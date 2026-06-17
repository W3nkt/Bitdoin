import { createContext, useContext, type ReactNode } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem } from '@/types'

interface CartState {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (bookId: string, bookstoreId: string) => void
  updateQty: (bookId: string, bookstoreId: string, qty: number) => void
  clearCart: () => void
  totalItems: () => number
  subtotal: () => number
}

const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (newItem) => set((state) => {
        const existing = state.items.find(
          i => i.book_id === newItem.book_id && i.bookstore_id === newItem.bookstore_id
        )
        if (existing) {
          return {
            items: state.items.map(i =>
              i.book_id === newItem.book_id && i.bookstore_id === newItem.bookstore_id
                ? { ...i, quantity: i.quantity + newItem.quantity }
                : i
            )
          }
        }
        return { items: [...state.items, newItem] }
      }),

      removeItem: (bookId, bookstoreId) => set((state) => ({
        items: state.items.filter(i => !(i.book_id === bookId && i.bookstore_id === bookstoreId))
      })),

      updateQty: (bookId, bookstoreId, qty) => set((state) => {
        if (qty <= 0) {
          return { items: state.items.filter(i => !(i.book_id === bookId && i.bookstore_id === bookstoreId)) }
        }
        return {
          items: state.items.map(i =>
            i.book_id === bookId && i.bookstore_id === bookstoreId ? { ...i, quantity: qty } : i
          )
        }
      }),

      clearCart: () => set({ items: [] }),

      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      subtotal: () => get().items.reduce((sum, i) => {
        const price = i.unit_price ?? 0
        return sum + price * i.quantity
      }, 0),
    }),
    { name: 'pwen-cart' }
  )
)

const CartContext = createContext<CartState | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const store = useCartStore()
  return <CartContext.Provider value={store}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}

export { useCartStore }
