import { useMemo, useState } from 'react'

/**
 * !!! only for DOM element (props:ref on `<div>`)\
 * like ref but actually it's state, so inner-hooks can re-render
 *
 * @returns React RefObject-like
 */
export function useElementStateRef<T>() {
  const [element, setElement] = useState<T | null>(null)
  const fakeRef = useMemo(
    () => ({
      get current() {
        return element
      },
      set current(newElement: T | null) {
        setElement(newElement)
      }
    }),
    [element]
  )

  return fakeRef
}
