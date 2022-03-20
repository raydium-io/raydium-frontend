import { AnyFn, ObjectNotArray } from '@/types/constants'

import { isFunction, isObject, isUndefined } from './judgers/dateType'
import { isExist } from './judgers/nil'

export type MayDeepArray<T> = T | Array<MayDeepArray<T>>
/**
 * @deprecated
 * @example
 * mergeDeep({a:3, b:2}, {a:1}) // {a:1, b:2}
 * mergeDeep({a:3, b:2}, undefined, {a:1}) // {a:1, b:2}
 * mergeDeep({a:3, b:2, c:{a:2}}, {a:1, c:{b:3}}) // {a:1, b:2, c:{a:2, b:3}}
 * mergeDeep({a:3, b:2, c:{a:2}}, {a:1, c:{b:3}}, false) // {a:1, b:2, c:{a:2, b:3}}
 * mergeDeep({a:3, b:2, c:{a:2}}, {a:1, c:{b:3}}, {c:false}) // {a:1, b:2, c:false}
 * mergeDeep({a:3, b:2, c:{a:2}}, [{a:1, c:{b:3}}, {c:false}]) // {a:1, b:2, c:false}
 *
 * mergeDeep({a:3, b:2, c:[2]}, {a:1, c:[3]}, {c:[4,5]}) // {a:1, b:2, c:[4,5]}
 */
export function mergeDeep<T>(...deepObjArrays: MayDeepArray<T>[]): T {
  const flattedItems = deepObjArrays.flat(Infinity).filter(Boolean)
  if (flattedItems.length === 1) return flattedItems[0]
  const resultObj = {} as any
  for (const obj of flattedItems) {
    for (const [key, value] of Object.entries(obj ?? {})) {
      if (isObject(resultObj[key]) && isObject(value)) {
        resultObj[key] = mergeDeep([resultObj[key], value])
      } else if (isFunction(resultObj[key]) && isFunction(value)) {
        resultObj[key] = (...params: any[]) => {
          value(...params)
          resultObj[key](...params)
        }
      } else {
        resultObj[key] = value
      }
    }
  }
  return resultObj
}

/**
 * @example
 * _mergeObjects([{a: 3, b: 2, c: undefined}, {a: 1, d: undefined}]) // {a: 1, b: 2}
 * _mergeObjects([{a: 3, b: 2}, {a: 1, b: 3}], (key, v1, v2) => (key === 'a') ? [v1, v2] : v2) // {a: [3,1], b: 3}
 */
export function _mergeObjects<T extends ObjectNotArray>(
  objs: T[],
  transformer: (key: string, valueA: unknown, valueB: unknown) => unknown
): T {
  if (objs.length === 0) return {} as T
  if (objs.length === 1) return objs[0]

  const resultObj: any = { ...objs[0] }
  for (const obj of objs.slice(1)) {
    for (const [key, valueB] of Object.entries(obj)) {
      const valueA = resultObj[key]
      if (isUndefined(valueA) && isUndefined(valueB)) continue
      const resultValue = transformer(key, valueA, valueB)
      if (isExist(resultValue)) resultObj[key] = resultValue
    }
  }
  return resultObj
}

/**
 * @todo it's type intelligense is not very smart for parameters
 * @example
 * const add = (a: number, b: number) => a + b
 * const multi = (a: number) => 3 + a
 * const c = mergeFunction(add, multi) // (a: number, b: number) => {add(a, b); multi(a, b)}
 */
export function mergeFunction<T extends AnyFn>(...fns: [T]): (...params: Parameters<T>) => void
export function mergeFunction<T extends AnyFn, U extends AnyFn | undefined>(
  ...fns: [T, U]
): (...params: Parameters<T>) => void
export function mergeFunction<T extends AnyFn, U extends AnyFn | undefined, W extends AnyFn | undefined>(
  ...fns: [T, U, W]
): (...params: Parameters<T>) => void
export function mergeFunction<
  T extends AnyFn,
  U extends AnyFn | undefined,
  W extends AnyFn | undefined,
  K extends AnyFn | undefined
>(...fns: [T, U, W, K]): (...params: Parameters<T>) => void
export function mergeFunction<
  T extends AnyFn,
  U extends AnyFn | undefined,
  W extends AnyFn | undefined,
  K extends AnyFn | undefined,
  V extends AnyFn | undefined
>(...fns: [T, U, W, K, V]): (...params: Parameters<T>) => void
export function mergeFunction<T extends AnyFn>(...fns: T[]): (...params: Parameters<T>) => void {
  return (...params) => {
    fns.forEach((fn) => fn?.(...params))
  }
}
