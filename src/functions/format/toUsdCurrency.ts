import BN from 'bn.js'
import { CurrencyAmount, Fraction, TEN } from 'test-r-sdk'

import parseNumberInfo from '@/functions/numberish/parseNumberInfo'
import toBN from '@/functions/numberish/toBN'
import { Numberish } from '@/types/constants'

import { mul } from '../numberish/operations'
import toFraction from '../numberish/toFraction'

import { usdCurrency } from './toTokenPrice'

export default function toUsdCurrency(amount: Numberish) {
  const amountBigNumber = toBN(mul(amount, 10 ** usdCurrency.decimals))
  return new CurrencyAmount(usdCurrency, amountBigNumber)
}
