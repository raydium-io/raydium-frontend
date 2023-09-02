import toFraction from '@/functions/numberish/toFraction'
import { Numberish } from '@/types/constants'
import { Clmm, ClmmPoolInfo } from '@raydium-io/raydium-sdk'
import { decimalToFraction, fractionToDecimal } from '../txTools/decimal2Fraction'

export function getExactPriceAndTick(params: { price: Numberish; info: ClmmPoolInfo; baseSide: 'base' | 'quote' }) {
  const { tick, price } = Clmm.getPriceAndTick({
    baseIn: params.baseSide === 'base',
    poolInfo: params.info,
    price: fractionToDecimal(toFraction(params.price))
  })
  return { tick, price: decimalToFraction(price) }
}
