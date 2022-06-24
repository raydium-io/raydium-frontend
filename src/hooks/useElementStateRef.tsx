import { useState } from 'react'

/**
 * !!! only for DOM element (props:ref on `<div>`)\
 * like ref but actually it's state, so inner-hooks can re-render
 *
 * @returns React RefObject-like
 */
export function useElementStateRef<T>() {
  const [element, setElement] = useState<T | null>(null)
  return {
    get current() {
      return element
    },
    set current(newElement: T | null) {
      setElement(newElement)
    }
  }
}
