import { RefObject, useEffect } from 'react'

import { Nullish } from '@/types/constants'

import useBFlag from './useBFlag'

//#region ------------------- hook: useActive() -------------------

export interface UseActiveOptions {
  disable?: boolean
  onActiveStart?: (ev: { el: EventTarget; nativeEvent: PointerEvent }) => void
  onActiveEnd?: (ev: { el: EventTarget; nativeEvent: PointerEvent }) => void
  onActive?: (ev: { el: EventTarget; nativeEvent: PointerEvent; is: 'start' | 'end' }) => void
}

export function useActive(
  ref: RefObject<HTMLElement | Nullish> | Nullish,
  { disable, onActiveStart, onActiveEnd, onActive }: UseActiveOptions = {}
) {
  if (!ref) return
  const isActive = useBFlag(false)

  useEffect(() => {
    if (disable) return
    const activeStartHandler = (ev: PointerEvent) => {
      isActive.on()
      onActive?.({
        el: ev.target!,
        nativeEvent: ev!,
        is: 'start'
      })
      onActiveStart?.({
        el: ev.target!,
        nativeEvent: ev!
      })
      ;(ev.target as HTMLElement).setPointerCapture(ev.pointerId)
    }
    const activeEndHandler = (ev: PointerEvent) => {
      isActive.off()
      onActive?.({
        el: ev.target!,
        nativeEvent: ev!,
        is: 'end'
      })
      onActiveEnd?.({
        el: ev.target!,
        nativeEvent: ev!
      })
    }
    ref.current?.addEventListener('pointerdown', activeStartHandler)
    ref.current?.addEventListener('pointerup', activeEndHandler)
    return () => {
      ref.current?.removeEventListener('pointerdown', activeStartHandler)
      ref.current?.removeEventListener('pointerup', activeEndHandler)
    }
  }, [disable, onActiveStart, onActiveEnd, onActive])

  return isActive.value
}
