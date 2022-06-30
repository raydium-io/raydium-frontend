import hasProperty from '@/functions/judgers/compare'
import { isBoolean, isNumber, isObject, isString } from '@/functions/judgers/dateType'
import { RefObject, useState } from 'react'
import { useRecordedEffect } from './useRecordedEffect'
import { useScrollDegreeDetector } from './useScrollDegreeDetector'

type UseInfinateScrollOptions<T> = {
  items: T[]
  /** to compare old and new */
  getItemId?: (item: T) => string
  renderAllAtOnce?: boolean
  increaseRenderCount?: number /* default 30 */
  initRenderCount?: number /* default 30 */
  reachBottomMargin?: number /* default 50 */
  onReachBottom?: () => void
}

/**
 * with it , scrollable `<div>` can easily render infinite items
 *
 * @param ref scrill `<div>`'s ref
 * @param options options about infinite scroll
 * @returns render item count (component apply infinite scroll should only render "count" item)
 */
export function useInfinateScroll<T>(
  ref: RefObject<HTMLElement | null | undefined>,
  options: UseInfinateScrollOptions<T>
): number {
  const {
    increaseRenderCount = 30,
    initRenderCount = 30,
    reachBottomMargin = 50,
    items,
    getItemId = extractItemId,
    renderAllAtOnce,
    onReachBottom
  } = options
  const [renderItemLength, setRenderItemLength] = useState(initRenderCount)

  useScrollDegreeDetector(ref, {
    onReachBottom: () => {
      setRenderItemLength((n) => (n >= items.length ? items.length : n + increaseRenderCount))
      onReachBottom?.()
    },
    reachBottomMargin
  })

  // reset if Item's length has changed
  useRecordedEffect(
    ([prevAllItems]) => {
      const prevItemKeys = new Set(prevAllItems?.map((i) => getItemId(i)))
      const currItemKeys = items.map((i) => getItemId(i))
      if (prevAllItems && !renderAllAtOnce && currItemKeys.some((itemId) => !prevItemKeys.has(itemId))) {
        setRenderItemLength(initRenderCount)
      }
    },
    [items, renderAllAtOnce] as const
  )
  return renderItemLength
}

function extractItemId(item: unknown): string {
  if (isString(item) || isNumber(item) || isBoolean(item)) return String(item)
  if (isObject(item)) {
    if (hasProperty(item, 'id')) return extractItemId((item as { id: string }).id)
    if (hasProperty(item, 'key')) return extractItemId((item as { key: string }).key)
  }
  return ''
}
