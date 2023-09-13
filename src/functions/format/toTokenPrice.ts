import { Currency, Price, Token } from '@raydium-io/raydium-sdk'

import { TokenJson } from '@/application/token/type'
import parseNumberInfo from '@/functions/numberish/parseNumberInfo'
import { Numberish } from '@/types/constants'

export const usdCurrency = new Currency(6, 'usd', 'usd')

/**
 * Eth price: 4600
 * ➡
 * Eth price: Price {4600 usd/eth}
 *
 * @param numberPrice can have decimal
 * @returns
 */
export default function toTokenPrice(
  token: TokenJson | Token,
  numberPrice: Numberish,
  options?: { alreadyDecimaled?: boolean }
): Price {
  const { numerator, denominator } = parseNumberInfo(numberPrice)
  const parsedNumerator = options?.alreadyDecimaled ? withZeroTail(numerator, token.decimals) : numerator
  const parsedDenominator = withZeroTail(denominator, usdCurrency.decimals)
  return new Price(
    usdCurrency,
    parsedDenominator,
    new Currency(token.decimals, token.symbol, token.name),
    parsedNumerator
  )
}

function withZeroTail(n: number | string, decimal: number) {
  return `${n}${'0'.repeat(decimal)}`
}
