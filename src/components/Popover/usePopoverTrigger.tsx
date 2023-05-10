import { isBoolean } from '@/functions/judgers/dateType'
import { useClick } from '@/hooks/useClick'
import { useClickOutside } from '@/hooks/useClickOutside'
import { useHover } from '@/hooks/useHover'
import { usePress } from '@/hooks/usePress'
import { useToggleRef } from '@/hooks/useToggle'
import { AnyFn, MayArray } from '@/types/constants'
import { RefObject, useState } from 'react'

export type PopoverTriggerControls = {
  on(): void
  off(): void
  toggle(): void
  onTurnOn(callback: () => void): { cancel(): void }
  onTurnOff(callback: () => void): { cancel(): void }
}

export type PopoverTiggerBy = MayArray<'hover' | 'click' | 'focus' | 'press'>
export type PopoverCloseBy = MayArray<'click-outside' | 'click-outside-but-trigger'>

export function usePopoverTrigger(
  buttonRef: RefObject<HTMLElement | undefined | null>,
  panelRef: RefObject<HTMLElement | undefined | null>,
  options?: {
    defaultOpen?: boolean
    disabled?: boolean
    triggerDelay?: number
    closeDelay?: number
    /** @default 'click' */
    triggerBy?: PopoverTiggerBy
    /** @default 'click-outside' */
    closeBy?: PopoverCloseBy
    /** auto close the pop content after custom milliseconds, default 2000ms */
    autoClose?: number | boolean
    onOpen?(): void
    onClose?(): void
  }
): {
  isPanelShowed: boolean
  controls: PopoverTriggerControls
} {
  const { closeDelay = 600, triggerBy = 'click', triggerDelay, disabled, autoClose } = options ?? {}
  const autoCloseDelay = isBoolean(autoClose) ? 2000 : autoClose

  const changeTurnOnCallbacks: (AnyFn | undefined)[] = [options?.onOpen]
  const changeTurnOffCallbacks: (AnyFn | undefined)[] = [options?.onClose]
  const addTrunOn: PopoverTriggerControls['onTurnOn'] = (fn: AnyFn) => {
    changeTurnOnCallbacks.push(fn)
    return {
      cancel: () => {
        const index = changeTurnOnCallbacks.indexOf(fn)
        if (index > -1) {
          changeTurnOnCallbacks.splice(index, 1)
        }
      }
    }
  }
  const addTrunOff: PopoverTriggerControls['onTurnOff'] = (fn: AnyFn) => {
    changeTurnOffCallbacks.push(fn)
    return {
      cancel: () => {
        const index = changeTurnOffCallbacks.indexOf(fn)
        if (index > -1) {
          changeTurnOffCallbacks.splice(index, 1)
        }
      }
    }
  }

  // TODO: useToggleRef should be toggleWrapper(useSignalState())
  const [isPanelShowed, setisPanelShowed] = useState(Boolean(options?.defaultOpen))
  const [isPanelShowedRef, { toggle, on, delayOff, off }] = useToggleRef(Boolean(options?.defaultOpen), {
    delay: closeDelay,
    onChange: (isOn) => {
      setisPanelShowed(isOn)
      if (isOn) {
        changeTurnOnCallbacks.forEach((fn) => fn?.())
      } else {
        changeTurnOffCallbacks.forEach((fn) => fn?.())
      }
    }
  })
  useClick(buttonRef, {
    disable: disabled || !triggerBy.includes('click') || isPanelShowedRef.current,
    onClick: () => {
      if (isPanelShowedRef.current === false) {
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

  usePress(buttonRef, {
    disable: disabled || !triggerBy.includes('press'),
    pressDuration: 300,
    onTrigger: on,
    afterTrigger: () => {
      autoClose && delayOff({ forceDelayTime: autoCloseDelay })
    }
  })

  // // TODO: popover content may not focusable, so can't set onBlur
  // NOTE: foce can confilt with useClickOutside
  // useFocus([buttonRef, panelRef], {
  //   disable: disabled || !triggerBy.includes('focus'),
  //   onFocus: on
  //   // onBlur: delayOff
  // })

  useClickOutside(options?.closeBy === 'click-outside-but-trigger' ? [buttonRef, panelRef] : panelRef, {
    disable: disabled || !isPanelShowedRef.current,
    onClickOutSide: () => {
      if (isPanelShowedRef.current === true) {
        delayOff({ forceDelayTime: 10 })
      }
    }
  })
  return { isPanelShowed, controls: { off, on, toggle, onTurnOff: addTrunOff, onTurnOn: addTrunOn } }
}
