import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect '
import { useRef } from 'react'

/**
 * like addEventListener option:once
 */
export function useStoppableEffect(fn: (stopEffect: () => void) => any, dependenceList: any[]) {
  const stop = useRef(false)
  useIsomorphicLayoutEffect(() => {
    if (stop.current) return
    return fn(() => {
      stop.current = true
    })
  }, dependenceList)
}
