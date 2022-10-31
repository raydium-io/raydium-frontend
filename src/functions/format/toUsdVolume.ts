import { Rounding } from '@raydium-io/raydium-sdk'

import { FormatOptions } from '@/functions/format/formatNumber'
import { Numberish } from '@/types/constants'

import { autoSuffixNumberish } from './autoSuffixNumberish'

/**
 * it depends on 'toFixed'
 */
export default function toUsdVolume(
  amount: Numberish | undefined,
  options?: {
    autoSuffix?: boolean

    decimalPlace?: number
    format?: any | undefined
    rounding?: Rounding
  } & FormatOptions
) {
  if (!amount) return '0'
  return `$${autoSuffixNumberish(amount, { ...options, disabled: !options?.autoSuffix })}`
}
