import { CSSProperties, ReactNode, RefObject, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'

import { Transition } from '@headlessui/react'

import { pickReactChildProps } from '@/functions/react/pickChild'
import { shrinkToValue } from '@/functions/shrinkToValue'
import { useClickOutside } from '@/hooks/useClickOutside'
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect'
import useToggle from '@/hooks/useToggle'
import { MayFunction } from '@/types/constants'
import { setSessionItem, getSessionItem } from '@/functions/dom/jStorage'
import useInit from '@/hooks/useInit'
import useUpdate from '@/hooks/useUpdate'

type CollapseStatus = {
  isOpen: boolean
  // it is delay version of isOpen
  isContentVisible: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

export type CollapseHandler = CollapseStatus

export type CollapseProps = {
  /** will record input result in localStorage */
  id?: string

  children?: ReactNode
  className?: MayFunction<string, [open: boolean]>
  style?: CSSProperties
  /** only first render, !important, this and open can only set one */
  defaultOpen?: boolean
  /** it's change will cause ui change, !important, this and defaultOpen can only set one  */
  open?: boolean
  /** (maybe not have to this, cause writing of collapseFace and collapseBody can express this ) */
  openDirection?: 'downwards' | 'upwards'
  onOpen?(): void
  onClose?(): void
  onToggle?(): void
  closeByOutsideClick?: boolean
  /** usually this is used together with componentRef */
  disableOpenByClickFace?: boolean
  disable?: boolean
  componentRef?: RefObject<any>
}

const collapseTransitionDuration = 300
/**
 * default **uncontrolled** Kit
 *
 * once set open, compnent becomes **controlled** Kit
 *
 * NOTE a component who wrapped by `<Collapse>` must have real height when init
 */
export default function Collapse({
  id,
  children = null as ReactNode,
  className = '',
  style,
  defaultOpen = false,
  open,
  openDirection = 'downwards',
  onOpen,
  onClose,
  onToggle,
  closeByOutsideClick,
  disableOpenByClickFace,
  disable,
  componentRef
}: CollapseProps) {
  const isDefaultOpen = useMemo(() => open ?? defaultOpen, []) // it will set once and never change
  const [innerOpen, { toggle, off, on, set }] = useToggle(isDefaultOpen, {
    locked: disable,
    onOff: onClose,
    onOn: onOpen,
    onToggle: onToggle
  })
  const [isContentVisible, setIsContentVisible] = useState(innerOpen)
  useEffect(() => {
    if (innerOpen === isContentVisible) return
    if (innerOpen) {
      setIsContentVisible(innerOpen)
    } else {
      const timeoutId = setTimeout(() => {
        setIsContentVisible(innerOpen)
      }, collapseTransitionDuration)
      return () => clearTimeout(timeoutId)
    }
  }, [innerOpen])

  // if (set id),  sync sessionStorage to cache user input
  if (id) {
    useUpdate(() => {
      setSessionItem(id, innerOpen)
    }, [innerOpen])
    useInit(() => {
      const sessionStoredValue = getSessionItem(id)
      if (sessionStoredValue) {
        set(Boolean(sessionStoredValue))
      }
    })
  }

  useIsomorphicLayoutEffect(() => {
    if (!defaultOpen) set(Boolean(open))
  }, [open])

  const collapseFaceProps = pickReactChildProps(children, CollapseFace)
  const collapseBodyProps = pickReactChildProps(children, CollapseBody)
  const collapseBodyRef = useRef<HTMLDivElement>(null)
  const collapseRef = useRef<HTMLDivElement>(null)

  useClickOutside(collapseRef, { disable: !closeByOutsideClick, onClickOutSide: off })

  const status = useMemo<CollapseStatus>(
    () => ({
      isContentVisible: innerOpen || isContentVisible,
      isOpen: innerOpen,
      open: on,
      close: off,
      toggle: toggle
    }),
    [innerOpen, isContentVisible]
  )

  useImperativeHandle(componentRef, () => status)

  return (
    <div ref={collapseRef} className={`Collapse flex flex-col ${shrinkToValue(className, [innerOpen])}`} style={style}>
      <CollapseFace
        {...collapseFaceProps}
        onClick={() => {
          if (!disableOpenByClickFace) toggle()
        }}
        className={twMerge(
          `filter ${disable || disableOpenByClickFace ? '' : 'hover:brightness-90 cursor-pointer'} ${
            openDirection === 'downwards' ? '' : 'order-2'
          }`,
          collapseFaceProps?.className
        )}
        $status={status}
      />
      <Transition
        show={innerOpen}
        enter="transition-all duration-300 ease-in-out"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="transition-all duration-300 ease-in-out"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
        beforeEnter={() => {
          // seems headlessui/react 1.6 will get react 18's priority strategy. 👇 fllowing code will invoke **before** element load
          collapseBodyRef.current?.style.setProperty('position', 'absolute') // init will rerender element, "position:absolute" is for not affect others
          collapseBodyRef.current?.style.setProperty('visibility', 'hidden')

          setTimeout(() => {
            collapseBodyRef.current?.style.removeProperty('position')

            collapseBodyRef.current?.style.removeProperty('height')
            const trueHeight = collapseBodyRef.current?.clientHeight
            collapseBodyRef.current?.style.setProperty('height', '0px')
            // get a layout property to manually to force the browser to layout the above code.
            // So trick. But have to.🤯🤯🤯🤯
            collapseBodyRef.current?.clientHeight
            collapseBodyRef.current?.style.setProperty('height', trueHeight + 'px')
            collapseBodyRef.current?.style.removeProperty('visibility')
          })
        }}
        afterEnter={() => {
          collapseBodyRef.current?.style.removeProperty('height')
          collapseBodyRef.current?.style.setProperty('user-select', 'auto')
        }}
        beforeLeave={() => {
          setTimeout(() => {
            const trueHeight = collapseBodyRef.current?.clientHeight
            // force <CollapseBody> to have height. which is the base of transition
            collapseBodyRef.current?.style.setProperty('height', trueHeight + 'px')

            // get a layout property to manually to force the browser to layout the above code.
            // So trick. But have to.🤯🤯🤯🤯
            collapseBodyRef.current?.clientHeight

            // force <CollapseBody> to have content height. which is the aim of transition
            collapseBodyRef.current?.style.setProperty('height', '0px')
            collapseBodyRef.current?.style.setProperty('user-select', 'none')
          })
        }}
      >
        <CollapseBody
          domRef={collapseBodyRef}
          {...collapseBodyProps}
          className={twMerge(
            `transition-all duration-300 ease-in-out overflow-hidden ${openDirection === 'downwards' ? '' : 'order-1'}`,
            collapseBodyProps?.className
          )}
          style={{ height: isDefaultOpen ? 'auto' : '0' }}
          $status={status}
        />
      </Transition>
    </div>
  )
}

function CollapseFace(props: {
  onClick?: () => void
  className?: string
  children?: ReactNode | ((status: CollapseStatus) => ReactNode)
  $status?: CollapseStatus
}) {
  return (
    <div onClick={props.onClick} className={`CollapseFace ${props.className ?? ''}`}>
      {shrinkToValue(props.children, [props.$status])}
    </div>
  )
}
function CollapseBody(props: {
  style?: CSSProperties
  children?: ReactNode | ((status: CollapseStatus) => ReactNode)
  className?: string
  domRef?: RefObject<HTMLDivElement>
  $status?: CollapseStatus
}) {
  const shouldRenderChildren = props.$status?.isContentVisible
  return (
    <div ref={props.domRef} style={props.style} className={`CollapseBody ${props.className ?? ''}`}>
      {shouldRenderChildren && shrinkToValue(props.children, [props.$status])}
    </div>
  )
}

Collapse.Face = CollapseFace
Collapse.Body = CollapseBody
