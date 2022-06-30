import { RefObject, useEffect, useRef, useState } from 'react'

import isClientSide from '@/functions/judgers/isSSR'

/**
 * auto-add --is-scrolling, which will be used by frosted-glass
 */
export function useDocumentScrollActionDetector() {
  useEffect(() => {
    if (!('document' in globalThis)) return
    let timeoutId
    document.addEventListener(
      'scroll',
      () => {
        globalThis.document.body.style.setProperty('--is-scrolling', '1')
        globalThis.clearTimeout(timeoutId)
        timeoutId = globalThis.setTimeout(() => {
          globalThis.document.body.style.setProperty('--is-scrolling', '0')
        }, 500)
      },
      { passive: true }
    )
  }, [])
}

export default function useScrollActionDetector(
  /** if not specified , it will be document by default  */
  elRef: RefObject<HTMLElement | null>
) {
  if (!isClientSide) return

  // --is-scrolling
  useEffect(() => {
    let timeoutId

    const scrollingDetector = () => {
      elRef.current?.style.setProperty('--is-scrolling', '1')
      globalThis.clearTimeout(timeoutId)
      timeoutId = globalThis.setTimeout(() => {
        elRef.current?.style.setProperty('--is-scrolling', '0')
      }, 500)
    }
    elRef.current?.addEventListener('scroll', scrollingDetector, { passive: true })
    return () => {
      elRef.current?.removeEventListener('scroll', scrollingDetector)
      globalThis.clearTimeout(timeoutId)
    }
  }, [elRef])

  const [refreshDetector, updateScrollDetector] = useState(0)
  const resizeObserver = useRef<ResizeObserver | undefined>(
    'ResizeObserver' in globalThis
      ? new globalThis.ResizeObserver(() => {
          updateScrollDetector((n) => n + 1)
        })
      : undefined
  )

  // observe the element if it load more and more children
  useEffect(() => {
    if (!elRef.current) return () => {}
    resizeObserver.current?.observe(elRef.current)
    return () => elRef.current && resizeObserver.current?.unobserve(elRef.current)
  }, [elRef])

  // --scroll-top & --scroll-height & --client-eight
  useEffect(() => {
    const scrollingPropertyDetector = () => {
      const { scrollTop, scrollHeight, clientHeight } = elRef.current!
      elRef.current?.style.setProperty('--scroll-top', `${scrollTop}`)
      elRef.current?.style.setProperty('--scroll-height', `${scrollHeight}`)
      elRef.current?.style.setProperty('--client-height', `${clientHeight}`)
    }
    elRef.current?.addEventListener('scroll', scrollingPropertyDetector, { passive: true })
    return () => elRef.current?.removeEventListener('scroll', scrollingPropertyDetector)
  }, [elRef, refreshDetector])
}
