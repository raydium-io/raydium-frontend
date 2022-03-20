export type ParsedDurationInfo = Record<'days' | 'hours' | 'minutes' | 'seconds' | 'milliseconds' | 'full', number>

/**
 * @example
 * parseDuration(5 * 60 * 1000) // {full: 5 * 60 * 1000, minutes: 5, ...[others]:0 }
 */
export default function parseDuration(duration: number): ParsedDurationInfo {
  let diff = duration
  const values: ParsedDurationInfo = {
    full: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    milliseconds: 0
  }
  values.full = Math.max(Math.floor(diff), 0)
  values.days = Math.max(Math.floor(diff / (1000 * 60 * 60 * 24)), 0)
  diff -= values.days * (1000 * 60 * 60 * 24)
  values.hours = Math.max(Math.floor(diff / (1000 * 60 * 60)), 0)
  diff -= values.hours * (1000 * 60 * 60)
  values.minutes = Math.max(Math.floor(diff / (1000 * 60)), 0)
  diff -= values.minutes * (1000 * 60)
  values.seconds = Math.max(Math.floor(diff / 1000), 0)
  diff -= values.seconds * 1000
  values.milliseconds = Math.max(diff, 0)
  return values
}

/**
 * @example
 * parseDurationAbsolute(5 * 60 * 1000) // {full: 5 * 60 * 1000, day: 5/24/60, hour: 5/60  minutes: 5, secends: 5 * 60, milliseconds: 5 * 60 * 1000 }
 */
export function parseDurationAbsolute(duration: number): ParsedDurationInfo {
  return {
    full: duration,
    days: duration / 24 / 60 / 60 / 1000,
    hours: duration / 60 / 60 / 1000,
    minutes: duration / 60 / 1000,
    seconds: duration / 1000,
    milliseconds: duration
  }
}
