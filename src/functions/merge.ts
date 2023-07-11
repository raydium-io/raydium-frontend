import { AnyFn, ObjectNotArray } from '@/types/constants'
import { unifyItem } from './arrayMethods'
import { isArray, isFunction, isObject } from './judgers/dateType'

/**
 * @example
 * _mergeObjects([{a: 3, b: 2, c: undefined}, {a: 1, d: undefined}]) // {a: 1, b: 2}
 * _mergeObjects([{a: 3, b: 2}, {a: 1, b: 3}], (key, v1, v2) => (key === 'a') ? [v1, v2] : v2) // {a: [3,1], b: 3}
 */
export function _shallowMergeObjects<T extends ObjectNotArray>(
  objs: T[],
  transformer: (key: string | symbol, valueA: unknown, valueB: unknown) => unknown
): T {
  const shrinkedObjs = objs.filter(isObject)
  if (shrinkedObjs.length === 0) return {} as T
  if (shrinkedObjs.length === 1) return shrinkedObjs[0]
  return Object.defineProperties(
    {},
    getObjKey(shrinkedObjs).reduce((acc, key) => {
      acc[key] = {
        enumerable: true,
        get() {
          return getValue(shrinkedObjs, key, transformer)
        }
      }
      return acc
    }, {} as PropertyDescriptorMap)
  ) as T
}

function getValue<T extends object>(
  objs: T[],
  key: string | symbol,
  valueMatchRule: (key: string | symbol, valueA: unknown, valueB: unknown) => unknown
) {
  return objs.map((o) => o[key]).reduce((valueA, valueB) => valueMatchRule(key, valueA, valueB), undefined)
}

function getObjKey<T extends object>(objs: T[]) {
  return unifyItem(objs.flatMap((obj) => Reflect.ownKeys(obj)))
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

export function mergeObject<T>(...objs: [T]): T
export function mergeObject<T, U>(...objs: [T, U]): T & U
export function mergeObject<T, U, W>(...objs: [T, U, W]): T & U & W
export function mergeObject<T, U, W, K>(...objs: [T, U, W, K]): T & U & W & K
export function mergeObject<T, U, W, K, V>(...objs: [T, U, W, K, V]): T & U & W & K & V
export function mergeObject<T, U, W, K, V, X>(...objs: [T, U, W, K, V, X]): T & U & W & K & V & X
export function mergeObject<T>(...objs: [T, ...any[]]): T
export function mergeObject<T>(...objs: [T, ...any[]]): T {
  return _shallowMergeObjects(objs, (propertyName, v1, v2) => {
    if (isArray(v1) && isArray(v2)) return v1.concat(v2)
    if (isObject(v1) && isObject(v2)) return mergeObject(v1, v2)
    if (isFunction(v1) && isFunction(v2)) return mergeFunction(v1, v2)
    return v2 == null ? v1 : v2
  })
}

export function coverlyMergeObject<T>(...objs: [T]): T
export function coverlyMergeObject<T, U>(...objs: [T, U]): T & U
export function coverlyMergeObject<T, U, W>(...objs: [T, U, W]): T & U & W
export function coverlyMergeObject<T, U, W, K>(...objs: [T, U, W, K]): T & U & W & K
export function coverlyMergeObject<T, U, W, K, V>(...objs: [T, U, W, K, V]): T & U & W & K & V
export function coverlyMergeObject<T, U, W, K, V, X>(...objs: [T, U, W, K, V, X]): T & U & W & K & V & X
export function coverlyMergeObject<T>(...objs: [T, ...any[]]): T
export function coverlyMergeObject<T>(...objs: [T, ...any[]]): T {
  return _shallowMergeObjects(objs, (propertyName, v1, v2) => v2 ?? v1)
}
