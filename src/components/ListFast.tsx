import React, {
  ComponentProps,
  CSSProperties,
  Fragment,
  ReactNode,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import addPropsToReactElement from '@/functions/react/addPropsToReactElement'
import mergeRef from '@/functions/react/mergeRef'
import { pickReactChildren } from '@/functions/react/pickChild'
import { useRecordedEffect } from '@/hooks/useRecordedEffect'

import Col from './Col'
import { FadeIn } from './FadeIn'

function useInfiniteScrollDirector(
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

export default function ListFast<T>({
  increaseRenderCount = 30,
  initRenderCount = 30,
  reachBottomMargin = 50,
  renderAllAtOnce,
  sourceData,
  renderItem,
  getKey,

  domRef,
  className,
  style
}: {
  increaseRenderCount?: number
  initRenderCount?: number
  reachBottomMargin?: number
  renderAllAtOnce?: boolean

  sourceData: T[]
  renderItem: (item: T, index: number) => ReactNode
  getKey: (item: T, index: number) => string | number

  domRef?: RefObject<any>
  className?: string
  style?: CSSProperties
}) {
  // all need to render items
  const allListItems = sourceData
  // actually showed itemLength
  const [renderItemLength, setRenderItemLength] = useState(renderAllAtOnce ? allListItems.length : initRenderCount)

  const listRef = useRef<HTMLDivElement>(null)

  useInfiniteScrollDirector(listRef, {
    onReachBottom: () => {
      setRenderItemLength((n) => (n >= allListItems.length ? allListItems.length : n + increaseRenderCount))
    },
    reachBottomMargin: reachBottomMargin
  })

  // attach some css-variables (too slow)
  // useScrollDetector(listRef)

  // reset if Item's length has changed
  useRecordedEffect(
    ([prevAllItems]) => {
      const prevAllItemKeys = new Set(prevAllItems?.map(getKey))
      const currAllItemKeys = allListItems.map(getKey)
      if (prevAllItems && !renderAllAtOnce && currAllItemKeys.some((key) => !prevAllItemKeys.has(key))) {
        setRenderItemLength(initRenderCount)
      }
    },
    [allListItems, renderAllAtOnce] as const
  )

  return (
    <Col
      domRef={mergeRef(domRef, listRef)}
      className={`List overflow-y-scroll ${className ?? ''}`}
      style={{ ...style, contentVisibility: 'auto' }}
    >
      {allListItems.slice(0, renderItemLength).map((d, idx) => (
        <Fragment key={getKey(d, idx)}>{renderItem(d, idx)}</Fragment>
      ))}
    </Col>
  )
}
