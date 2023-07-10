import { Numberish } from '@/types/constants'

import { isString } from '../judgers/dateType'

import { eq } from './compare'
import { trimTailingZero } from './handleZero'
import { toFractionWithDecimals } from './toFraction'

export interface ToStringOptions {
  /** @default 'auto' / 'auto [decimals]' */
  decimalLength?: number | 'auto' | 'auto ' | `auto ${number | undefined}`
  /** whether set zero decimal depends on how you get zero. if you get it from very samll number, */
  zeroDecimalNotAuto?: boolean
  /**
   * ! this option have priority over decimal
   **/
  maxSignificantCount?: number
}

export function toString(n: Numberish | null | undefined, options?: ToStringOptions): string {
  if (n == null) return ''
  const { fr, decimals } = toFractionWithDecimals(n)

  //#region ------------------- with significant count -------------------
  if (options?.maxSignificantCount) {
    return fr.toSignificant(Math.floor(options.maxSignificantCount))
  }
  //#endregion

  //#region ------------------- with decimal length -------------------
  let result = ''
  const decimalLength = options?.decimalLength ?? (decimals != null ? `auto ${decimals}` : 'auto')
  if (decimalLength === 'auto' || decimalLength === 'auto ') {
    result = trimTailingZero(fr.toFixed(6)) // if it is not tokenAmount, it will have max 6 decimal
  } else if (isString(decimalLength) && decimalLength.startsWith('auto')) {
    const autoDecimalLength = Number(decimalLength.split(' ')[1])
    result = trimTailingZero(fr.toFixed(isNaN(autoDecimalLength) ? 6 : autoDecimalLength))
  } else {
    result = fr.toFixed(decimalLength as number)
  }
  // for decimal-not-auto zero
  if (eq(result, 0) && options?.zeroDecimalNotAuto) {
    const decimalLength = Number(String(options.decimalLength ?? '').match(/auto (\d*)/)?.[1] ?? 6)
    return `0.${'0'.repeat(decimalLength)}`
  } else {
    // for rest
    return result
  }
  //#endregion
}
