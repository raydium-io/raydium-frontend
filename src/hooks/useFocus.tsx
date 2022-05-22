import { isObject } from '@/functions/judgers/dateType'
import { RefObject, useEffect } from 'react'

import useToggle from './useToggle'

export interface UseFocusOptions {
  disable?: boolean
  onFocus?: (info: { ev: FocusEvent }) => void
  onBlur?: (info: { ev: FocusEvent }) => void
}

export function useFocus(
  ref: RefObject<HTMLElement | undefined | null> | HTMLElement | undefined | null,
  { disable, onFocus, onBlur }: UseFocusOptions = {}
) {
  const [isActive, { on: turnOnActive, off: turnOffActive }] = useToggle(false)

  useEffect(() => {
    if (disable) return
    const handelFocus = (ev: FocusEvent) => {
      turnOnActive()
      onFocus?.({ ev })
    }
    const handleBlur = (ev: FocusEvent) => {
      turnOffActive()
      onBlur?.({ ev })
    }
    const targetEl = isObject(ref) && 'current' in ref ? ref.current : ref
    targetEl?.addEventListener('focusin', handelFocus)
    targetEl?.addEventListener('focusout', handleBlur)
    return () => {
      targetEl?.removeEventListener('focusin', handleBlur)
      targetEl?.removeEventListener('focusout', handelFocus)
    }
  }, [disable, onFocus, onBlur])

  return isActive
}
