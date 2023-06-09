import { useEffect, useRef } from 'react'
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect'

import { useRecordedEffect } from './useRecordedEffect'

/**
 * like useEffect
 *
 * cost:
 * - 1 `React.useEffect()`
 * - 3 `React.useRef()`
 */
export default function useInit(
  effectFn: () => ((...params: any) => void) | void,
  options?: { effectMethod: 'effect' | 'recordEffect' | 'isoLayoutEffect' }
) {
  const hasInited = useRef(false)
  const method =
    options?.effectMethod === 'recordEffect'
      ? useRecordedEffect
      : options?.effectMethod === 'isoLayoutEffect'
      ? useIsomorphicLayoutEffect
      : useEffect
  method(() => {
    if (!hasInited.current) {
      hasInited.current = true
      return effectFn()
    }
  }, [])
}
