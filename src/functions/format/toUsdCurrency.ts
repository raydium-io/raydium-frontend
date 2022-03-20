import BN from 'bn.js'

import parseNumberInfo from '@/functions/numberish/parseNumberInfo'
import toBN from '@/functions/numberish/toBN'
import { Numberish } from '@/types/constants'
import { CurrencyAmount, Fraction, TEN } from '@raydium-io/raydium-sdk'

import { usdCurrency } from './toTokenPrice'
import toFraction from '../numberish/toFraction'
import { mul } from '../numberish/operations'

export default function toUsdCurrency(amount: Numberish) {
  const amountBigNumber = toBN(mul(amount, 10 ** usdCurrency.decimals))
  return new CurrencyAmount(usdCurrency, amountBigNumber)
}
