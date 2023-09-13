import { CurrencyAmount } from '@raydium-io/raydium-sdk'

import toBN from '@/functions/numberish/toBN'
import { Numberish } from '@/types/constants'

import { mul } from '../numberish/operations'

import { usdCurrency } from './toTokenPrice'

export default function toUsdCurrency(amount: Numberish) {
  const amountBigNumber = toBN(mul(amount, 10 ** usdCurrency.decimals))
  return new CurrencyAmount(usdCurrency, amountBigNumber)
}
