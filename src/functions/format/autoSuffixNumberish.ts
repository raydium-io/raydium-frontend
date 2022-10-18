import { Fraction, Rounding } from 'test-r-sdk'

import formatNumber, { FormatOptions } from '@/functions/format/formatNumber'
import { Numberish } from '@/types/constants'

import toFraction from '../numberish/toFraction'

export function autoSuffixNumberish(
  n: Numberish,
  options?: {
    disabled?: boolean
    decimalPlace?: number
    format?: any | undefined
    rounding?: Rounding
  } & FormatOptions
): string {
  const formatFn = (n: Fraction) =>
    formatNumber(n.toFixed(options?.decimalPlace ?? 2, options?.format, options?.rounding), {
      fractionLength: 'auto',
      ...options
    })
  const num = toFraction(n)
  try {
    const int = num.toFixed(0)
    const numberWeigth = int.length
    if (!options?.disabled && numberWeigth > 3 * 3) return `${formatFn(num.div(1e9))}B`
    if (!options?.disabled && numberWeigth > 3 * 2) return `${formatFn(num.div(1e6))}M`
    if (!options?.disabled && numberWeigth > 3 * 1) return `${formatFn(num.div(1e3))}K`
    return `${formatFn(num)}`
  } catch {
    return '0'
  }
}
