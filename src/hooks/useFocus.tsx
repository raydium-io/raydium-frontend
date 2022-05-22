import { shakeFalsyItem } from '@/functions/arrayMethods'
import { isObject } from '@/functions/judgers/dateType'
import { MayArray } from '@/types/constants'
import { RefObject, useEffect, useRef } from 'react'

import useToggle from './useToggle'

export interface UseFocusOptions {
  disable?: boolean
  onFocus?: (info: { ev: FocusEvent }) => void
  onBlur?: (info: { ev: FocusEvent }) => void
}

function getEls(refs: MayArray<RefObject<HTMLElement | undefined | null> | HTMLElement | undefined | null>) {
  return shakeFalsyItem([refs].flat().map((ref) => (isObject(ref) && 'current' in ref ? ref.current : ref)))
}
export function useFocus(
  refs: MayArray<RefObject<HTMLElement | undefined | null> | HTMLElement | undefined | null>,
  { disable, onFocus, onBlur }: UseFocusOptions = {}
) {
  const [isActive, { on: turnOnActive, off: turnOffActive }] = useToggle(false)

  const elsFocusStates = useRef(new Map<HTMLElement, boolean>())
  useEffect(() => {
    if (disable) return
    const targetEls = getEls(refs)
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
