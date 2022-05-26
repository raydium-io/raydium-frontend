import React, { CSSProperties, ReactNode, RefObject, useMemo, useRef } from 'react'

import { Transition } from '@headlessui/react'

import { twMerge } from 'tailwind-merge'

import { pickReactChildProps } from '@/functions/react/pickChild'
import { shrinkToValue } from '@/functions/shrinkToValue'
import { useClickOutside } from '@/hooks/useClickOutside'
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect '
import useToggle, { useToggleRef } from '@/hooks/useToggle'

type CollapseController = {
  open: () => void
  close: () => void
  toggle: () => void
}
/**
 * default **uncontrolled** Kit
 * once set open, compnent becomes **controlled** Kit
 */
export default function Collapse({
  children = null as ReactNode,
  className = '',
  style,
  defaultOpen = false,
  open,
  openDirection = 'downwards',
  onOpen,
  onClose,
  onToggle,
  closeByOutsideClick
}: {
  children?: ReactNode
  className?: string
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
}) {
  const [innerOpen, { toggle, off, on, set }] = useToggle(open ?? defaultOpen, {
    onOff: onClose,
    onOn: onOpen,
    onToggle: onToggle
  })

  useIsomorphicLayoutEffect(() => {
    if (!defaultOpen) set(Boolean(open))
  }, [open])

  const collapseFaceProps = pickReactChildProps(children, CollapseFace)
  const collapseBodyProps = pickReactChildProps(children, CollapseBody)
  const collapseBodyRef = useRef<HTMLDivElement>(null)
  const collapseRef = useRef<HTMLDivElement>(null)

  useClickOutside(collapseRef, { disable: !closeByOutsideClick, onClickOutSide: off })

  const controller = useMemo<CollapseController>(
    () => ({
      open: on,
      close: off,
      toggle: toggle
    }),
    [on, off]
  )

  return (
    <div ref={collapseRef} className={`Collapse flex flex-col ${className}`} style={style}>
      <CollapseFace
        {...collapseFaceProps}
        onClick={toggle}
        className={twMerge(
          `filter hover:brightness-90 cursor-pointer ${openDirection === 'downwards' ? '' : 'order-2'}`,
          collapseFaceProps?.className
        )}
        $open={innerOpen}
        $controller={controller}
      />
      <Transition
        show={innerOpen}
        appear
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
            const height = collapseBodyRef.current?.clientHeight
            collapseBodyRef.current?.style.setProperty('height', '0px')
            // get a layout property to manually to force the browser to layout the above code.
            // So trick. But have to.🤯🤯🤯🤯
            collapseBodyRef.current?.clientHeight
            collapseBodyRef.current?.style.setProperty('height', height + 'px')
            collapseBodyRef.current?.style.removeProperty('visibility')
          })
        }}
        afterEnter={() => {
          collapseBodyRef.current?.style.removeProperty('height')
          collapseBodyRef.current?.style.setProperty('user-select', 'auto')
        }}
        beforeLeave={() => {
          setTimeout(() => {
            const height = collapseBodyRef.current?.clientHeight
            // force <CollapseBody> to have height. which is the base of transition
            collapseBodyRef.current?.style.setProperty('height', height + 'px')

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
          style={{ height: defaultOpen ? 'auto' : '0' }}
          $open={innerOpen}
          $controller={controller}
        />
      </Transition>
    </div>
  )
}

function CollapseFace(props: {
  onClick?: () => void
  className?: string
  children?: ReactNode | ((open: boolean, controller: CollapseController) => ReactNode)
  $open?: boolean
  $controller?: CollapseController
}) {
  return (
    <div onClick={props.onClick} className={`CollapseFace ${props.className ?? ''}`}>
      {shrinkToValue(props.children, [Boolean(props.$open), props.$controller])}
    </div>
  )
}
function CollapseBody(props: {
  style?: CSSProperties
  children?: ReactNode | ((open: boolean, controller: CollapseController) => ReactNode)
  className?: string
  domRef?: RefObject<HTMLDivElement>
  $open?: boolean
  $controller?: CollapseController
}) {
  return (
    <div ref={props.domRef} style={props.style} className={`CollapseBody ${props.className ?? ''}`}>
      {shrinkToValue(props.children, [Boolean(props.$open), props.$controller])}
    </div>
  )
}

Collapse.Face = CollapseFace
Collapse.Body = CollapseBody
