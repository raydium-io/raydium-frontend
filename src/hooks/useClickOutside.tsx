import { RefObject, useEffect } from 'react'

import { MayArray } from '@/types/constants'
import { ElementRefs, getElementsFromRef } from '@/functions/react/getElementsFromRef'

export interface UseClickOutsideOptions {
  disable?: boolean
  onClickOutSide?: () => void
}

export function useClickOutside(refs: ElementRefs, { disable, onClickOutSide }: UseClickOutsideOptions = {}) {
  useEffect(() => {
    if (disable) return
    const handleClickOutside = (ev: Event) => {
      const targetElements = getElementsFromRef(refs)
      if (!targetElements.length) return
      const path = ev.composedPath()
      if (targetElements.some((el) => el && path.includes(el))) return
      onClickOutSide?.()
    }
    window.document?.addEventListener('click', handleClickOutside, { capture: true })
    return () => {
      window.document?.removeEventListener('click', handleClickOutside, { capture: true })
    }
  }, [refs, disable, onClickOutSide])
}
