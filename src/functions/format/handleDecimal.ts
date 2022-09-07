import { Fraction } from '@raydium-io/raydium-sdk'
import Decimal from 'decimal.js'

export function decimalToFraction(n: undefined): undefined
export function decimalToFraction(n: Decimal): Fraction
export function decimalToFraction(n: Decimal | undefined): Fraction | undefined
export function decimalToFraction(n: Decimal | undefined): Fraction | undefined {
  if (n == null) return undefined
  const [numerator, denominator] = n.toFraction().map((i) => i.toString())
  return new Fraction(numerator, denominator)
}
