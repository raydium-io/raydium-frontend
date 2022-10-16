import { AmmV3, AmmV3PoolPersonalPosition, Price } from 'test-r-sdk'

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
import { p } from 'test-r-sdk/lib/farm-8939b64c'
import { time } from 'console'

export default function hydrateConcentratedInfo(concentratedInfo: SDKParsedConcentratedInfo): HydratedConcentratedInfo {
  const ammPoolInfo = mergeObject(
    concentratedInfo,
    hydratePoolInfo(concentratedInfo),
    hydrateFeeRate(concentratedInfo),
    hydrateBaseInfo(concentratedInfo)
  ) as Omit<HydratedConcentratedInfo, 'userPositionAccount'>
  const userPositionAccount = hydrateUserPositionAccounnt(ammPoolInfo)
  return { ...ammPoolInfo, userPositionAccount }
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
  ammPoolInfo: Omit<HydratedConcentratedInfo, 'userPositionAccount'>
): HydratedConcentratedInfo['userPositionAccount'] {
  const { getToken } = useToken.getState()
  const tokenA = getToken(ammPoolInfo.state.mintA.mint)
  const tokenB = getToken(ammPoolInfo.state.mintB.mint)
  const currentPrice = decimalToFraction(ammPoolInfo.state.currentPrice)
  return ammPoolInfo.positionAccount?.map((info) => {
    const amountA = tokenA ? toTokenAmount(tokenA, info.amountA) : undefined
    const amountB = tokenB ? toTokenAmount(tokenB, info.amountB) : undefined
    const tokenFeeAmountA = tokenA ? toTokenAmount(tokenA, info.tokenFeeAmountA) : undefined
    const tokenFeeAmountB = tokenB ? toTokenAmount(tokenB, info.tokenFeeAmountB) : undefined
    const innerVolumeA = mul(currentPrice, amountA) ?? 0
    const innerVolumeB = mul(currentPrice, amountB) ?? 0
    const positionPercentA = toPercent(div(innerVolumeA, add(innerVolumeA, innerVolumeB)))
    const positionPercentB = toPercent(div(innerVolumeB, add(innerVolumeA, innerVolumeB)))
    const inRange = checkIsInRange(ammPoolInfo, info)
    const poolRewardInfos = ammPoolInfo.state.rewardInfos
    return {
      sdkParsed: info,
      ...recursivelyDecimalToFraction(info),
      amountA,
      amountB,
      nftMint: info.nftMint, // need this or nftMint will be buggy, this is only quick fixed
      liquidity: info.liquidity,
      tokenA,
      tokenB,
      positionPercentA,
      positionPercentB,
      tokenFeeAmountA,
      tokenFeeAmountB,
      inRange,
      rewardInfos: info.rewardInfos
        .map((info, idx) => {
          const token = getToken(poolRewardInfos[idx]?.tokenMint)
          const penddingReward = token ? toTokenAmount(token, info.peddingReward) : undefined
          if (!penddingReward) return
          const apr24h =
            idx === 0
              ? toPercent(ammPoolInfo.state.day.rewardApr.A, { alreadyDecimaled: true })
              : idx === 1
              ? toPercent(ammPoolInfo.state.day.rewardApr.B, { alreadyDecimaled: true })
              : toPercent(ammPoolInfo.state.day.rewardApr.C, { alreadyDecimaled: true })
          const apr7d =
            idx === 0
              ? toPercent(ammPoolInfo.state.week.rewardApr.A, { alreadyDecimaled: true })
              : idx === 1
              ? toPercent(ammPoolInfo.state.week.rewardApr.B, { alreadyDecimaled: true })
              : toPercent(ammPoolInfo.state.week.rewardApr.C, { alreadyDecimaled: true })
          const apr30d =
            idx === 0
              ? toPercent(ammPoolInfo.state.month.rewardApr.A, { alreadyDecimaled: true })
              : idx === 1
              ? toPercent(ammPoolInfo.state.month.rewardApr.B, { alreadyDecimaled: true })
              : toPercent(ammPoolInfo.state.month.rewardApr.C, { alreadyDecimaled: true })
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
      },
      getPositionApr({
        tokenPrices,
        tokenDecimals,
        timeBasis,
        planType,
        chainTimeOffsetMs = 0
      }: {
        tokenPrices: Record<string, Price>
        tokenDecimals: Record<string, number>
        timeBasis: '24h' | '7d' | '30d'
        planType: 'A' | 'B' | 'C'
        chainTimeOffsetMs?: number
      }) {
        if (planType === 'A') {
          if (timeBasis === '24h') {
            const total = [ammPoolInfo.feeApr24h, ...ammPoolInfo.rewardApr24h].reduce((a, b) => add(a, b), toPercent(0))
            return {
              feeApr: ammPoolInfo.feeApr24h,
              rewardsApr: ammPoolInfo.rewardApr24h,
              apr: ammPoolInfo.totalApr24h,
              feePercentInTotal: toPercent(div(ammPoolInfo.feeApr24h, total)),
              rewardsPercentInTotal: ammPoolInfo.rewardApr24h.map((i) => toPercent(div(i, total)))
            }
          } else if (timeBasis === '7d') {
            const total = [ammPoolInfo.feeApr7d, ...ammPoolInfo.rewardApr7d].reduce((a, b) => add(a, b), toPercent(0))
            return {
              feeApr: ammPoolInfo.feeApr7d,
              rewardsApr: ammPoolInfo.rewardApr7d,
              apr: ammPoolInfo.totalApr7d,
              feePercentInTotal: toPercent(div(ammPoolInfo.feeApr7d, total)),
              rewardsPercentInTotal: ammPoolInfo.rewardApr7d.map((i) => toPercent(div(i, total)))
            }
          } else {
            const total = [ammPoolInfo.feeApr30d, ...ammPoolInfo.rewardApr30d].reduce((a, b) => add(a, b), toPercent(0))
            return {
              feeApr: ammPoolInfo.feeApr30d,
              rewardsApr: ammPoolInfo.rewardApr30d,
              apr: ammPoolInfo.totalApr30d,
              feePercentInTotal: toPercent(div(ammPoolInfo.feeApr30d, total)),
              rewardsPercentInTotal: ammPoolInfo.rewardApr30d.map((i) => toPercent(div(i, total)))
            }
          }
        } else if (planType === 'B') {
          const planBApr = AmmV3.estimateAprsForPriceRange({
            poolInfo: ammPoolInfo.state,
            aprType: timeBasis === '24h' ? 'day' : timeBasis === '7d' ? 'week' : 'month',
            mintPrice: tokenPrices,
            positionTickLowerIndex: info.tickLower,
            positionTickUpperIndex: info.tickUpper,
            chainTime: (Date.now() + chainTimeOffsetMs) / 1000,
            rewardMintDecimals: tokenDecimals
          })
          const total = [planBApr.feeApr, ...planBApr.rewardsApr].reduce((a, b) => a + b, 0)
          return {
            feeApr: toPercent(planBApr.feeApr),
            rewardsApr: planBApr.rewardsApr.map((i) => toPercent(i)),
            apr: toPercent(planBApr.apr),
            feePercentInTotal: toPercent(div(planBApr.feeApr, total)),
            rewardsPercentInTotal: planBApr.rewardsApr.map((i) => toPercent(div(i, total)))
          }
        } else {
          // (planType === 'C')
          const planCApr = AmmV3.estimateAprsForPriceRange1({
            poolInfo: ammPoolInfo.state,
            aprType: timeBasis === '24h' ? 'day' : timeBasis === '7d' ? 'week' : 'month',
            mintPrice: tokenPrices,
            positionTickLowerIndex: info.tickLower,
            positionTickUpperIndex: info.tickUpper,
            chainTime: (Date.now() + chainTimeOffsetMs) / 1000,
            rewardMintDecimals: tokenDecimals
          })
          const total = [planCApr.feeApr, ...planCApr.rewardsApr].reduce((a, b) => a + b, 0)
          return {
            feeApr: toPercent(planCApr.feeApr),
            rewardsApr: planCApr.rewardsApr.map((i) => toPercent(i)),
            apr: toPercent(planCApr.apr),
            feePercentInTotal: toPercent(div(planCApr.feeApr, total)),
            rewardsPercentInTotal: planCApr.rewardsApr.map((i) => toPercent(div(i, total)))
          }
        }
      }
    }
  })
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
