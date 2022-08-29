import { RefObject, useEffect } from 'react'

/**
 * only itself(ref)
 *
 * this hooks build on assumption: resize of a child will resize his parent. so just observe it's parent node.
 *
 * @param ref
 * @param callback
 */
export default function useResizeObserver<El extends Element>(
  ref: RefObject<El | undefined | null> | undefined,
  callback?: (utilities: { entry: ResizeObserverEntry; el: El }) => unknown
) {
  useEffect(() => {
    if (!ref?.current) return
    const observer = new window.ResizeObserver((entries) => {
      entries.forEach((entry) => callback?.({ entry, el: entry.target as any }))
    })
    observer.observe(ref.current)
  }, [])
}
