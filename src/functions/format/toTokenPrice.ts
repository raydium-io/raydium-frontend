import { Currency, Price, TEN, Token } from '@raydium-io/raydium-sdk'

import BN from 'bn.js'

import { TokenJson } from '@/application/token/type'
import parseNumberInfo from '@/functions/numberish/parseNumberInfo'
import { Numberish } from '@/types/constants'

import toBN from '../numberish/toBN'

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
  const parsedNumerator = options?.alreadyDecimaled ? toBN(numerator).mul(TEN.pow(toBN(token.decimals))) : numerator
  const parsedDenominator = toBN(denominator).mul(TEN.pow(toBN(usdCurrency.decimals)))
  return new Price(
    usdCurrency,
    parsedDenominator.toString(),
    new Currency(token.decimals, token.symbol, token.name),
    parsedNumerator.toString()
  )
}
