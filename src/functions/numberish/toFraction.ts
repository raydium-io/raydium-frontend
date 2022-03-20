import parseNumberInfo from '@/functions/numberish/parseNumberInfo'
import { Numberish } from '@/types/constants'
import { Fraction, Percent, TokenAmount } from '@raydium-io/raydium-sdk'

export default function toFraction(value: Numberish): Fraction {
  //  to complete math format(may have decimal), not int
  if (value instanceof Percent) return new Fraction(value.numerator, value.denominator)

  // to complete math format(may have decimal), not BN
  if (value instanceof TokenAmount) return toFraction(value.toExact())

  // do not ideal with other fraction value
  if (value instanceof Fraction) return value

  // wrap to Fraction
  const n = String(value)
  const details = parseNumberInfo(n)
  return new Fraction(details.numerator, details.denominator)
}
