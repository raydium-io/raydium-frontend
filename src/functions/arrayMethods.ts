import listToMap from './format/listToMap'
import { isArray, isObject, isSet } from './judgers/dateType'

export function hasSameItems<T>(arr1: T[], arr2: any[]): arr2 is T[] {
  if (arr1.length !== arr2.length) return false
  if (arr1.length === 0) return true
  return arr1.every((item) => arr2.includes(item))
}

export function addItem<T, U>(arr: T[], item: U): (T | U)[]
export function addItem<T, U>(set: Set<T>, item: U): Set<T | U>
export function addItem(arr, item) {
  if (isArray(arr)) {
    return [...arr, item]
  }
  // Set
  if (isSet(arr)) {
    const newSet = new Set(arr)
    newSet.add(item)
    return newSet
  }
}

export function removeItem<T>(arr: T[], item: T): T[]
export function removeItem<T>(set: Set<T>, item: T): Set<T>
export function removeItem(arr, item) {
  if (isArray(arr)) {
    return arr.filter((i) => i !== item)
  }
  // Set
  if (isSet(arr)) {
    const newSet = new Set(arr)
    newSet.delete(item)
    return newSet
  }
}

export function unifyItem<T>(arr: T[]): T[] {
  return [...new Set(arr)]
}

export function shakeUndifindedItem<T>(arr: T[]): NonNullable<T>[] {
  return arr.filter((item) => item != null) as NonNullable<T>[]
}
export function shakeFalsyItem<T>(arr: readonly T[]): NonNullable<T>[] {
  return arr.filter(Boolean) as NonNullable<T>[]
}

// todo use js object to speed up the fn
export function unifyByKey<T>(objList: T[], getKey: (item: T) => string): T[] {
  const objMap = listToMap(objList, getKey)
  return shakeUndifindedItem(Object.values(objMap))
}

/**
 * add old data as default
 */
export function mergeWithOld<T extends any[]>(newData: T, oldData: T, getUniqueArrKey?: (item: T[number]) => string): T
export function mergeWithOld<T extends Set<any>>(newData: T, oldData: T): T
export function mergeWithOld<T extends Record<keyof any, any>>(newData: T, oldData: Partial<T>): T
export function mergeWithOld<T>(newData: T, oldData, getUniqueArrKey?: (item: T) => string) {
  if (isSet(newData) && isSet(oldData)) {
    return new Set([...oldData, ...newData])
  }
  if (isArray(newData) && isArray(oldData)) {
    return getUniqueArrKey ? unifyByKey([...oldData, ...newData], getUniqueArrKey) : [...oldData, ...newData]
  }
  if (isObject(newData) && isObject(oldData)) {
    return { ...oldData, ...newData }
  } else {
    throw 'mergeOld error'
  }
}

export function filterInplace<T>(inputArray: T[], condition: (val: T, index: number, inputArray: T[]) => boolean) {
  let i = 0
  let j = 0
  while (i < inputArray.length) {
    const value = inputArray[i]
    if (condition(value, i, inputArray)) {
      inputArray[j++] = value
    }
    i++
  }
  inputArray.length = j
}
