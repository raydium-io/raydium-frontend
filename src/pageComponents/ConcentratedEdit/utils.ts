export const MIN_DURATION = 0.01
export const MAX_DURATION = 90
export const DAY_SECONDS = 3600 * 24

export function getDurationFromString(v: string, unit: 'hours' | 'days'): number {
  const value = v.trim()
  const valueNumber = isFinite(Number(value)) ? Number(value) : undefined
  const dayNumber = unit === 'days' ? valueNumber : undefined
  const hourNumber = unit === 'hours' ? valueNumber : undefined
  const totalDuration = (dayNumber ?? 0) * 24 * 60 * 60 * 1000 + (hourNumber ?? 0) * 60 * 60 * 1000
  return totalDuration
}
