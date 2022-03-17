import React, {
  ComponentProps, CSSProperties, ReactNode, RefObject, useCallback, useEffect, useMemo, useRef, useState
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

export default function List({
  increaseRenderCount = 30,
  initRenderCount = 30,
  reachBottomMargin = 50,
  renderAllAtOnce,

  domRef,
  className,
  children,
  style
}: {
  increaseRenderCount?: number
  initRenderCount?: number
  reachBottomMargin?: number
  renderAllAtOnce?: boolean

  domRef?: RefObject<any>
  className?: string
  children?: ReactNode
  style?: CSSProperties
}) {
  // all need to render items
  const allListItems = useMemo(
    () =>
      pickReactChildren(children, List.Item, (el, idx) =>
        addPropsToReactElement<ComponentProps<typeof List['Item']>>(el, {
          key: el.key ?? idx,
          $isRenderByMain: true
        })
      ),
    [children]
  )
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
      const prevAllItemKeys = new Set(prevAllItems?.map((el) => el?.key))
      const currAllItemKeys = allListItems.map((el) => el?.key)
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
      {allListItems.slice(0, renderItemLength)}
    </Col>
  )
}

List.Item = function ListItem({
  $isRenderByMain,
  children,
  className = '',
  style,
  domRef
}: {
  $isRenderByMain?: boolean
  children?: ReactNode
  className?: string
  style?: CSSProperties
  domRef?: RefObject<any>
}) {
  if (!$isRenderByMain) return null
  return (
    <div className={`ListItem w-full ${className}`} ref={domRef} style={style}>
      {children}
    </div>
  )
}
