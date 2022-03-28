import formatNumber, { FormatOptions } from '@/functions/format/formatNumber'
import { Fraction, Rounding } from '@raydium-io/raydium-sdk'

// urgly indeed

// function toTooSmallString(value: string) {
//   return value === '0.00' ? '<0.01' : value
// }

/**
 * it depends on 'toFixed'
 */
export default function toUsdVolume(
  amount: Fraction | undefined,
  options?: {
    autoSuffix?: boolean

    decimalPlace?: number
    format?: any | undefined
    rounding?: Rounding
  } & FormatOptions
) {
  if (!amount) return '0'

  const formatFn = (n: Fraction) =>
    formatNumber(n.toFixed(options?.decimalPlace ?? 2, options?.format, options?.rounding), {
      fractionLength: 'auto',
      ...options
    })

  if (options?.autoSuffix) {
    const numberWeigth = amount.toFixed(0).length
    if (numberWeigth > 3 * 3) return `$${formatFn(amount.div(1e9))}B`
    if (numberWeigth > 3 * 2) return `$${formatFn(amount.div(1e6))}M`
    if (numberWeigth > 3 * 1) return `$${formatFn(amount.div(1e3))}K`
    return `$${formatFn(amount)}`
  } else {
    return `$${formatFn(amount)}`
  }
}
