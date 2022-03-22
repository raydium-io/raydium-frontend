import { RefObject, useEffect } from 'react'

import useToggle from './useToggle'

//#region ------------------- hook: useHover() -------------------

export interface UseHoverOptions {
  triggerDelay?: number
  disable?: boolean
  onHoverStart?: (info: { ev: PointerEvent }) => void
  onHoverEnd?: (info: { ev: PointerEvent }) => void
  onHover?: (info: { ev: PointerEvent; is: 'start' | 'end' }) => void
}

export function useHover(
  ref: RefObject<HTMLElement | undefined | null>,
  { disable, onHoverStart: onHoverEnter, onHoverEnd: onHoverLeave, onHover, triggerDelay }: UseHoverOptions = {}
) {
  const [isHover, { on: turnonHover, off: turnoffHover }] = useToggle(false)

  useEffect(() => {
    if (disable) return
    let hoverDelayTimerId
    const hoverStartHandler = (ev: PointerEvent) => {
      if (disable) return
      if (triggerDelay) {
        hoverDelayTimerId = setTimeout(() => {
          hoverDelayTimerId = undefined
          turnonHover()
          onHover?.({ ev, is: 'start' })
          onHoverEnter?.({ ev })
        }, triggerDelay)
      } else {
        turnonHover()
        onHover?.({ is: 'start', ev })
        onHoverEnter?.({ ev })
      }
    }
    const hoverEndHandler = (ev: PointerEvent) => {
      if (disable) return
      turnoffHover()
      onHover?.({ ev, is: 'end' })
      onHoverLeave?.({ ev })
      clearTimeout(hoverDelayTimerId)
      hoverDelayTimerId = undefined
    }
    ref.current?.addEventListener('pointerenter', hoverStartHandler)
    ref.current?.addEventListener('pointerleave', hoverEndHandler)
    ref.current?.addEventListener('pointercancel', hoverEndHandler)
    return () => {
      ref.current?.removeEventListener('pointerenter', hoverStartHandler)
      ref.current?.removeEventListener('pointerleave', hoverEndHandler)
      ref.current?.removeEventListener('pointercancel', hoverEndHandler)
    }
  }, [disable, onHoverEnter, onHoverLeave, onHover])

  return isHover
}
