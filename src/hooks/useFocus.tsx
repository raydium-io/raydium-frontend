import { useEffect, useRef } from 'react'
import { ElementRefs, getElementsFromRef } from '../functions/react/getElementsFromRef'

import useToggle from './useToggle'

export interface UseFocusOptions {
  disable?: boolean
  onFocus?: (info: { ev: FocusEvent }) => void
  onBlur?: (info: { ev: FocusEvent }) => void
}

export function useFocus(refs: ElementRefs, { disable, onFocus, onBlur }: UseFocusOptions = {}) {
  const [isActive, { on: turnOnActive, off: turnOffActive }] = useToggle(false)

  const elsFocusStates = useRef(new Map<HTMLElement, boolean>())
  useEffect(() => {
    if (disable) return
    const targetEls = getElementsFromRef(refs)
    const handelFocus = (ev: FocusEvent) => {
      const haveAnyFocus = targetEls.map((el) => elsFocusStates.current.get(el)).some((isFocus) => isFocus)
      elsFocusStates.current.set(ev.target as HTMLElement, true)
      if (haveAnyFocus) return
      turnOnActive()
      onFocus?.({ ev })
    }
    const handleBlur = (ev: FocusEvent) => {
      elsFocusStates.current.set(ev.target as HTMLElement, false)
      const haveAnyFocus = targetEls.map((el) => elsFocusStates.current.get(el)).some((isFocus) => isFocus)
      if (haveAnyFocus) return
      turnOffActive()
      onBlur?.({ ev })
    }
    targetEls.forEach((el) => el.addEventListener('focusin', handelFocus))
    targetEls.forEach((el) => el.addEventListener('focusout', handleBlur))
    return () => {
      targetEls.forEach((el) => el.removeEventListener('focusin', handelFocus))
      targetEls.forEach((el) => el.removeEventListener('focusout', handleBlur))
    }
  }, [disable, onFocus, onBlur])

  return isActive
}
