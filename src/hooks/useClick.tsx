import { MouseEvent, RefObject, useEffect } from 'react'

import useToggle from './useToggle'

export interface UseClickOptions {
  disable?: boolean
  onClick?: (info: { ev: MouseEvent }) => void
  onActiveStart?: (info: { ev: PointerEvent }) => void
  onActiveEnd?: (info: { ev: PointerEvent }) => void
}

export function useClick(
  ref: RefObject<HTMLElement | undefined | null>,
  { disable, onClick, onActiveStart, onActiveEnd }: UseClickOptions = {}
) {
  const [isActive, { on: turnOnActive, off: turnOffActive }] = useToggle(false)

  useEffect(() => {
    if (disable) return
    const handleClick = (ev: Event) => onClick?.({ ev: ev as unknown as MouseEvent })
    const handlePointerDown = (ev: PointerEvent) => {
      turnOnActive()
      onActiveStart?.({ ev })
    }
    const handlePointerUp = (ev: PointerEvent) => {
      turnOffActive()
      onActiveEnd?.({ ev })
    }
    ref.current?.addEventListener('pointerdown', handlePointerUp)
    ref.current?.addEventListener('pointerup', handlePointerDown)
    ref.current?.addEventListener('pointercancel', handlePointerDown)
    ref.current?.addEventListener('click', handleClick)
    return () => {
      ref.current?.removeEventListener('pointerdown', handlePointerUp)
      ref.current?.removeEventListener('pointerup', handlePointerDown)
      ref.current?.removeEventListener('pointercancel', handlePointerDown)
      ref.current?.removeEventListener('click', handleClick)
    }
  }, [disable, onClick, onActiveStart, onActiveEnd])

  return isActive
}
