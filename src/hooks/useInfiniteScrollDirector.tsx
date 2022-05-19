import { RefObject, useCallback, useEffect, useRef } from 'react'

export function useInfiniteScrollDirector(
  ref: RefObject<HTMLElement | null | undefined>,
  options?: {
    onReachBottom?: () => void
    reachBottomMargin?: number
  }
) {
  const isReachedBottom = useRef(false)
  const onScroll = useCallback(() => {
    if (!ref.current) return
    const { scrollHeight, scrollTop, clientHeight } = ref.current
    const isNearlyReachBottom = scrollTop + clientHeight + (options?.reachBottomMargin ?? 0) >= scrollHeight

    if (isNearlyReachBottom && !isReachedBottom.current) {
      options?.onReachBottom?.()
      isReachedBottom.current = true
    }

    if (!isNearlyReachBottom && isReachedBottom.current) {
      isReachedBottom.current = false
    }
  }, [ref, options])

  useEffect(() => {
    onScroll()
    ref.current?.addEventListener('scroll', onScroll, { passive: true })
    return () => ref.current?.removeEventListener('scroll', onScroll)
  }, [ref, onScroll])
}
