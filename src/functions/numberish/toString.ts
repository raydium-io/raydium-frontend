import { Numberish } from '@/types/constants'

import { isString } from '../judgers/dateType'

import { eq } from './compare'
import { trimTailingZero } from './stringNumber'
import toFraction from './toFraction'

export function toString(
  n: Numberish | null | undefined,
  options?: {
    /** @default 'auto' */
    decimalLength?: number | 'auto' | 'auto ' | `auto ${number}`
    /** whether set zero decimal depends on how you get zero. if you get it from very samll number, */
    zeroDecimalNotAuto?: boolean
  }
): string {
  if (n == null) return ''
  const fr = toFraction(n)
  let result = ''
  const decimalLength = options?.decimalLength ?? 'auto'
  if (decimalLength === 'auto') {
    result = trimTailingZero(fr.toFixed(6))
  } else if (isString(decimalLength) && decimalLength.startsWith('auto')) {
    const autoDecimalLength = Number(decimalLength.split(' ')[1])
    result = trimTailingZero(fr.toFixed(autoDecimalLength))
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
}
