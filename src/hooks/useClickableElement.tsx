import { RefObject, useEffect, useRef } from 'react'

import addTabIndex from '../functions/dom/addTabIndex'
import { useClick, UseClickOptions } from './useClick'
import { useHover, UseHoverOptions } from './useHover'

/**
 *  a merge of {@link useClick} and {@link useHover}, and some tailwindcss class
 */
export default function useClickableElement(
  ref: RefObject<HTMLElement | undefined>,
  options?: UseClickOptions & UseHoverOptions
) {
  useClick(ref, options)
  useHover(ref, options)
  useEffect(() => {
    if (options?.disable) return
    ref.current?.classList.add(
      'cursor-pointer',
      'active:brightness-75',
      'active:backdrop-brightness-75',
      'hover:brightness-90',
      'hover:backdrop-brightness-90',
      'filter',
      'backdrop-filter',
      'transition',
      'duration-75'
    )
    const c = addTabIndex(ref.current)
    return c?.cancel
  }, [options])
}

export function useClickableElementRef<RefType extends HTMLElement = HTMLElement>(
  options?: UseClickOptions & UseHoverOptions
) {
  const ref = useRef<RefType>(null)
  useClickableElement(ref, options)
  return ref
}
