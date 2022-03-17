import { TimeStamp } from './interface'

export function currentIsAfter(timestamp: TimeStamp): boolean {
  const current = new Date().getTime()
  const targetDay = new Date(timestamp).getTime()
  return current > targetDay
}
export function currentIsBefore(timestamp: TimeStamp): boolean {
  return !currentIsAfter(timestamp)
}

export function isTimeStampEqual(a: TimeStamp, b: TimeStamp) {
  try {
    return new Date(a).getTime() === new Date(b).getTime()
  } catch {
    return false
  }
}
