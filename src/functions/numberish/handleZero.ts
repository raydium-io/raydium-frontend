const stringNumberRegex = /(-?)([\d,_]*)\.?(\d*)/
/**
 *
 * @example
 * trimTailingZero('-33.33000000') //=> '-33.33'
 * trimTailingZero('-33.000000') //=> '-33'
 * trimTailingZero('.000000') //=> '0'
 */

export function trimTailingZero(s: string) {
  // no decimal part
  if (!s.includes('.')) return s
  const [, sign, int, dec] = s.match(stringNumberRegex) ?? []
  let cleanedDecimalPart = dec
  while (cleanedDecimalPart.endsWith('0')) {
    cleanedDecimalPart = cleanedDecimalPart.slice(0, cleanedDecimalPart.length - 1)
  }
  return cleanedDecimalPart ? `${sign}${int}.${cleanedDecimalPart}` : `${sign}${int}` || '0'
}
/**
 * @example
 * padZero('30', 3) //=> '30000'
 */

export function padZero(str: string | number, count: number) {
  return String(str) + Array(count).fill('0').join('')
}

export function getFirstNonZeroDecimal(s: string) {
  const [, , , dec = ''] = s.match(stringNumberRegex) ?? []
  const index = dec.split('').findIndex((c) => Number(c) > 0)
  return index + 1
}
