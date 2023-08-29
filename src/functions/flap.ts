import { DeMayArray, MayArray } from '@/types/constants'

/** DeMayArray */
export function flap<T extends MayArray<any>>(arr: T): DeMayArray<DeMayArray<T>>[] {
  // @ts-expect-error force type
  return Array.isArray(arr) ? arr : [arr]
}
