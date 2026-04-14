import { useState, useEffect, useCallback, useRef } from 'react'

interface UseIdleOptions {
  timeout?: number
  enabled?: boolean
}

export function useIdle({ timeout = 3000, enabled = true }: UseIdleOptions = {}) {
  const [isIdle, setIsIdle] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const reset = useCallback(() => {
    setIsIdle(false)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    if (enabled) {
      timerRef.current = setTimeout(() => {
        setIsIdle(true)
      }, timeout)
    }
  }, [timeout, enabled])

  useEffect(() => {
    if (!enabled) return

    reset()

    const handleMouseMove = () => reset()
    const handleClick = () => reset()
    const handleKeydown = () => reset()

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('click', handleClick)
    document.addEventListener('keydown', handleKeydown)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleKeydown)
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [reset, enabled])

  return { isIdle, resetIdle: reset }
}