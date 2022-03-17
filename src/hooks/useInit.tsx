import { useRef } from 'react'

import { useRecordedEffect } from './useRecordedEffect'

/**
 * like useEffect
 *
 * cost:
 * - 1 `React.useEffect()`
 * - 3 `React.useRef()`
 */
export default function useInit(effectFn: () => ((...params: any) => void) | void) {
  const hasInited = useRef(false)
  useRecordedEffect(() => {
    if (!hasInited.current) {
      hasInited.current = true
      return effectFn()
    }
  }, [])
}
