import { RefObject, useCallback, useEffect, useState } from 'react'

import { inServer } from '@/functions/judgers/isSSR'

export function useSwapTwoElements(
  swap1: RefObject<HTMLDivElement | null>,
  swap2: RefObject<HTMLDivElement | null>,
  options?: { defaultHasWrapped?: boolean }
): [hasWrapped: boolean, controller: { toggleSwap: () => void; resetSwapPosition(): void }] {
  const transitionValue = 'all .4s cubic-bezier(0.4, 0, 0.2, 1)'
  const [hasSwrapped, setHasWrapped] = useState(options?.defaultHasWrapped ?? false)

  function applyDefault() {
    if (inServer) return
    if (!options?.defaultHasWrapped) return
    const dom1 = swap1.current
    const dom2 = swap2.current
    if (!dom1 || !dom2) return
    const dom1Rect = dom1.getBoundingClientRect()
    const dom2Rect = dom2.getBoundingClientRect()
    const distance = dom2Rect.top - dom1Rect.top
    const dom1IsAboveDom2 = dom1Rect.top < dom2Rect.top ? 1 : -1

    dom1.style.setProperty('transition', '')
    dom2.style.setProperty('transition', '')
    dom1.style.setProperty('transform', `translateY(${distance * dom1IsAboveDom2}px)`)
    dom2.style.setProperty('transform', `translateY(${-distance * dom1IsAboveDom2}px)`)
  }
  useEffect(applyDefault, [])

  const toggleSwap = useCallback(() => {
    const dom1 = swap1.current
    const dom2 = swap2.current
    if (!dom1 || !dom2) return
    const dom1Rect = dom1.getBoundingClientRect()
    const dom2Rect = dom2.getBoundingClientRect()

    const distance = dom2Rect.top - dom1Rect.top

    const dom1IsAboveDom2 = dom1Rect.top < dom2Rect.top ? 1 : -1
    dom1.style.setProperty('transition', transitionValue)
    dom2.style.setProperty('transition', transitionValue)
    if (hasSwrapped) {
      dom1.style.setProperty('transform', `translateY(0px)`)
      dom2.style.setProperty('transform', `translateY(0px)`)
      setHasWrapped(false)
    } else {
      dom1.style.setProperty('transform', `translateY(${distance * dom1IsAboveDom2}px)`)
      dom2.style.setProperty('transform', `translateY(${-distance * dom1IsAboveDom2}px)`)
      setHasWrapped(true)
    }
  }, [hasSwrapped, swap1, swap2])

  const resetSwapPosition = useCallback(() => {
    const dom1 = swap1.current
    const dom2 = swap2.current
    if (!dom1 || !dom2) return
    dom1.style.setProperty('transition', transitionValue)
    dom2.style.setProperty('transition', transitionValue)
    dom1.style.setProperty('transform', `translateY(0px)`)
    dom2.style.setProperty('transform', `translateY(0px)`)
  }, [hasSwrapped, swap1, swap2])

  useEffect(() => {
    const dom1 = swap1.current
    const dom2 = swap2.current
    const hidePointerEvents = () => {
      dom1?.style.setProperty('pointerEvents', 'none')
    }
    const resetPointEvents = () => {
      dom1?.style.setProperty('pointerEvents', '')
    }
    dom1?.addEventListener('transitionstart', hidePointerEvents)
    dom1?.addEventListener('transitionend', resetPointEvents)
    dom2?.addEventListener('transitionstart', hidePointerEvents)
    dom2?.addEventListener('transitionend', resetPointEvents)

    return () => {
      dom1?.removeEventListener('transitionstart', hidePointerEvents)
      dom1?.removeEventListener('transitionend', resetPointEvents)
      dom2?.removeEventListener('transitionstart', hidePointerEvents)
      dom2?.removeEventListener('transitionend', resetPointEvents)
    }
  }, [swap1, swap2])

  return [hasSwrapped, { toggleSwap, resetSwapPosition }]
}
