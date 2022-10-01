import { inClient } from '@/functions/judgers/isSSR'
import { requestIdleCallback } from '@/functions/lazyMap'
import { AnyFn } from '@/types/constants'
import { useEffect, useRef } from 'react'

/**
 * can only use this when in Window
 */
export function useIdleEffect(effect: () => any, dependenceList?: any[]) {
  const cleanFn = useRef<AnyFn>()
  useEffect(() => {
    if (!inClient) return
    requestIdleCallback(() => {
      if (typeof cleanFn.current === 'function') cleanFn.current()
      const returnedCleanFn = effect()
      cleanFn.current = returnedCleanFn
    })
  }, dependenceList)
}
