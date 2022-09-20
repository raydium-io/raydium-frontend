import BN from 'bn.js'

import { TokenJson } from '@/application/token/type'
import parseNumberInfo from '@/functions/numberish/parseNumberInfo'
import { Numberish } from '@/types/constants'
import { Currency, Price, TEN, Token } from 'test-r-sdk'

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
  const parsedNumerator = options?.alreadyDecimaled ? new BN(numerator).mul(TEN.pow(new BN(token.decimals))) : numerator
  const parsedDenominator = new BN(denominator).mul(TEN.pow(new BN(usdCurrency.decimals)))
  return new Price(
    usdCurrency,
    parsedDenominator.toString(),
    new Currency(token.decimals, token.symbol, token.name),
    parsedNumerator.toString()
  )
}
