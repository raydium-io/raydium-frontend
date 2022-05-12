import { Numberish, StringNumber } from '@/types/constants'

import fall from '../fall'
import { toFixed } from '../numberish/stringNumber'
import { toString } from '../numberish/toString'

export type FormatOptions = {
  /**
   * separator symbol
   * @default ','
   * @example
   * formatNumber(7000000.2) // result: '7,000,000.200'
   * formatNumber(7000000.2, { separator: '_' }) // result: '7_000_000.200'
   */
  groupSeparator?: string
  /**
   * @default 3
   * @example
   * formatNumber(10000.2) // result: '10,000.200'
   * formatNumber(10000.1234, { seperatorEach: 4 }) // result: '1,0000.123400'
   */
  groupSize?: number
  /**
   * how many fraction number. (if there is noting, 0 will be added )
   * @default 2
   * @example
   * formatNumber(100.2, { fractionLength: 3 }) // result: '100.200'
   * formatNumber(100.2, { fractionLength: auto }) // result: '100.2'
   * formatNumber(100.1234, { fractionLength: 6 }) // result: '100.123400'
   */
  fractionLength?: number | 'auto'
}

/**
 * to formated number string
 * @example
 * formatNumber(undefined) // '0'
 * formatNumber(7000000.2) // result: '7,000,000.20'
 * formatNumber(8800.1234, { seperator: '', fractionLength: 6 }) // result: '8,800.123400'
 * formatNumber(100.1234, { fractionLength: 3 }) // result: '100.123'
 */
export default function formatNumber(
  n: Numberish | null | undefined,
  { groupSeparator = ',', fractionLength = 2, groupSize = 3 }: FormatOptions = {}
): string {
  if (n === undefined) return '0'
  return fall(n, [
    (n) => toString(n),
    (n) => (fractionLength === 'auto' ? n : toFixed(n, fractionLength)),
    (str) => {
      const [, sign = '', int = '', dec = ''] = str.match(/(-?)(\d*)\.?(\d*)/) ?? []
      const newIntegerPart = [...int].reduceRight((acc, cur, idx, strN) => {
        const indexFromRight = strN.length - 1 - idx
        const shouldAddSeparator = indexFromRight !== 0 && indexFromRight % groupSize! === 0
        return cur + (shouldAddSeparator ? groupSeparator : '') + acc
      }, '') as string
      return dec ? `${sign}${newIntegerPart}.${dec}` : `${sign}${newIntegerPart}`
    }
  ])
}
/**
 * parse a string
 *
 * it a function that reverse the result of {@link formatNumber}
 * @param numberString a string represent a number. e.g. -70,000.050
 * @example
 * parseFormatedNumberString('-70,000.050') // result: -70000.05
 */
export function parseFormatedNumberString(numberString: string): number {
  const pureNumberString = [...numberString].reduce((acc, char) => acc + (/\d|\.|-/.test(char) ? char : ''), '')
  return Number(pureNumberString)
}
