import { AmmV3, Fraction } from '@raydium-io/raydium-sdk'

import {
  decimalToFraction,
  fractionToDecimal,
  recursivelyDecimalToFraction
} from '@/application/txTools/decimal2Fraction'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { div, getMax, mul } from '@/functions/numberish/operations'
import toFraction from '@/functions/numberish/toFraction'
import { Range } from '@/pageComponents/ConcentratedRangeChart/chartUtil'
import { Numberish } from '@/types/constants'

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
  maxDecimals?: number
}

export type PriceBoundaryReturn =
  | {
      priceLowerTick: number
      priceLower: Fraction
      priceUpperTick: number
      priceUpper: Fraction
    }
  | undefined

export function getPriceBoundary({
  coin1,
  coin2,
  reverse,
  ammPool,
  maxDecimals
}: GetChartDataProps): PriceBoundaryReturn {
  if (!ammPool) return
  try {
    const decimals = maxDecimals
      ? maxDecimals
      : coin1 || coin2
      ? Math.max(coin1?.decimals ?? 0, coin2?.decimals ?? 0)
      : 6
    const isStable = ammPool.ammConfig.tradeFeeRate === 100
    const diff = isStable ? 0.01 : 0.2
    const currentPrice = decimalToFraction(ammPool?.state.currentPrice)
    const trimMinX = getMax(currentPrice ? mul(currentPrice, 1 - diff) : 0, 1 / 10 ** decimals)
    const trimMaxX = getMax(currentPrice ? mul(currentPrice, 1 + diff) : 0, 1 / 10 ** decimals)
    const { price: priceMin, tick: tickMin } = getPriceAndTick({
      poolInfo: ammPool.state,
      baseIn: true,
      price: fractionToDecimal(toFraction(trimMinX))
    })
    const { price: priceMax, tick: tickMax } = getPriceAndTick({
      poolInfo: ammPool.state,
      baseIn: true,
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
  } catch (err) {
    return
  }
}

interface GetPriceTick {
  coin1: SplToken
  coin2: SplToken
  reverse: boolean
  ammPool: HydratedConcentratedInfo
  maxDecimals?: number
}

export function getPriceTick({ p, coin1, coin2, reverse, ammPool, maxDecimals }: GetPriceTick & { p: Numberish }) {
  const targetCoin = !reverse ? coin1 : coin2
  try {
    //maxDecimals
    const { price, tick } = getPriceAndTick({
      poolInfo: ammPool.state,
      baseIn: isMintEqual(ammPool.state.mintA.mint, targetCoin?.mint),
      price: fractionToDecimal(toFraction(Math.max(Number(p), 1 / 10 ** (maxDecimals || 6))))
    })
    return { price, tick }
  } catch (err) {
    return
  }
}

export function calLowerUpper({
  min,
  max,
  coin1,
  coin2,
  reverse,
  ammPool,
  maxDecimals
}: GetPriceTick & { [Range.Min]: number; [Range.Max]: number }): PriceBoundaryReturn {
  const resLower = getPriceTick({
    p: min,
    coin1,
    coin2,
    ammPool,
    reverse,
    maxDecimals
  })!
  const resUpper = getPriceTick({
    p: max,
    coin1,
    coin2,
    ammPool,
    reverse,
    maxDecimals
  })!

  return {
    priceLower: resLower.price,
    priceLowerTick: resLower.tick,
    priceUpper: resUpper.price,
    priceUpperTick: resUpper.tick
  }
}
