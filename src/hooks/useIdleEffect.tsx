import { inClient } from '@/functions/judgers/isSSR'
import { AnyFn } from '@/types/constants'
import { useEffect, useRef } from 'react'

/**
 * can only use this when in Window
 */
export function useIdleEffect(effect: () => any, dependenceList?: any[]) {
  const cleanFn = useRef<AnyFn>()
  useEffect(() => {
    if (!inClient) return
    window.requestIdleCallback(() => {
      cleanFn.current?.()
      const returnedCleanFn = effect()
      cleanFn.current = returnedCleanFn
    })
  }, dependenceList)
}
