import { shakeFalsyItem } from '@/functions/arrayMethods'
import { isObject } from '@/functions/judgers/dateType'
import { MayArray } from '@/types/constants'
import { RefObject } from 'react'

export type ElementRefs = MayArray<RefObject<HTMLElement | undefined | null> | HTMLElement | undefined | null>
export function getElementsFromRef(refs: ElementRefs) {
  return shakeFalsyItem([refs].flat().map((ref) => (isObject(ref) && 'current' in ref ? ref.current : ref)))
}
