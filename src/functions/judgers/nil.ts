/**
 * @example
 * notNullish('') // true
 * notNullish(undefined) // false
 * notNullish([]) // true
 */

export function notNullish<T>(value: T): value is NonNullable<T> {
  return value !== undefined && value !== null
}
export function isNullish(value: any): value is undefined | null {
  return !notNullish(value)
}

export const isExist = notNullish

export const notExist = isNullish
