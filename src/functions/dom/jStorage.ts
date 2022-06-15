import { isString } from '@/functions/judgers/dateType'
import { shrinkToValue } from '@/functions/shrinkToValue'
import { MayFunction } from '@/types/constants'

const cache: Map<string, any> = new Map()
/**
 * safely use browser's API: localStorage. but it is auto json like jFetch and have cache also
 * @todo it can use both localStorage and indexedDB with same API
 */
/**
 * auto JSON.parsed
 */
export function getLocalItem<T = any>(key: string, jsonReviver?: (key: string, value: any) => any): T | undefined {
  try {
    if (cache.has(key)) return cache.get(key)
    const value = globalThis.localStorage?.getItem(key)
    const parsedValue = isString(value) ? JSON.parse(value, jsonReviver) : value ?? undefined
    cache.set(key, parsedValue)
    return parsedValue
  } catch {
    console.error('something error when get from localStorage.')
  }
}

/**
 * safely use browser's API: localStorage. but it is auto json like jFetch and have cache also
 */
/**
 * auto JSON.parsed
 */
export function getSessionItem<T = any>(key: string, jsonReviver?: (key: string, value: any) => any): T | undefined {
  try {
    if (cache.has(key)) return cache.get(key)
    const value = globalThis.sessionStorage?.getItem(key)
    const parsedValue = isString(value) ? JSON.parse(value, jsonReviver) : value ?? undefined
    cache.set(key, parsedValue)
    return parsedValue
  } catch {
    console.error('something error when get from localStorage.')
  }
}

/**
 * auto JSON.stringify
 */
export function setLocalItem<T = any>(
  key: string,
  value: MayFunction<T, [oldValue: T | undefined]>,
  jsonReplacer?: (key: string, value: any) => any
): void {
  try {
    const oldValue = getLocalItem(key)
    const targetValue = shrinkToValue(value, [oldValue])
    const jsonedValue = JSON.stringify(targetValue, jsonReplacer)
    globalThis.localStorage?.setItem(key, jsonedValue)
    cache.set(key, targetValue)
  } catch {
    console.error('set localStorage error')
  }
}

/**
 * auto JSON.stringify
 */
export function setSessionItem<T = any>(
  key: string,
  value: MayFunction<T, [oldValue: T | undefined]>,
  jsonReplacer?: (key: string, value: any) => any
): void {
  try {
    const oldValue = getLocalItem(key)
    const targetValue = shrinkToValue(value, [oldValue])
    const jsonedValue = JSON.stringify(targetValue, jsonReplacer)
    globalThis.sessionStorage?.setItem(key, jsonedValue)
    cache.set(key, targetValue)
  } catch {
    console.error('set localStorage error')
  }
}
