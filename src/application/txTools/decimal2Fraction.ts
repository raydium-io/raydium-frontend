import { isDecimal, isFraction } from '@/functions/judgers/dateType'
import parseNumberInfo from '@/functions/numberish/parseNumberInfo'
import { Fraction, Token } from '@raydium-io/raydium-sdk'
import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'
import Decimal from 'decimal.js'
import { Currency, CurrencyAmount, Percent, Price, TokenAmount, _100 } from 'test-r-sdk'

export function decimalToFraction(n: undefined): undefined
export function decimalToFraction(n: Decimal): Fraction
export function decimalToFraction(n: Decimal | undefined): Fraction | undefined
export function decimalToFraction(n: Decimal | undefined): Fraction | undefined {
  if (n == null) return undefined
  const { numerator, denominator } = parseNumberInfo(n.toString())
  return new Fraction(numerator, denominator)
}

export function fractionToDecimal(n: undefined, decimalLength?: number): undefined
export function fractionToDecimal(n: Fraction, decimalLength?: number): Decimal
export function fractionToDecimal(n: Fraction | undefined, decimalLength?: number): Decimal | undefined
export function fractionToDecimal(n: Fraction | undefined, decimalLength = 6): Decimal | undefined {
  if (n == null) return undefined
  return new Decimal(n.toFixed(decimalLength))
}

type Primitive = boolean | number | string | null | undefined | PublicKey

/**
 *
 * @example
 * ```typescript
 * interface A {
 *   keyA: string;
 *   keyB: string;
 *   map: {
 *     hello: string;
 *     i: number;
 *   };
 *   list: (string | number)[];
 *   keyC: number;
 * }
 *
 * type WrappedA = ReplaceType<A, string, boolean> // {
 *   keyA: boolean;
 *   keyB: boolean;
 *   map: {
 *     hello: boolean;
 *     i: number;
 *   };
 *   list: (number | boolean)[];
 *   keyC: number;
 * }
 * ```
 */
export type ReplaceType<Old, From, To> = {
  [T in keyof Old]: Old[T] extends From // to avoid case: Old[T] is an Object,
    ? Exclude<Old[T], From> | To // when match,  directly replace
    : Old[T] extends Primitive // judge whether need recursively replace
    ? From extends Old[T] // it's an Object
      ? Exclude<Old[T], From> | To // directly replace
      : Old[T] // stay same
    : ReplaceType<Old[T], From, To> // recursively replace
}
const baseInnerObjects = [Token, TokenAmount, PublicKey, Fraction, BN, Currency, CurrencyAmount, Price, Percent]

function notInnerObject(v: unknown): v is Record<string, any> {
  return typeof v === 'object' && v !== null && !baseInnerObjects.some((o) => v instanceof o)
}

export function recursivelyDecimalToFraction<T>(info: T): ReplaceType<T, Decimal, Fraction> {
  // @ts-expect-error no need type for inner code
  return isDecimal(info)
    ? decimalToFraction(info)
    : Array.isArray(info)
    ? info.map((k) => recursivelyDecimalToFraction(k))
    : notInnerObject(info)
    ? Object.fromEntries(Object.entries(info).map(([k, v]) => [k, recursivelyDecimalToFraction(v)]))
    : info
}
export function recursivelyFractionToDecimal<T>(info: T, decimalLength?: number): ReplaceType<T, Fraction, Decimal> {
  // @ts-expect-error no need type for inner code
  return isFraction(info)
    ? fractionToDecimal(info, decimalLength)
    : Array.isArray(info)
    ? info.map((k) => recursivelyFractionToDecimal(k, decimalLength))
    : notInnerObject(info)
    ? Object.fromEntries(Object.entries(info).map(([k, v]) => [k, recursivelyFractionToDecimal(v, decimalLength)]))
    : info
}
