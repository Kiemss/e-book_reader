import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import localforage from 'localforage'
import type { Book } from '../types'

interface BookStoreState {
  books: Book[];
  addBook: (book: Book) => void;
  removeBook: (id: string) => void;
  updateBookProgress: (id: string, cfi: string) => void;
}

export const useBookStore = create<BookStoreState>()(
  persist(
    (set) => ({
      books: [],
      addBook: (book) => set((state) => {
        const existing = state.books.find(b => b.id === book.id);
        if (existing) return state; // Avoid duplicate
        return { books: [...state.books, book] };
      }),
      removeBook: (id) => set((state) => ({
        books: state.books.filter(b => b.id !== id)
      })),
      updateBookProgress: (id, cfi) => set((state) => ({
        books: state.books.map(b => b.id === id ? { ...b, lastReadCfi: cfi } : b)
      }))
    }),
    {
      name: 'anx-book-storage',
      storage: createJSONStorage(() => localforage),
    }
  )
)