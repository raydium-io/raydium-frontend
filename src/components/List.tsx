import {
  createContext,
  CSSProperties,
  ReactNode,
  RefObject,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import mergeRef from '@/functions/react/mergeRef'
import { shrinkToValue } from '@/functions/shrinkToValue'
import { useRecordedEffect } from '@/hooks/useRecordedEffect'
import { useScrollDegreeDetector } from '@/hooks/useScrollDegreeDetector'
import { ObserveFn, useIntersectionObserver } from '../hooks/useIntersectionObserver'
import Col from './Col'
import { VirtualBox } from './VirtualBox'

const listContext = createContext<{ observe: ObserveFn<HTMLElement> } | undefined>(undefined)
export default function List<T>({
  increaseRenderCount = 30,
  initRenderCount = 30,
  reachBottomMargin = 50,
  renderAllAtOnce,

  domRef,
  className,
  items,
  getItemKey,
  children,
  style
}: {
  increaseRenderCount?: number
  initRenderCount?: number
  reachBottomMargin?: number
  renderAllAtOnce?: boolean

  domRef?: RefObject<any>
  className?: string
  items: T[]
  getItemKey: (item: T) => string // get item key , to detect change
  children: (item: T) => ReactNode
  style?: CSSProperties
}) {
  const getItemsToRender = (item: T) => <ListItem>{children(item)}</ListItem>
  const listRef = useRef<HTMLDivElement>(null)
  const { observe, stop } = useIntersectionObserver({ rootRef: listRef, options: { rootMargin: '100%' } })

  // all need to render items

  useEffect(() => stop, []) // stop observer when destory

  // actually showed itemLength
  const [itemsToRender, setItemsToRender] = useState(
    items.slice(0, renderAllAtOnce ? items.length : initRenderCount).map(getItemsToRender)
  )
  // const [renderItemLength, setRenderItemLength] = useState(renderAllAtOnce ? items.length : initRenderCount)

  useScrollDegreeDetector(listRef, {
    onReachBottom: () => {
      setItemsToRender((prev) => {
        const newItemsRenderCount = prev.length >= items.length ? items.length : prev.length + increaseRenderCount
        return prev.concat(items.slice(prev.length, newItemsRenderCount).map(getItemsToRender))
      })
    },
    reachBottomMargin: reachBottomMargin
  })

  // attach some css-variables (too slow)
  // useScrollDetector(listRef)

  // reset if Item's length has changed
  useRecordedEffect(
    ([prevAllItems]) => {
      const prevAllItemKeys = new Set(prevAllItems?.map((el) => getItemKey(el)))
      const currAllItemKeys = items.map((el) => getItemKey(el))
      if (prevAllItems && !renderAllAtOnce && currAllItemKeys.some((key) => !prevAllItemKeys.has(key))) {
        setItemsToRender(items.slice(0, initRenderCount).map(getItemsToRender))
      }
    },
    [items, renderAllAtOnce] as const
  )

  useRecordedEffect

  return (
    <listContext.Provider value={{ observe }}>
      <Col domRef={mergeRef(domRef, listRef)} className={`List overflow-y-scroll ${className ?? ''}`} style={style}>
        {itemsToRender}
      </Col>
    </listContext.Provider>
  )
}

type ListItemStatus = {
  isIntersecting: boolean
}

function ListItem({
  children,
  className = '',
  style,
  domRef
}: {
  children?: ReactNode | ((status: ListItemStatus) => ReactNode)
  className?: string
  style?: CSSProperties
  domRef?: RefObject<any>
}) {
  const itemRef = useRef<HTMLElement>()

  const [isIntersecting, setIsIntersecting] = useState(true)
  const { observe } = useContext(listContext) ?? {}

  const status = useMemo(
    () => ({
      isIntersecting
    }),
    [isIntersecting]
  )

  useEffect(() => {
    if (!itemRef.current) return
    observe?.(itemRef.current, ({ entry: { isIntersecting } }) => {
      setIsIntersecting(isIntersecting)
    })
  }, [itemRef])

  return (
    <VirtualBox show={isIntersecting} domRef={mergeRef(domRef, itemRef)} className="w-full shrink-0">
      {(detectRef) => (
        <div className={`ListItem w-full flow-root ${className}`} ref={detectRef} style={style}>
          {shrinkToValue(children, [status])}
        </div>
      )}
    </VirtualBox>
  )
}

List.Item = ListItem
