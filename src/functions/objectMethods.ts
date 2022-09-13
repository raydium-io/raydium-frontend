import { AnyObj } from '@/types/constants'

import { isFunction } from './judgers/dateType'

export function objectFilter<T, K extends string>(
  obj: Record<K, T> | undefined,
  callbackFn: (value: T, key: K) => boolean
): Record<K, T> {
  //@ts-expect-error why type error?
  return Object.fromEntries(Object.entries(obj ?? {}).filter(([key, value]) => callbackFn(value, key)))
}

/**
 * @param target target object
 * @param mapper (value)
 * @example
 * objectMap({ a: 1, b: 2 }, (v) => v * 2) // { a: 2, b: 4 }
 */
export function objectMapEntry<T, V extends [string, any]>(
  target: T | undefined,
  mapper: (entry: [key: keyof T, value: T[keyof T]]) => V
): { [P in keyof V[0]]: V[1] } {
  // @ts-expect-error type infer report error. but never mind
  return Object.fromEntries(Object.entries(target ?? {}).map(([key, value]) => mapper([key, value])))
}

/**
 * @param target target object
 * @param mapper (value)
 * @example
 * objectMap({ a: 1, b: 2 }, ([k, v]) =>[[k, v * 2], [`${k}2`, v * 3]]) // { a: 2, a2: 3, b: 4, b2: 6 }
 */
export function objectMapMultiEntry<T, K extends string, V>(
  target: T | undefined,
  mapper: (entry: [key: keyof T, value: T[keyof T]]) => [K, V][]
): Record<K, V> {
  const entries = Object.entries(target ?? {})
    // @ts-expect-error type infer report error. but never mind
    .map(([key, value]) => mapper([key, value]))
    .flat()

  // @ts-expect-error type infer report error. but never mind
  return Object.fromEntries(entries)
}

export function objectMapKey<T, K extends keyof any>(
  target: T | undefined,
  mapper: (key: keyof T, value: T[keyof T]) => K
): { [P in K]: T[keyof T] } {
  // @ts-expect-error type infer report error. but never mind
  return objectMapEntry(target, ([key, value]) => [mapper(key, value), value])
}

export function objectMap<T, V>(
  target: T | undefined,
  callbackFn: (value: T[keyof T], key: keyof T) => V
): Record<keyof T, V> {
  //@ts-expect-error why type error?
  return objectMapEntry(target, ([key, value]) => [key, callbackFn(value, key)])
}

/**
 * @example
 * objectReduce({ a: 1, b: 2 }, (acc, [_, value]) => acc + value, 0) // 3
 */
export function objectReduce<T, R>(
  obj: T,
  reducer: <U extends keyof T>(
    acc: R,
    currentEntry: [key: U, value: T[U]],
    index: number,
    allEntries: Array<[key: U, value: T[U]]>
  ) => R,
  initialValue: R
): R {
  //@ts-expect-error for build-in type infer is not very intelligense
  return Object.entries(obj).reduce(reducer, initialValue)
}

export function objectShakeFalsy<T>(obj: T): { [K in keyof T]: NonNullable<T[K]> } {
  //@ts-expect-error force type
  return objectFilter(obj, (value) => value)
}

export function objectShakeNil<T>(obj: T): { [K in keyof T]: NonNullable<T[K]> } {
  //@ts-expect-error force type
  return objectFilter(obj, (value) => value !== undefined && value !== null)
}

/**
 * @example
 * splitObject({ a: 1, b: 2 }, ['a']) // [{ a: 1 }, { b: 2 }]
 */
export function splitObject<T extends AnyObj>(
  obj: T,
  judger: (key: keyof T, value: T[keyof T]) => boolean
): [Partial<T>, Partial<T>]
export function splitObject<T extends AnyObj, U extends keyof T>(
  obj: T,
  propNameList: ReadonlyArray<U>
): [Pick<T, U>, Omit<T, U>]
export function splitObject(obj: any, param2: any) {
  return objectReduce(
    obj,
    (acc, [key, value]) => {
      const groupNo = (isFunction(param2) ? param2(key, value) : param2.includes(key)) ? 0 : 1
      const targetBucket = acc[groupNo] as any
      targetBucket[key] = obj[key]
      return acc
    },
    [{}, {}]
  )
}

/**
 * the same as typescript:Omit
 * @example
 * omit({ a: 1, b: true }, ['a']) //=> { b: true }
 */
export function omit<T, U extends keyof T>(obj: T, ...inputKeys: (U[] | U)[]): Omit<T, U> {
  const unvalidKeys = inputKeys.flat()
  //@ts-expect-error Object.fromEntries / Object.entries' type is not quite intelligense. So force to type it !!!
  return Object.fromEntries(Object.entries(obj).filter(([key]) => !unvalidKeys.includes(key)))
}

/**
 * the same as typescript:Pick
 * @example
 * pick({ a: 1, b: 2 }, ['a']) //=> { a: 1 }
 */
export function pick<T, U extends keyof T>(obj: T, propNameList: ReadonlyArray<U>): Pick<T, U> {
  //@ts-expect-error Object.fromEntries / Object.entries' type is not quite intelligense. So force to type it !!!
  return Object.fromEntries(Object.entries(obj).filter(([key]) => propNameList.includes(key)))
}

export function replaceValue<T extends AnyObj, K extends keyof T, V extends T[K], NewV>(
  obj: T,
  findValue: (value: V, key: K) => boolean,
  replaceValue: NewV
): Record<K, V | NewV> {
  const entries = Object.entries(obj)
  const newEntries = entries.map(([key, value]) => (findValue(value, key as any) ? [key, replaceValue] : [key, value]))
  return Object.fromEntries(newEntries)
}
