import listToMap from './format/listToMap'
import { isArray, isSet } from './judgers/dateType'

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
  // const keys = objList.map(getKey)
  // const unifyKeys = unifyItem(keys)
  // return shakeUndifindedItem(unifyKeys.map((key) => objList.find((item) => getKey(item) === key)))
}
