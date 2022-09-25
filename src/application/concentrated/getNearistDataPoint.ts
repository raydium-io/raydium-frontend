import { div, getMax, mul } from '@/functions/numberish/operations'
import { fractionToDecimal } from '@/application/txTools/decimal2Fraction'
import { recursivelyDecimalToFraction, decimalToFraction } from '@/application/txTools/decimal2Fraction'
import { isMintEqual } from '@/functions/judgers/areEqual'
import toFraction from '@/functions/numberish/toFraction'
import { Fraction } from '@raydium-io/raydium-sdk'
import { AmmV3 } from 'test-r-sdk'
import { SplToken } from '../token/type'
import { HydratedConcentratedInfo } from './type'

export function getPriceAndTick(info: Parameters<typeof AmmV3['getPriceAndTick']>[0]) {
  const result = AmmV3.getPriceAndTick(info)
  return recursivelyDecimalToFraction(result)
}

export function getTickPrice(info: Parameters<typeof AmmV3['getTickPrice']>[0]) {
  const result = AmmV3.getTickPrice(info)
  return recursivelyDecimalToFraction(result)
}

interface GetChartDataProps {
  coin1?: SplToken
  coin2?: SplToken
  reverse: boolean
  ammPool?: HydratedConcentratedInfo
}

export function getPriceBoundary({ coin1, coin2, reverse, ammPool }: GetChartDataProps):
  | {
      priceLowerTick: number
      priceLower: Fraction
      priceUpperTick: number
      priceUpper: Fraction
    }
  | undefined {
  if (!ammPool) return
  const targetCoin = reverse ? coin2 : coin1
  const decimals = coin1 || coin2 ? Math.max(coin1?.decimals ?? 0, coin2?.decimals ?? 0) : 6
  const currentPrice = decimalToFraction(ammPool?.state.currentPrice)
  const trimMinX = getMax(currentPrice ? mul(currentPrice, 1 - 0.5) : 0, 1 / 10 ** decimals)
  const trimMaxX = getMax(currentPrice ? mul(currentPrice, 1 + 0.5) : 0, 1 / 10 ** decimals)
  const { price: priceMin, tick: tickMin } = getPriceAndTick({
    poolInfo: ammPool.state,
    baseIn: isMintEqual(ammPool.state.mintA.mint, targetCoin?.mint),
    price: fractionToDecimal(toFraction(trimMinX))
  })
  const { price: priceMax, tick: tickMax } = getPriceAndTick({
    poolInfo: ammPool.state,
    baseIn: isMintEqual(ammPool.state.mintA.mint, targetCoin?.mint),
    price: fractionToDecimal(toFraction(trimMaxX))
  })
  if (reverse) {
    return {
      priceLowerTick: tickMax,
      priceLower: div(1, priceMax),
      priceUpperTick: tickMin,
      priceUpper: div(1, priceMin)
    }
  }

  return {
    priceLowerTick: tickMin,
    priceLower: priceMin,
    priceUpperTick: tickMax,
    priceUpper: priceMax
  }
}
