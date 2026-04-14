import { useState, useCallback } from 'react'
import { useBookStore } from '../store/bookStore'

interface UseProgressOptions {
  bookId: string
}

export function useProgress({ bookId }: UseProgressOptions) {
  const [progress, setProgressState] = useState(0)
  const [currentLocation, setCurrentLocation] = useState('')

  const updateBookProgress = useBookStore((state) => state.updateBookProgress)
  const updateTXTProgress = useBookStore((state) => state.updateTXTProgress)

  const setProgress = useCallback(
    (newProgress: number) => {
      const clampedProgress = Math.max(0, Math.min(100, newProgress))
      setProgressState(clampedProgress)
      updateTXTProgress(bookId, {
        currentPage: Math.round(clampedProgress),
        characterOffset: Math.round(clampedProgress),
      })
    },
    [bookId, updateTXTProgress]
  )

  const updateLocation = useCallback(
    (location: string) => {
      setCurrentLocation(location)
      updateBookProgress(bookId, location)
    },
    [bookId, updateBookProgress]
  )

  return {
    progress,
    currentLocation,
    setProgress,
    updateLocation,
  }
}