import { createRef, MutableRefObject, useRef } from 'react'

import { isExist, isNullish } from '@/functions/judgers/nil'

/**
 * @return proxied { current: xxx }
 */
export default function useCallbackRef<T = unknown>(options?: {
  defaultValue?: T
  onAttach?: (current: T) => void
  onDetach?: () => void
  onChange?: (current: T, prev: T) => void
}): MutableRefObject<T> {
  const originalRef = useRef<T>(options?.defaultValue ?? null)
  const proxied = useRef(
    new Proxy(originalRef, {
      set(target, p, value) {
        if (p === 'current' && isExist(value)) {
          if (isExist(value)) options?.onAttach?.(value)
          if (!isExist(value)) options?.onDetach?.()
          const prev = target.current as T
          options?.onChange?.(value, prev)
        }
        if (p === 'current' && !isExist(value)) {
          options?.onDetach?.()
        }
        Reflect.set(target, p, value)
        return true
      }
    })
  )
  // @ts-expect-error  use proxied must typed not elegant
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
