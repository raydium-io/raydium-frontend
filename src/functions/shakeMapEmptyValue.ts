import { isArray, isMap, isSet } from '@/functions/judgers/dateType'

export function shakeMapEmptyValue<T extends Map<any, any>>(map: T): T {
  function isEmpty(v: any): boolean {
    return (
      v === undefined ||
      v === null ||
      (isArray(v) && v.length === 0) ||
      (isMap(v) && v.size === 0) ||
      (isSet(v) && v.size === 0)
    )
  }
  map.forEach((value, key, map) => {
    if (isEmpty(value)) {
      map.delete(key)
    }
  })
  return map
}

export function filterMapValue<K, T>(map: Map<K, T>, filter: (v: T, k: K, map: Map<K, T>) => boolean): Map<K, T> {
  map.forEach((value, key, map) => {
    if (!filter(value, key, map)) {
      map.delete(key)
    }
  })
  return map
}
