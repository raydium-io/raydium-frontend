import toPubString from '@/functions/format/toMintString'
import { toPercent } from '@/functions/format/toPercent'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import toUsdCurrency from '@/functions/format/toUsdCurrency'
import { mergeObject } from '@/functions/merge'
import { gt, lt } from '@/functions/numberish/compare'
import { add, div, mul } from '@/functions/numberish/operations'
import { AmmV3PoolPersonalPosition, Price } from 'test-r-sdk'

import useToken from '../token/useToken'
import { decimalToFraction, recursivelyDecimalToFraction } from '../txTools/decimal2Fraction'

import { HydratedConcentratedInfo, SDKParsedConcentratedInfo } from './type'

export default function hydrateConcentratedInfo(concentratedInfo: SDKParsedConcentratedInfo): HydratedConcentratedInfo {
  return mergeObject(
    concentratedInfo,
    hydratePoolInfo(concentratedInfo),
    hydrateFeeRate(concentratedInfo),
    hydrateUserPositionAccounnt(concentratedInfo),
    hydrateBaseInfo(concentratedInfo)
  ) as HydratedConcentratedInfo
}

/**
 * part of {@link hydrateConcentratedInfo}
 */
function hydrateBaseInfo(sdkConcentratedInfo: SDKParsedConcentratedInfo): Partial<HydratedConcentratedInfo> {
  const currentPrice = decimalToFraction(sdkConcentratedInfo.state.currentPrice)
  return {
    ammConfig: sdkConcentratedInfo.state.ammConfig,
    currentPrice,

    idString: toPubString(sdkConcentratedInfo.state.id),
    tvl: toUsdCurrency(sdkConcentratedInfo.state.tvl),
    fee24h: toUsdCurrency(sdkConcentratedInfo.state.day.feeApr),
    fee7d: toUsdCurrency(sdkConcentratedInfo.state.week.feeApr),
    fee30d: toUsdCurrency(sdkConcentratedInfo.state.month.feeApr),
    apr24h: toPercent(sdkConcentratedInfo.state.day.apr),
    apr7d: toPercent(sdkConcentratedInfo.state.week.apr),
    apr30d: toPercent(sdkConcentratedInfo.state.month.apr),
    feeApr24h: toPercent(sdkConcentratedInfo.state.day.feeApr),
    feeApr7d: toPercent(sdkConcentratedInfo.state.week.feeApr),
    feeApr30d: toPercent(sdkConcentratedInfo.state.month.feeApr),
    volume24h: toUsdCurrency(sdkConcentratedInfo.state.day.volume),
    volume7d: toUsdCurrency(sdkConcentratedInfo.state.week.volume),
    volume30d: toUsdCurrency(sdkConcentratedInfo.state.month.volume),
    rewardsA24h: sdkConcentratedInfo.state.day.feeA,
    rewardsB24h: sdkConcentratedInfo.state.day.feeB,
    rewardsA7d: sdkConcentratedInfo.state.week.feeA,
    rewardsB7d: sdkConcentratedInfo.state.week.feeB,
    rewardsA30d: sdkConcentratedInfo.state.month.feeA,
    rewardsB30d: sdkConcentratedInfo.state.month.feeB
  }
}
/**
 * part of {@link hydrateConcentratedInfo}
 */
function hydratePoolInfo(sdkConcentratedInfo: SDKParsedConcentratedInfo): Partial<HydratedConcentratedInfo> {
  const { getToken } = useToken.getState()
  const base = getToken(sdkConcentratedInfo.state.mintA.mint)
  const quote = getToken(sdkConcentratedInfo.state.mintB.mint)
  const name = (base ? base.symbol : 'unknown') + '-' + (quote ? quote?.symbol : 'unknown')

  return {
    id: sdkConcentratedInfo.state.id,
    base,
    quote,
    name
  }
}

/**
 * part of {@link hydrateConcentratedInfo}
 */
function hydrateFeeRate(sdkConcentratedInfo: SDKParsedConcentratedInfo): Partial<HydratedConcentratedInfo> {
  return {
    protocolFeeRate: toPercent(div(sdkConcentratedInfo.state.ammConfig.protocolFeeRate, 10 ** 8)),
    tradeFeeRate: toPercent(div(sdkConcentratedInfo.state.ammConfig.tradeFeeRate, 10 ** 6))
  }
}

/**
 * part of {@link hydrateConcentratedInfo}
 */
function hydrateUserPositionAccounnt(
  sdkConcentratedInfo: SDKParsedConcentratedInfo
): Pick<HydratedConcentratedInfo, 'userPositionAccount'> {
  const { getToken } = useToken.getState()
  const tokenA = getToken(sdkConcentratedInfo.state.mintA.mint)
  const tokenB = getToken(sdkConcentratedInfo.state.mintB.mint)
  const currentPrice = decimalToFraction(sdkConcentratedInfo.state.currentPrice)
  return {
    userPositionAccount: sdkConcentratedInfo.positionAccount?.map((a) => {
      const amountA = tokenA ? toTokenAmount(tokenA, a.amountA) : undefined
      const amountB = tokenB ? toTokenAmount(tokenB, a.amountB) : undefined
      const tokenFeeAmountA = tokenA ? toTokenAmount(tokenA, a.tokenFeeAmountA) : undefined
      const tokenFeeAmountB = tokenB ? toTokenAmount(tokenB, a.tokenFeeAmountB) : undefined
      const innerVolumeA = mul(currentPrice, amountA) ?? 0
      const innerVolumeB = mul(currentPrice, amountB) ?? 0
      const positionPercentA = toPercent(div(innerVolumeA, add(innerVolumeA, innerVolumeB)))
      const positionPercentB = toPercent(div(innerVolumeB, add(innerVolumeA, innerVolumeB)))
      const inRange = checkIsInRange(sdkConcentratedInfo, a)
      return {
        sdkParsed: a,
        ...recursivelyDecimalToFraction(a),
        amountA,
        amountB,
        nftMint: a.nftMint, // need this or nftMint will be buggy, this is only quick fixed
        liquidity: a.liquidity,
        tokenA,
        tokenB,
        positionPercentA,
        positionPercentB,
        tokenFeeAmountA,
        tokenFeeAmountB,
        inRange,
        getLiquidityVolume: (tokenPrices: Record<string, Price>) => {
          const aPrice = tokenPrices[toPubString(tokenA?.mint)]
          const bPrice = tokenPrices[toPubString(tokenB?.mint)]
          const wholeLiquidity = add(mul(amountA, aPrice), mul(amountB, bPrice))
          return {
            wholeLiquidity,
            baseLiquidity: mul(wholeLiquidity, positionPercentA),
            quoteLiquidity: mul(wholeLiquidity, positionPercentB)
          }
        }
      }
    })
  }
}

function checkIsInRange(
  sdkConcentratedInfo: SDKParsedConcentratedInfo,
  userPositionAccount: AmmV3PoolPersonalPosition
) {
  const currentPrice = decimalToFraction(sdkConcentratedInfo.state.currentPrice)
  const priceLower = decimalToFraction(userPositionAccount.priceLower)
  const priceUpper = decimalToFraction(userPositionAccount.priceUpper)
  return gt(currentPrice, priceLower) && lt(currentPrice, priceUpper)
}
