import { MouseEvent, RefObject, useEffect, useRef } from 'react'
import { useEvent } from './useEvent'

import useToggle from './useToggle'

export interface UseClickOptions {
  disable?: boolean
  onClick?: (info: { ev: PointerEvent; finalEv?: MouseEvent; pressDuration: number }) => void
  onActiveStart?: (info: { ev: PointerEvent }) => void
  onActiveEnd?: (info: { ev: PointerEvent; pressDuration: number }) => void

  /** handle pointer Long press */
  longClickFireEach?: number

  /** handle pointer Long press  */
  longClickDelay?: number

  /** if set, onClick can fire multi time */
  canLongClick?: boolean
}

export function useClick(
  ref: RefObject<HTMLElement | undefined | null>,
  {
    disable,
    onClick,
    onActiveStart,
    onActiveEnd,
    longClickDelay = 600,
    longClickFireEach = 80,
    canLongClick
  }: UseClickOptions = {}
) {
  const [isActive, { on: turnOnActive, off: turnOffActive }] = useToggle(false)

  const startPointEvent = useRef<PointerEvent>()

  // record duration to handle long press
  const pressDownAt = useRef<number>(0)
  const pressUpAt = useRef<number>(0)

  // start callbacks
  const handleClick = useEvent((ev: MouseEvent) =>
    onClick?.(
      startPointEvent.current
        ? { ev: startPointEvent.current, finalEv: ev, pressDuration: pressUpAt.current - pressDownAt.current }
        : { ev: ev as unknown as PointerEvent, pressDuration: pressUpAt.current - pressDownAt.current }
    )
  )
  const handlePointerDown = useEvent((ev: PointerEvent) => {
    turnOnActive()
    pressDownAt.current = globalThis.performance.now()
    startPointEvent.current = ev
    onActiveStart?.({ ev })
  })
  const handlePointerUp = useEvent((ev: PointerEvent) => {
    turnOffActive()
    pressUpAt.current = globalThis.performance.now()
    onActiveEnd?.({ ev, pressDuration: pressUpAt.current - pressDownAt.current })
  })

  // handle long press
  useEffect(() => {
    if (isActive && canLongClick) {
      const startTimestamp = Date.now()
      let startCalcLongPressTimestamp: number
      const timeId = setInterval(() => {
        const endTimestamp = Date.now()
        if (!startCalcLongPressTimestamp && endTimestamp - startTimestamp >= longClickDelay) {
          startCalcLongPressTimestamp = endTimestamp
        }
        if (startCalcLongPressTimestamp && endTimestamp - startCalcLongPressTimestamp >= longClickFireEach) {
          startPointEvent.current &&
            onClick?.({ ev: startPointEvent.current, pressDuration: endTimestamp - startTimestamp })
          startCalcLongPressTimestamp = endTimestamp
        }
      }, longClickFireEach)
      return () => clearInterval(timeId)
    }
  }, [isActive])

  // addEventListener
  useEffect(() => {
    if (disable) return
    ref.current?.addEventListener('pointerdown', handlePointerDown)
    ref.current?.addEventListener('pointerup', handlePointerUp)
    ref.current?.addEventListener('pointercancel', handlePointerUp)
    ref.current?.addEventListener('click', handleClick as any)
    return () => {
      ref.current?.removeEventListener('pointerdown', handlePointerDown)
      ref.current?.removeEventListener('pointerup', handlePointerUp)
      ref.current?.removeEventListener('pointercancel', handlePointerUp)
      ref.current?.removeEventListener('click', handleClick as any)
    }
  }, [disable, onClick, onActiveStart, onActiveEnd])

  return isActive
}
