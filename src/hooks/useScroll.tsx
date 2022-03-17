import { RefObject, useEffect, useRef, useState } from 'react'

import isHTMLElement from '@/functions/dom/isHTMLElement'

import useResizeObserver from './useResizeObserver'

interface UseScrollListenerOptions {
  disable?: boolean
  /**
   * invoke the onScroll callback initly
   */
  init?: boolean
  onScroll?: (event: { target: HTMLElement; scrollDirection: 'down' | 'up' | 'none' }) => void
}

/**
 * @hook scroll event
 * better than addEventListener('scroll', cb)
 *
 * @example
 * useEventScroll(contentRef, {
 *   disable: isScrollingByThumb,
 *   init: true,
 *   onScroll: () => {
 *     attachScrollbarThumb('height')
 *     attachScrollbarThumb('top')
 *   }
 * })
 */
export default function useScroll(
  ref: RefObject<HTMLElement | null>,
  { disable = false, init = false, onScroll }: UseScrollListenerOptions
) {
  const scrollableElement = useRef<HTMLElement | null>(null)
  const [resizeTime, setResizeTime] = useState(0)
  const addResize = () => setResizeTime((n) => n + 1)
  const prevScrollTop = useRef(0)

  const recordScroll = (ev: { target: HTMLElement }) => {
    const currentScrollTop = ev.target.scrollTop
    const scrollYDirection = currentScrollTop - prevScrollTop.current
    onScroll?.({
      target: ev.target,
      scrollDirection: scrollYDirection > 0 ? 'down' : scrollYDirection < 0 ? 'up' : 'none'
    })
    prevScrollTop.current = currentScrollTop
  }

  useEffect(() => {
    if (!init) return
    recordScroll({ target: ref.current! })
  }, [init])

  useEffect(() => {
    if (disable || !ref.current) return
    prevScrollTop.current = ref.current.scrollTop ?? 0
    scrollableElement.current = findFirstScrollable(ref.current)

    // TODO: scroll event can cause performance issue
    scrollableElement.current?.addEventListener('scroll', recordScroll as any)
    return () => scrollableElement.current?.removeEventListener('scroll', recordScroll as any)
  }, [disable, resizeTime])

  useResizeObserver(ref, () => {
    scrollableElement.current = findFirstScrollable(ref.current!)
    addResize()
  })
}

/**
 * find first child element which can scroll itsxelf.
 * or it will return null
 */
function findFirstScrollable(node: HTMLElement): null | HTMLElement {
  if (!isHTMLElement(node)) return null
  if (node.scrollHeight !== node.clientHeight) return node
  else {
    for (const child of node.children) {
      const result = findFirstScrollable(child as HTMLElement)
      if (!isHTMLElement(result)) continue
      else return result
    }
    return null
  }
}
