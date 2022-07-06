import { useRef, useLayoutEffect, useCallback } from 'react'
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect '

/**@see https://juejin.cn/post/7094453522535546893 */
export function useEvent(handler) {
  const handlerRef = useRef<(...args: any[]) => any>()

  useIsomorphicLayoutEffect(() => {
    handlerRef.current = handler
  })

  return useCallback((...args) => {
    const fn = handlerRef.current
    return fn?.(...args)
  }, [])
}
