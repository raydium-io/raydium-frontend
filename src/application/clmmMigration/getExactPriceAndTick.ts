import toFraction from '@/functions/numberish/toFraction'
import { Numberish } from '@/types/constants'
import { AmmV3, AmmV3PoolInfo } from '@raydium-io/raydium-sdk'
import { decimalToFraction, fractionToDecimal } from '../txTools/decimal2Fraction'

export function getExactPriceAndTick(params: { price: Numberish; info: AmmV3PoolInfo; baseSide: 'base' | 'quote' }) {
  const { tick, price } = AmmV3.getPriceAndTick({
    baseIn: params.baseSide === 'base',
    poolInfo: params.info,
    price: fractionToDecimal(toFraction(params.price))
  })
  return { tick, price: decimalToFraction(price) }
}
