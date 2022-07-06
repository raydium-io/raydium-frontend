import { useEffect, useRef } from 'react'

import { useRecordedEffect } from './useRecordedEffect'

/**
 * like useEffect
 *
 * cost:
 * - 1 `React.useEffect()`
 * - 3 `React.useRef()`
 */
export default function useUpdate<T extends any[]>(
  effectFn: () => ((...params: any) => void) | void,
  dependenceList: T
) {
  const hasInited = useRef(false)
  useEffect(() => {
    if (!hasInited.current) {
      hasInited.current = true
    } else {
      return effectFn()
    }
  }, dependenceList)
}
