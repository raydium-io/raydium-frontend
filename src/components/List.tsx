import { ComponentProps, CSSProperties, ReactNode, RefObject, useEffect, useMemo, useRef, useState } from 'react'

import addPropsToReactElement from '@/functions/react/addPropsToReactElement'
import mergeRef from '@/functions/react/mergeRef'
import { pickReactChildren } from '@/functions/react/pickChild'
import { shrinkToValue } from '@/functions/shrinkToValue'
import { useRecordedEffect } from '@/hooks/useRecordedEffect'
import { useScrollDegreeDetector } from '@/hooks/useScrollDegreeDetector'
import { ObserveFn, useIntersectionObserver } from '../hooks/useIntersectionObserver'
import Col from './Col'
import { VirtualBox } from './VirtualBox'

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
  const listRef = useRef<HTMLDivElement>(null)

  const { observe, stop } = useIntersectionObserver({ rootRef: listRef, options: { rootMargin: '100%' } })
  // all need to render items
  const allListItems = useMemo(
    () =>
      pickReactChildren(children, List.Item, (el, idx) =>
        addPropsToReactElement<ComponentProps<typeof List['Item']>>(el, {
          key: el.key ?? idx,
          $isRenderByMain: true,
          $observeFn: observe
        })
      ),
    [children]
  )

  useEffect(() => stop, []) // stop observer when destory

  // actually showed itemLength
  const [renderItemLength, setRenderItemLength] = useState(renderAllAtOnce ? allListItems.length : initRenderCount)

  useScrollDegreeDetector(listRef, {
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
    <Col domRef={mergeRef(domRef, listRef)} className={`List overflow-y-scroll ${className ?? ''}`} style={style}>
      {allListItems.slice(0, renderItemLength)}
    </Col>
  )
}

type ListItemStatus = {
  isIntersecting: boolean
}

List.Item = function ListItem({
  $observeFn,
  $isRenderByMain,
  children,
  className = '',
  style,
  domRef
}: {
  $observeFn?: ObserveFn<HTMLElement>
  $isRenderByMain?: boolean
  children?: ReactNode | ((status: ListItemStatus) => ReactNode)
  className?: string
  style?: CSSProperties
  domRef?: RefObject<any>
}) {
  if (!$isRenderByMain) return null
  const itemRef = useRef<HTMLElement>()

  const [isIntersecting, setIsIntersecting] = useState(true)

  const status = useMemo(
    () => ({
      isIntersecting
    }),
    [isIntersecting]
  )

  useEffect(() => {
    if (!itemRef.current) return
    $observeFn?.(itemRef.current, ({ entry: { isIntersecting } }) => {
      setIsIntersecting(isIntersecting)
    })
  }, [itemRef])

  return (
    <VirtualBox show={isIntersecting} domRef={mergeRef(domRef, itemRef)} className="w-full shrink-0">
      {(detectRef) => (
        <div className={`ListItem w-full ${className}`} ref={detectRef} style={style}>
          {shrinkToValue(children, [status])}
        </div>
      )}
    </VirtualBox>
  )
}
