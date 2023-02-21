import { ElementSingle, getSingleElement } from '@/functions/react/getElementsFromRef'
import { useEffect, useRef } from 'react'
import { useEvent } from './useEvent'

/**
 * only itself(ref)
 *
 * this hooks build on assumption: resize of a child will resize his parent. so just observe it's parent node.
 *
 * @param ref
 * @param callback
 */
export default function useResizeObserver<El extends HTMLElement>(
  ref: ElementSingle,
  callback?: (utilities: { entry: ResizeObserverEntry; el: El }) => unknown
): { observe: (el: HTMLElement | undefined) => void } {
  const observer = useRef(
    'ResizeObserver' in globalThis
      ? new globalThis.ResizeObserver((entries) => {
          entries.forEach((entry) => callback?.({ entry, el: entry.target as any }))
        })
      : undefined
  )
  useEffect(() => {
    const el = getSingleElement(ref)
    if (el) observer.current?.observe(el)
  }, [])

  const observe = useEvent((el: HTMLElement | undefined) => {
    if (el) observer.current?.observe(el)
  })
  return { observe }
}
