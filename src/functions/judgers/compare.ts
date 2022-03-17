import { AnyObj } from '@/types/constants'
import { MayArray } from '@/types/generics'

import { inArray, isObject, isString } from './dateType'

export const isOneOf = inArray

/**
 * very rude, just checking keys
 */
export function isKeyInShape(toJudge: AnyObj, shape: AnyObj): boolean {
  const targetKeys = Object.keys(toJudge)
  const shapeKeys = Object.keys(shape)
  return shapeKeys.every((shapeKey) => targetKeys.includes(shapeKey))
}

/**
 * @example
 * isPartOf({a: 'hello'}, { a: 'hello', b: 'world'}) //=> true
 */
export function isPartOf<T extends AnyObj, K extends AnyObj>(
  toJudge: T,
  whole: K,
  options?: {
    /** it is invoked before ignoreValueCase */
    valueParser?: (value: T[keyof T] | K[keyof K], key: string) => any
    /**just a short cut of valueParser */
    ignoreValueCase?: boolean
  }
): boolean {
  return Object.entries(toJudge).every(([key, value]) => {
    const toJudgeValue = options?.valueParser?.(value, key) ?? value
    const wholeObjectValue = options?.valueParser?.(whole[key], key) ?? whole[key]
    return Object.is(wholeObjectValue, toJudgeValue)
  })
}

// it type is not intelligent enough
export default function hasProperty<T>(obj: T, key: MayArray<keyof T | string>) {
  if (!isObject(obj)) {
    throw new Error(`input object: ${String(obj)} is not object for fn:${hasProperty.name}`)
  }
  return [key].flat().every((objKey) => Reflect.has(obj as any, objKey))
}
