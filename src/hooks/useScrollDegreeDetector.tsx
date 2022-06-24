import { RefObject, useCallback, useEffect, useRef } from 'react'

export type UseScrollDegreeDetectorOptions = {
  /** some times ref will be attach not very quick (like in <Popover> , panel's ref won't be attached, untill element created) */
  rebindEveryRerender?: boolean
  onReachBottom?: () => void
  reachBottomMargin?: number
}

export function useScrollDegreeDetector(
  ref: RefObject<HTMLElement | null | undefined>,
  options?: UseScrollDegreeDetectorOptions
) {
  const isReachedBottom = useRef(false)

  const onScroll = () => {
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
  }

  useEffect(
    () => {
      onScroll()
      ref.current?.addEventListener('scroll', onScroll, { passive: true })
      return () => ref.current?.removeEventListener('scroll', onScroll)
    },
    options?.rebindEveryRerender ? undefined : []
  )
}
