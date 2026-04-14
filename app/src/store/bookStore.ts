import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import localforage from 'localforage'
import type { Book, Bookmark, TXTProgress } from '../types'

interface BookStoreState {
  books: Book[];
  addBook: (book: Book) => void;
  removeBook: (id: string) => void;
  updateBookProgress: (id: string, cfi: string) => void;
  updateTXTProgress: (id: string, progress: TXTProgress) => void;
  addBookmark: (bookId: string, bookmark: Bookmark) => void;
  removeBookmark: (bookId: string, cfi: string) => void;
}

export const useBookStore = create<BookStoreState>()(
  persist(
    (set) => ({
      books: [],
      addBook: (book) => set((state) => {
        const existing = state.books.find(b => b.id === book.id);
        if (existing) return state;
        return { books: [...state.books, book] };
      }),
      removeBook: (id) => set((state) => ({
        books: state.books.filter(b => b.id !== id)
      })),
      updateBookProgress: (id, cfi) => set((state) => ({
        books: state.books.map(b => b.id === id ? { ...b, lastReadCfi: cfi } : b)
      })),
      updateTXTProgress: (id, progress) => set((state) => ({
        books: state.books.map(b => b.id === id ? { ...b, txtProgress: progress } : b)
      })),
      addBookmark: (bookId, bookmark) => set((state) => ({
        books: state.books.map(b => {
          if (b.id === bookId) {
            const bookmarks = b.bookmarks || [];
            if (bookmarks.find(bm => bm.cfi === bookmark.cfi)) return b;
            return { ...b, bookmarks: [...bookmarks, bookmark] };
          }
          return b;
        })
      })),
      removeBookmark: (bookId, cfi) => set((state) => ({
        books: state.books.map(b => {
          if (b.id === bookId && b.bookmarks) {
            return { ...b, bookmarks: b.bookmarks.filter(bm => bm.cfi !== cfi) };
          }
          return b;
        })
      }))
    }),
    {
      name: 'anx-book-storage',
      storage: createJSONStorage(() => localforage),
    }
  )
)
