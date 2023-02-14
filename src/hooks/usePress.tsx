import { RefObject, useEffect } from 'react'

import useToggle from './useToggle'

export interface UsePressOptions {
  pressDuration?: number
  disable?: boolean
  onTrigger?: (info: { ev: PointerEvent }) => void
}

export function usePress(
  ref: RefObject<HTMLElement | undefined | null>,
  { pressDuration, disable, onTrigger }: UsePressOptions = {}
) {
  const [isPress, { on: turnonPress, off: turnoffPress }] = useToggle(false)

  useEffect(() => {
    if (disable) return
    let timerId: NodeJS.Timeout | undefined = undefined
    const handlePressDown = (ev: PointerEvent) => {
      turnonPress()
      timerId = setTimeout(() => {
        onTrigger?.({ ev })
      }, pressDuration)
    }

    const handlePressCancel = (ev: PointerEvent) => {
      if (timerId) {
        clearTimeout(timerId)
        turnoffPress()
      }
    }

    ref.current?.addEventListener('pointerdown', handlePressDown)
    ref.current?.addEventListener('pointerup', handlePressCancel)

    return () => {
      ref.current?.removeEventListener('pointerdown', handlePressDown)
      ref.current?.removeEventListener('pointerup', handlePressCancel)
    }
  }, [disable, pressDuration, onTrigger])

  return isPress
}
