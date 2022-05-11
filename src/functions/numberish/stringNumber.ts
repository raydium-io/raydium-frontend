// TODO: to be continue...

import BN, { isBN } from 'bn.js'

import hasProperty from '../judgers/compare'
import { isBigInt, isNumber, isObject } from '../judgers/dateType'

type Numberable = number | string | bigint | BN
type StringNumberable = Numberable | StringNumberAtom
type StringNumber = string
type StringNumberAtom = { decimal: number; all: string }

const stringNumberRegex = /(-?)([\d,_]*)\.?(\d*)/

function isStringNumberAtom(value: any): value is StringNumberAtom {
  return isObject(value) && hasProperty(value, ['decimal', 'all'])
}

/**
 * @convention number element = decimal + getAllNumber
 * @example
 *  '423.12' => { decimal: 2, allNumber: '42312' }
 *  '12' => { decimal: 0, allNumber: '12' }
 */
function toStringNumberAtom(from: Numberable | StringNumberAtom): StringNumberAtom {
  if (isStringNumberAtom(from)) return from
  const str = toStringNumber(from)
  const [intPart = '', decimalPart = ''] = str.split('.')
  return { decimal: decimalPart.length, all: intPart + decimalPart } as StringNumberAtom
}

/**
 * @example
 * toStringNumber('sd5587.65fjf') //=> '5587.65'
 * toStringNumber('hello') //=> ''
 * toStringNumber(3) //=> '3'
 * toStringNumber('3.') //=> '3'
 * toStringNumber('8n') //=> '8'
 * toStringNumber({ decimal: 2, all: '42312' }) => '423.12'
 * toStringNumber({ decimal: 0, all: '12' }) //=> '12'
 * toStringNumber({ decimal: 7, all: '4000000' }) //=> '4.0000000'
 * toStringNumber({ decimal: 7, all: '4000000' }, {noMeanlessZero:true}) //=> '4'
 */
export function toStringNumber(
  from: StringNumberable,
  { noMeanlessZero = true }: { noMeanlessZero?: boolean } = {}
): StringNumber {
  if (isNumber(from)) return String(from)
  if (isBigInt(from)) return String(from)
  if (isBN(from)) return String(from)
  let resultN = '0'
  if (isStringNumberAtom(from)) {
    const { decimal, all } = from
    if (decimal === 0) return all
    resultN = [all.slice(0, -decimal) || '0', '.', all.padStart(decimal, '0').slice(-decimal)].join('')
  } else {
    const parsedString = from.match(stringNumberRegex)?.[0] ?? ''
    resultN = parsedString
  }

  return noMeanlessZero ? trimTailingZero(resultN) : resultN
}

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
function padZero(str: string, count: number) {
  return str + Array(count).fill('0').join('')
}

export function toFixed(n: Numberable, fractionLength: number): string {
  const [, sign = '', int = '', dec = ''] = String(n).match(/(-?)(\d*)\.?(\d*)/) ?? []
  if (!dec) return String(n)
  if (dec.length < fractionLength) return String(n)
  else return Number(n).toFixed(fractionLength) // TODO: imply this
}

/**
 * @example
 * add('9007199254740991.4', '112.4988') //=> '9007199254741103.8988'
 */
export function add(
  a: Numberable = 0,
  b: Numberable = 0,
  { noMeanlessZero = true }: { noMeanlessZero?: boolean } = {}
) {
  const { decimal: decimalA, all: allA } = toStringNumberAtom(a)
  const { decimal: decimalB, all: allB } = toStringNumberAtom(b)

  const biggerDecimal = Math.max(decimalB, decimalA)

  return toStringNumber(
    {
      decimal: biggerDecimal,
      all: String(BigInt(padZero(allA, biggerDecimal - decimalA)) + BigInt(padZero(allB, biggerDecimal - decimalB)))
    },
    { noMeanlessZero }
  )
}

/**
 * @example
 * minus('1.22', '112.3') //=> '-111.08'
 * minus('1.22', '-112.3') //=> '-111.08'
 * minus('9007199254740991.4', '112.4988') //=> '9007199254740878.9012'
 */
export function minus(
  a: Numberable = 0,
  b: Numberable = 0,
  { noMeanlessZero = true }: { noMeanlessZero?: boolean } = {}
) {
  const { decimal: decimalA, all: allA } = toStringNumberAtom(a)
  const { decimal: decimalB, all: allB } = toStringNumberAtom(b)

  const biggerDecimal = Math.max(decimalB, decimalA)

  return toStringNumber(
    {
      decimal: biggerDecimal,
      all: String(BigInt(padZero(allA, biggerDecimal - decimalA)) - BigInt(padZero(allB, biggerDecimal - decimalB)))
    },
    { noMeanlessZero }
  )
}

/**
 * @example
 * multiply('1.22', '112.3') //=> '137.006'
 * multiply('9007199254740991.4', '112.4988') //=> '1013299107519255843.31032'
 */
export function multiply(
  a: Numberable = 1,
  b: Numberable = 1,
  { noMeanlessZero = true }: { noMeanlessZero?: boolean } = {}
) {
  const { decimal: decimalA, all: allA } = toStringNumberAtom(a)
  const { decimal: decimalB, all: allB } = toStringNumberAtom(b)
  return toStringNumber(
    {
      decimal: decimalA + decimalB,
      all: String(BigInt(allA) * BigInt(allB))
    },
    { noMeanlessZero }
  )
}

export function divide(
  a: Numberable = 1,
  b: Numberable = 1,
  { decimalPlace = 20, noMeanlessZero = true }: { decimalPlace?: number; noMeanlessZero?: boolean } = {}
) {
  const { decimal: decimalA, all: allA } = toStringNumberAtom(a)
  const { decimal: decimalB, all: allB } = toStringNumberAtom(b)
  const result = toStringNumber(
    {
      decimal: decimalA - decimalB + decimalPlace,
      all: String(BigInt(padZero(allA, decimalPlace)) / BigInt(allB))
    },
    { noMeanlessZero }
  )
  return result
}

export function exponentiatedBy(
  a: Numberable = 1,
  b: Numberable = 1, // don't support decimal now
  { noMeanlessZero = true }: { noMeanlessZero?: boolean } = {}
) {
  const { decimal: decimalA, all: allA } = toStringNumberAtom(a)

  const all = String(Number(allA) ** Number(b)) //TODO: imply this
  const result = toStringNumber(
    {
      decimal: decimalA,
      all: all
    },
    { noMeanlessZero }
  )
  return result
}

/**
 * @example
 * greaterThan(2,3) //=> false
 * greaterThan('3', 3) //=> false
 * greaterThan('4', 3) //=> true
 */
export function greaterThan(a: Numberable | undefined, b: Numberable | undefined) {
  if (a === undefined || b === undefined) return false
  const diff = minus(a, b)
  const ab = toStringNumberAtom(diff).all
  return BigInt(ab) > BigInt(0)
}
export const gt = greaterThan

/**
 * @example
 * lessThanOrEqual(2,3) //=> true
 * lessThanOrEqual('3', 3) //=> true
 * lessThanOrEqual('4', 3) //=> false
 */
export function lessThanOrEqual(a: Numberable | undefined, b: Numberable | undefined) {
  return !greaterThan(a, b)
}
export const lte = lessThanOrEqual

/**
 * @example
 * lessThan(2,3) //=> true
 * lessThan('3', 3) //=> false
 * lessThan('4', 3) //=> false
 */
export function lessThan(a: Numberable | undefined, b: Numberable | undefined) {
  if (a === undefined || b === undefined) return false
  const diff = minus(a, b)
  const ab = toStringNumberAtom(diff).all
  return BigInt(ab) < BigInt(0)
}
export const lt = lessThan

/**
 * @example
 * greaterThanOrEqual(2,3) //=> false
 * greaterThanOrEqual('3', 3) //=> true
 * greaterThanOrEqual('4', 3) //=> true
 */
export function greaterThanOrEqual(a: Numberable | undefined, b: Numberable | undefined) {
  return !lessThan(a, b)
}
export const gte = greaterThanOrEqual

/**
 *
 * @example
 * equal(2,3) //=> false
 * equal('3', 3) //=> true
 * equal('3.0', 3) //=> true
 * equal('.3', 3) //=> false
 * equal('-3.0', -3) //=> true
 */
export function equal(a: Numberable | undefined, b: Numberable | undefined) {
  if (a === undefined || b === undefined) return false
  const diff = minus(a, b)
  const ab = toStringNumberAtom(diff).all
  return BigInt(ab) === BigInt(0)
}
function isBn(from: string | BN | StringNumberAtom) {
  throw new Error('Function not implemented.')
}
