import { RefObject } from 'react'

import { useClick } from '@/hooks/useClick'
import { useClickOutside } from '@/hooks/useClickOutside'
import { useHover } from '@/hooks/useHover'
import useToggle from '@/hooks/useToggle'

export type PopoverTriggerControls = {
  on(): void
  off(): void
  toggle(): void
}

export function usePopoverTrigger(
  buttonRef: RefObject<HTMLElement | undefined | null>,
  panelRef: RefObject<HTMLElement | undefined | null>,
  options?: {
    disabled?: boolean
    triggerDelay?: number
    closeDelay?: number
    /** @default click */
    triggerBy?: 'hover' | 'click'
  }
): { isPanelShowed: boolean; controls: { off(): void; on(): void; toggle(): void } } {
  const { closeDelay = 600, triggerBy = 'click', triggerDelay, disabled } = options ?? {}

  const [isPanelShowed, { toggle, on, delayOff, off }] = useToggle(false, { delay: closeDelay })
  useClick(buttonRef, { disable: disabled || triggerBy === 'hover', onClick: toggle })
  useHover(buttonRef, {
    disable: disabled || triggerBy === 'click',
    triggerDelay,
    onHoverStart: on,
    onHoverEnd: delayOff
  })
  useHover(panelRef, {
    disable: disabled || triggerBy === 'click',
    onHoverStart: on,
    onHoverEnd: delayOff
  })
  useClickOutside([panelRef, buttonRef], {
    disable: disabled || triggerBy === 'hover',
    onClickOutSide: () => {
      if (isPanelShowed) off()
    }
  })
  return { isPanelShowed, controls: { off, on, toggle } }
}
