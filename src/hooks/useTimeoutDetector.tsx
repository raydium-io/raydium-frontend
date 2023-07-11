import { useState } from 'react'
import { useEvent } from '@/hooks/useEvent'
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect'

/**
 * state change until time out
 */
export function useTimeoutDetector(ms: number, options?: { disabled?: boolean }) {
  const [restartCounter, setRestartCounter] = useState(0)
  const [isTimeout, setIsTimeout] = useState(false)

  useIsomorphicLayoutEffect(() => {
    if (options?.disabled) return
    const timer = setTimeout(() => {
      setIsTimeout(true)
    }, ms)
    return () => clearTimeout(timer)
  }, [ms, restartCounter, options?.disabled])

  const restart = useEvent(() => {
    setIsTimeout(false)
    setRestartCounter((n) => n + 1)
  })
  return { isTimeover: isTimeout, restart }
}
