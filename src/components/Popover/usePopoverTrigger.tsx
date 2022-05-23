import { RefObject } from 'react'

import { useClick } from '@/hooks/useClick'
import { useClickOutside } from '@/hooks/useClickOutside'
import { useHover } from '@/hooks/useHover'
import useToggle from '@/hooks/useToggle'
import { MayArray } from '@/types/constants'
import { useFocus } from '@/hooks/useFocus'

export type PopoverTriggerControls = {
  on(): void
  off(): void
  toggle(): void
}

export type PopoverTiggerBy = MayArray<'hover' | 'click' | 'focus'>

export function usePopoverTrigger(
  buttonRef: RefObject<HTMLElement | undefined | null>,
  panelRef: RefObject<HTMLElement | undefined | null>,
  options?: {
    disabled?: boolean
    triggerDelay?: number
    closeDelay?: number
    /** @default click */
    triggerBy?: PopoverTiggerBy
  }
): { isPanelShowed: boolean; controls: { off(): void; on(): void; toggle(): void } } {
  const { closeDelay = 600, triggerBy = 'click', triggerDelay, disabled } = options ?? {}
  const [isPanelShowed, { toggle, on, delayOff, off }] = useToggle(false, { delay: closeDelay })
  useClick(buttonRef, {
    disable: disabled || !triggerBy.includes('click') || isPanelShowed,
    onClick: () => {
      if (isPanelShowed === false) {
        on()
      }
    }
  })
  useHover(buttonRef, {
    disable: disabled || !triggerBy.includes('hover'),
    triggerDelay,
    onHoverStart: on,
    onHoverEnd: () => delayOff()
  })
  useHover(panelRef, {
    disable: disabled || !triggerBy.includes('hover'),
    onHoverStart: on,
    onHoverEnd: () => delayOff()
  })
  // TODO: popover content may not focusable, so can't set onBlur
  useFocus([buttonRef, panelRef], {
    disable: disabled || !triggerBy.includes('focus'),
    onFocus: on
    // onBlur: delayOff
  })

  useClickOutside([panelRef], {
    disable: disabled || !isPanelShowed,
    onClickOutSide: () => {
      if (isPanelShowed === true) {
        delayOff({ forceDelayTime: 10 })
      }
    }
  })
  return { isPanelShowed, controls: { off, on, toggle } }
}
