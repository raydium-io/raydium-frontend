import useCallbackRef from '@/hooks/useCallbackRef'
import { useEvent } from '@/hooks/useEvent'
import useResizeObserver from '@/hooks/useResizeObserver'
import React, { RefObject, useState } from 'react'

/**
 * will destory children if not show, but it will remain child's size in a `<div>` element
 */
export function VirtualBox({
  observeHeight = true,
  observeWidth = false,
  show,
  className,
  domRef,
  children
}: {
  observeWidth?: boolean
  observeHeight?: boolean
  show: boolean
  className?: string
  domRef?: RefObject<any>
  children?: (detectRef: RefObject<any>) => React.ReactNode
}) {
  const [innerHeight, setInnerHeight] = useState<number>()
  const [innerWidth, setInnerWidth] = useState<number>()

  const innerRef = useCallbackRef<HTMLElement>({
    onAttach(currentEl) {
      observe(currentEl)
    }
  })

  const { observe } = useResizeObserver(innerRef, ({ el }) => {
    detectSize(el)
  })

  const detectSize = useEvent((el: HTMLElement) => {
    if (!el) return
    if (!show) return
    setInnerHeight(el.clientHeight)
    setInnerWidth(el.clientWidth)
  })

  return (
    <div
      ref={domRef}
      className={className}
      style={{
        height: observeHeight ? innerHeight : undefined,
        width: observeWidth ? innerWidth : undefined
      }}
    >
      {show && children?.(innerRef)}
    </div>
  )
}
