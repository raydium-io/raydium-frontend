import { isNumber, isObject } from '../judgers/dateType'
import { getTime } from './dateFormat'
import { TimeStamp } from './interface'

export function currentIsAfter(timestamp: TimeStamp, options?: { unit?: 'ms' | 's' }): boolean {
  const current = new Date().getTime()
  const realTimestamp = isNumber(timestamp) ? timestamp * (options?.unit === 's' ? 1000 : 1) : timestamp
  const targetDay = new Date(realTimestamp).getTime()
  return current > targetDay
}
export function currentIsBefore(timestamp: TimeStamp, options?: { unit?: 'ms' | 's' }): boolean {
  return !currentIsAfter(timestamp, options)
}
/** A must be milliseconds */
export function isDateBefore(timestampA: TimeStamp, timestampB: TimeStamp, options?: { unit?: 'ms' | 's' }): boolean {
  const realTimestampB = isNumber(timestampB) ? timestampB * (options?.unit === 's' ? 1000 : 1) : timestampB
  return new Date(timestampA).getTime() <= realTimestampB
}

/** A must be milliseconds */
export function isDateAfter(timestampA: TimeStamp, timestampB: TimeStamp, options?: { unit?: 'ms' | 's' }): boolean {
  const realTimestampB = isNumber(timestampB) ? timestampB * (options?.unit === 's' ? 1000 : 1) : timestampB
  return new Date(timestampA).getTime() > realTimestampB
}

/** A must be milliseconds */
export function isDateEqual(timestampA: TimeStamp, timestampB: TimeStamp, options?: { unit?: 'ms' | 's' }): boolean {
  const realTimestampB = isNumber(timestampB) ? timestampB * (options?.unit === 's' ? 1000 : 1) : timestampB
  return new Date(timestampA).getTime() === realTimestampB
}

export function assertDate(testDate: TimeStamp, options: { before?: TimeStamp; after?: TimeStamp; unit?: 'ms' | 's' }) {
  if (options.before && !isDateBefore(testDate, options.before, options)) {
    throw new Error(`date ${testDate} is not before ${options.before}`)
  }
  if (options.after && !isDateAfter(testDate, options.after, options)) {
    throw new Error(`date ${testDate} is not after ${options.after}`)
  }
}

export function isDate(timestamp: unknown): timestamp is Date {
  return isObject(timestamp) && timestamp instanceof Date
}

export function isTimeStampEqual(
  a: TimeStamp,
  b: TimeStamp,
  options?: { unit1: 'ms' | 's'; unit2: 'ms' | 's' }
): boolean {
  const realATimestamp = isNumber(a) ? a * (options?.unit1 === 's' ? 1000 : 1) : a
  const realBTimestamp = isNumber(b) ? b * (options?.unit2 === 's' ? 1000 : 1) : b
  try {
    return new Date(realATimestamp).getTime() === new Date(realBTimestamp).getTime()
  } catch {
    return false
  }
}
