import { CurrencyAmount, Price } from 'test-r-sdk'

import { Numberish } from '@/types/constants'

import { mul } from '../numberish/operations'

import toUsdCurrency from './toUsdCurrency'

/**
 * tokenPrice * amount = totalPrice
 *
 * amount should be decimaled (e.g. 20.323 RAY)
 * @example
 * Eth price: Price {4600 usd/eth}
 * amount: BN {10} (or you can imput Fraction {10})
 * totalPrice: CurrencyAmount { 46000 usd }
 */
export default function toTotalPrice(amount: Numberish | undefined, price: Price | undefined): CurrencyAmount {
  if (!price || !amount) return toUsdCurrency(0)
  return toUsdCurrency(mul(amount, price))
}
