import { createRef, useRef } from 'react'

import { isExist, isNullish } from '@/functions/judgers/nil'

/**
 * @return proxied { current: xxx }
 */
export default function useCallbackRef<T = unknown>(callbacks?: {
  onAttach?: (current: T) => void
  onDetach?: () => void
}) {
  const originalRef = useRef<T>(null)
  const proxied = useRef(
    new Proxy(originalRef, {
      set(target, p, value) {
        if (p === 'current' && isExist(value)) {
          callbacks?.onAttach?.(value)
        }
        if (p === 'current' && !isExist(value)) {
          callbacks?.onDetach?.()
        }
        Reflect.set(target, p, value)
        return true
      }
    })
  )
  return proxied.current
}

export function createCallbackRef<T = unknown>(callback: (current: T) => void) {
  const originalRef = createRef<T>()
  return new Proxy(originalRef, {
    set(target, p, value) {
      callback(value)
      return Reflect.set(target, p, value)
    }
  })
}
