import { useState, useCallback } from 'react'
import { useBookStore } from '../store/bookStore'

export interface Bookmark {
  id: string
  label: string
  text: string
  location: string
  time: number
}

interface UseBookmarkOptions {
  bookId: string
}

export function useBookmark({ bookId }: UseBookmarkOptions) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [currentLocation, setCurrentLocation] = useState<string>('')

  const addBookmarkStore = useBookStore((state) => state.addBookmark)
  const removeBookmarkStore = useBookStore((state) => state.removeBookmark)

  const isBookmarked = bookmarks.some((b) => b.location === currentLocation)

  const addBookmark = useCallback(
    (label: string, text: string, location: string) => {
      const newBookmark: Bookmark = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        label,
        text,
        location,
        time: Date.now(),
      }
      setBookmarks((prev) => [...prev, newBookmark])
      addBookmarkStore(bookId, {
        cfi: location,
        label,
        text,
        time: newBookmark.time,
      })
      return newBookmark
    },
    [bookId, addBookmarkStore]
  )

  const removeBookmark = useCallback(
    (id: string) => {
      const bookmark = bookmarks.find((b) => b.id === id)
      if (bookmark) {
        setBookmarks((prev) => prev.filter((b) => b.id !== id))
        removeBookmarkStore(bookId, bookmark.location)
      }
    },
    [bookId, bookmarks, removeBookmarkStore]
  )

  const toggleBookmark = useCallback(
    (label: string, text: string) => {
      if (isBookmarked && currentLocation) {
        const bookmark = bookmarks.find((b) => b.location === currentLocation)
        if (bookmark) {
          removeBookmark(bookmark.id)
        }
      } else if (currentLocation) {
        addBookmark(label, text, currentLocation)
      }
    },
    [isBookmarked, currentLocation, bookmarks, addBookmark, removeBookmark]
  )

  const goToBookmark = useCallback((bookmark: Bookmark) => {
    setCurrentLocation(bookmark.location)
  }, [])

  const setLocation = useCallback((location: string) => {
    setCurrentLocation(location)
  }, [])

  return {
    bookmarks,
    currentLocation,
    isBookmarked,
    addBookmark,
    removeBookmark,
    toggleBookmark,
    goToBookmark,
    setLocation,
  }
}