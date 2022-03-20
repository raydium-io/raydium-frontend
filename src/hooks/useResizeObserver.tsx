import { RefObject, useEffect } from 'react'

/**
 * only itself(ref)
 *
 * this hooks build on assumption: resize of a child will resize his parent. so just observe it's parent node.
 *
 * @param ref
 * @param callback
 */
export default function useResizeObserver(
  ref: RefObject<HTMLElement | undefined | null> | undefined,
  callback?: (entry: ResizeObserverEntry) => unknown
) {
  useEffect(() => {
    if (!ref?.current) return
    const observer = new window.ResizeObserver((entries) => {
      entries.forEach((entry) => callback?.(entry))
    })
    observer.observe(ref.current)
  }, [])
}
