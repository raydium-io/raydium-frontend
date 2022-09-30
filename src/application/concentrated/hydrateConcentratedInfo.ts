import { AmmV3PoolPersonalPosition, Price } from 'test-r-sdk'

import toPubString from '@/functions/format/toMintString'
import { toPercent } from '@/functions/format/toPercent'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import toUsdCurrency from '@/functions/format/toUsdCurrency'
import { mergeObject } from '@/functions/merge'
import { gt, lt } from '@/functions/numberish/compare'
import { add, div, mul } from '@/functions/numberish/operations'

import useToken from '../token/useToken'
import { decimalToFraction, recursivelyDecimalToFraction } from '../txTools/decimal2Fraction'

import { HydratedConcentratedInfo, SDKParsedConcentratedInfo, UserPositionAccount } from './type'

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
  const { getToken } = useToken.getState()
  const tokenA = getToken(sdkConcentratedInfo.state.mintA.mint)
  const tokenB = getToken(sdkConcentratedInfo.state.mintB.mint)
  const rewardLength = sdkConcentratedInfo.state.rewardInfos.length
  return {
    ammConfig: sdkConcentratedInfo.state.ammConfig,
    currentPrice,

    rewardInfos: sdkConcentratedInfo.state.rewardInfos.map((r) => {
      const rewardToken = getToken(r.tokenMint)
      return {
        ...r,
        rewardToken,
        openTime: r.openTime.toNumber() * 1000,
        endTime: r.endTime.toNumber() * 1000,
        lastUpdateTime: r.lastUpdateTime.toNumber() * 1000,
        rewardClaimed: rewardToken ? toTokenAmount(rewardToken, r.rewardClaimed) : undefined,
        rewardTotalEmissioned: rewardToken ? toTokenAmount(rewardToken, r.rewardTotalEmissioned) : undefined
      }
    }),

    idString: toPubString(sdkConcentratedInfo.state.id),
    tvl: toUsdCurrency(sdkConcentratedInfo.state.tvl),

    totalApr24h: toPercent(sdkConcentratedInfo.state.day.apr, { alreadyDecimaled: true }),
    totalApr7d: toPercent(sdkConcentratedInfo.state.week.apr, { alreadyDecimaled: true }),
    totalApr30d: toPercent(sdkConcentratedInfo.state.month.apr, { alreadyDecimaled: true }),
    feeApr24h: toPercent(sdkConcentratedInfo.state.day.feeApr, { alreadyDecimaled: true }),
    feeApr7d: toPercent(sdkConcentratedInfo.state.week.feeApr, { alreadyDecimaled: true }),
    feeApr30d: toPercent(sdkConcentratedInfo.state.month.feeApr, { alreadyDecimaled: true }),
    rewardApr24h: [
      toPercent(sdkConcentratedInfo.state.day.rewardApr.A, { alreadyDecimaled: true }),
      toPercent(sdkConcentratedInfo.state.day.rewardApr.B, { alreadyDecimaled: true }),
      toPercent(sdkConcentratedInfo.state.day.rewardApr.C, { alreadyDecimaled: true })
    ].slice(0, rewardLength),
    rewardApr7d: [
      toPercent(sdkConcentratedInfo.state.week.rewardApr.A, { alreadyDecimaled: true }),
      toPercent(sdkConcentratedInfo.state.week.rewardApr.B, { alreadyDecimaled: true }),
      toPercent(sdkConcentratedInfo.state.week.rewardApr.C, { alreadyDecimaled: true })
    ].slice(0, rewardLength),
    rewardApr30d: [
      toPercent(sdkConcentratedInfo.state.month.rewardApr.A, { alreadyDecimaled: true }),
      toPercent(sdkConcentratedInfo.state.month.rewardApr.B, { alreadyDecimaled: true }),
      toPercent(sdkConcentratedInfo.state.month.rewardApr.C, { alreadyDecimaled: true })
    ].slice(0, rewardLength),

    volume24h: toUsdCurrency(sdkConcentratedInfo.state.day.volume),
    volume7d: toUsdCurrency(sdkConcentratedInfo.state.week.volume),
    volume30d: toUsdCurrency(sdkConcentratedInfo.state.month.volume),

    volumeFee24h: toUsdCurrency(sdkConcentratedInfo.state.day.volumeFee),
    volumeFee7d: toUsdCurrency(sdkConcentratedInfo.state.week.volumeFee),
    volumeFee30d: toUsdCurrency(sdkConcentratedInfo.state.month.volumeFee),

    fee24hA: tokenA ? toTokenAmount(tokenA, sdkConcentratedInfo.state.day.feeA, { alreadyDecimaled: true }) : undefined,
    fee24hB: tokenB ? toTokenAmount(tokenB, sdkConcentratedInfo.state.day.feeB, { alreadyDecimaled: true }) : undefined,
    fee7dA: tokenA ? toTokenAmount(tokenA, sdkConcentratedInfo.state.week.feeA, { alreadyDecimaled: true }) : undefined,
    fee7dB: tokenB ? toTokenAmount(tokenB, sdkConcentratedInfo.state.week.feeB, { alreadyDecimaled: true }) : undefined,
    fee30dA: tokenA
      ? toTokenAmount(tokenA, sdkConcentratedInfo.state.month.feeA, { alreadyDecimaled: true })
      : undefined,
    fee30dB: tokenB
      ? toTokenAmount(tokenB, sdkConcentratedInfo.state.month.feeB, { alreadyDecimaled: true })
      : undefined
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
    protocolFeeRate: toPercent(div(sdkConcentratedInfo.state.ammConfig.protocolFeeRate, 10 ** 4), {
      alreadyDecimaled: true
    }),
    tradeFeeRate: toPercent(div(sdkConcentratedInfo.state.ammConfig.tradeFeeRate, 10 ** 4), {
      alreadyDecimaled: true
    })
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
      const poolRewardInfos = sdkConcentratedInfo.state.rewardInfos
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
        rewardInfos: a.rewardInfos
          .map((info, idx) => {
            const token = getToken(poolRewardInfos[idx]?.tokenMint)
            const penddingReward = token ? toTokenAmount(token, info.peddingReward) : undefined
            if (!penddingReward) return
            const apr24h =
              idx === 0
                ? toPercent(sdkConcentratedInfo.state.day.rewardApr.A, { alreadyDecimaled: true })
                : idx === 1
                ? toPercent(sdkConcentratedInfo.state.day.rewardApr.B, { alreadyDecimaled: true })
                : toPercent(sdkConcentratedInfo.state.day.rewardApr.C, { alreadyDecimaled: true })
            const apr7d =
              idx === 0
                ? toPercent(sdkConcentratedInfo.state.week.rewardApr.A, { alreadyDecimaled: true })
                : idx === 1
                ? toPercent(sdkConcentratedInfo.state.week.rewardApr.B, { alreadyDecimaled: true })
                : toPercent(sdkConcentratedInfo.state.week.rewardApr.C, { alreadyDecimaled: true })
            const apr30d =
              idx === 0
                ? toPercent(sdkConcentratedInfo.state.month.rewardApr.A, { alreadyDecimaled: true })
                : idx === 1
                ? toPercent(sdkConcentratedInfo.state.month.rewardApr.B, { alreadyDecimaled: true })
                : toPercent(sdkConcentratedInfo.state.month.rewardApr.C, { alreadyDecimaled: true })
            return { penddingReward, apr24h, apr7d, apr30d }
          })
          .filter((info) => Boolean(info?.penddingReward)) as UserPositionAccount['rewardInfos'],
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
