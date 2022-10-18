import { PublicKey } from '@solana/web3.js'

import { AmmV3, AmmV3PoolPersonalPosition, Price, PublicKeyish, Token } from 'test-r-sdk'

import toPubString from '@/functions/format/toMintString'
import { toPercent } from '@/functions/format/toPercent'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import toUsdCurrency from '@/functions/format/toUsdCurrency'
import { mergeObject } from '@/functions/merge'
import { gt, lt } from '@/functions/numberish/compare'
import { add, div, mul } from '@/functions/numberish/operations'

import { SplToken } from '../token/type'
import useToken from '../token/useToken'
import { createSplToken } from '../token/useTokenListsLoader'
import { decimalToFraction, recursivelyDecimalToFraction } from '../txTools/decimal2Fraction'

import { HydratedConcentratedInfo, SDKParsedConcentratedInfo, UserPositionAccount } from './type'

export default function hydrateConcentratedInfo(concentratedInfo: SDKParsedConcentratedInfo): HydratedConcentratedInfo {
  const rawAmmPoolInfo = mergeObject(
    concentratedInfo,
    hydratePoolInfo(concentratedInfo),
    hydrateFeeRate(concentratedInfo),
    hydrateBaseInfo(concentratedInfo)
  ) as Omit<HydratedConcentratedInfo, 'userPositionAccount'>
  const getters = { ...hydrateAprGetter(rawAmmPoolInfo) }
  const ammPoolInfo = { ...rawAmmPoolInfo, ...getters }
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
function hydrateAprGetter(
  ammPoolInfo: Omit<HydratedConcentratedInfo, 'userPositionAccount'>
): Partial<HydratedConcentratedInfo> {
  return {
    getApr: (args: Omit<GetAprParameters, 'ammPoolInfo' | 'poolRewardInfos'>) =>
      getAprCore({
        ...args,
        ammPoolInfo,
        poolRewardTokens: ammPoolInfo.state.rewardInfos.map((r) => r.tokenMint)
      })
  }
}
/**
 * part of {@link hydrateConcentratedInfo}
 */
function hydratePoolInfo(sdkConcentratedInfo: SDKParsedConcentratedInfo): Partial<HydratedConcentratedInfo> {
  const base = getTokenEvenUnknow(sdkConcentratedInfo.state.mintA.mint, sdkConcentratedInfo.state.mintA.decimals)
  const quote = getTokenEvenUnknow(sdkConcentratedInfo.state.mintB.mint, sdkConcentratedInfo.state.mintB.decimals)
  const name =
    (base
      ? base.symbol
      : sdkConcentratedInfo.state.mintA.mint
      ? toPubString(sdkConcentratedInfo.state.mintA.mint).substring(0, 6)
      : 'unknown') +
    '-' +
    (quote
      ? quote?.symbol
      : sdkConcentratedInfo.state.mintB.mint
      ? toPubString(sdkConcentratedInfo.state.mintB.mint).substring(0, 6)
      : 'unknown')

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
    const positionRewardInfos = info.rewardInfos
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
      .filter((info) => Boolean(info?.penddingReward)) as UserPositionAccount['rewardInfos']
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
      rewardInfos: positionRewardInfos,
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
      getApr(args: Omit<GetAprParameters, 'tickLower' | 'tickUpper' | 'ammPoolInfo' | 'poolRewardInfos'>) {
        return getAprCore({
          ...args,
          tickLower: info.tickLower,
          tickUpper: info.tickUpper,
          ammPoolInfo,
          poolRewardTokens: poolRewardInfos.map((i) => i.tokenMint)
        })
      }
    }
  })
}
type GetAprParameters = {
  tickLower: number
  tickUpper: number
  ammPoolInfo: Omit<HydratedConcentratedInfo, 'userPositionAccount'>
  poolRewardTokens: PublicKeyish[]
  tokenPrices: Record<string, Price>
  tokenDecimals: Record<string, number>
  timeBasis: '24h' | '7d' | '30d'
  planType: 'A' | 'B' | 'C'
  chainTimeOffsetMs?: number
}

function getAprCore({
  tickLower,
  tickUpper,
  ammPoolInfo,
  poolRewardTokens,
  tokenPrices,
  tokenDecimals,
  timeBasis,
  planType,
  chainTimeOffsetMs = 0
}: GetAprParameters) {
  const { getToken } = useToken.getState()
  if (planType === 'A') {
    if (timeBasis === '24h') {
      const total = [ammPoolInfo.feeApr24h, ...ammPoolInfo.rewardApr24h].reduce((a, b) => add(a, b), toPercent(0))
      return {
        fee: {
          apr: ammPoolInfo.feeApr24h,
          percentInTotal: toPercent(div(ammPoolInfo.feeApr24h, total))
        },
        rewards: ammPoolInfo.rewardApr30d.map((i, idx) => ({
          percentInTotal: toPercent(div(i, total)),
          apr: i,
          token: getToken(poolRewardTokens[idx])
        })),
        apr: ammPoolInfo.totalApr24h
      }
    } else if (timeBasis === '7d') {
      const total = [ammPoolInfo.feeApr7d, ...ammPoolInfo.rewardApr7d].reduce((a, b) => add(a, b), toPercent(0))
      return {
        fee: {
          apr: ammPoolInfo.feeApr7d,
          percentInTotal: toPercent(div(ammPoolInfo.feeApr7d, total))
        },
        rewards: ammPoolInfo.rewardApr30d.map((i, idx) => ({
          percentInTotal: toPercent(div(i, total)),
          apr: i,
          token: getToken(poolRewardTokens[idx])
        })),
        apr: ammPoolInfo.totalApr7d
      }
    } else {
      const total = [ammPoolInfo.feeApr30d, ...ammPoolInfo.rewardApr30d].reduce((a, b) => add(a, b), toPercent(0))
      return {
        fee: {
          apr: ammPoolInfo.feeApr30d,
          percentInTotal: toPercent(div(ammPoolInfo.feeApr30d, total))
        },
        rewards: ammPoolInfo.rewardApr30d.map((i, idx) => ({
          percentInTotal: toPercent(div(i, total)),
          apr: i,
          token: getToken(poolRewardTokens[idx])
        })),
        apr: ammPoolInfo.totalApr30d
      }
    }
  } else if (planType === 'B') {
    const planBApr = AmmV3.estimateAprsForPriceRangeOrca({
      poolInfo: ammPoolInfo.state,
      aprType: timeBasis === '24h' ? 'day' : timeBasis === '7d' ? 'week' : 'month',
      mintPrice: tokenPrices,
      positionTickLowerIndex: Math.min(tickLower, tickUpper),
      positionTickUpperIndex: Math.max(tickLower, tickUpper),
      chainTime: (Date.now() + chainTimeOffsetMs) / 1000,
      rewardMintDecimals: tokenDecimals
    })
    const slicedRewardApr = planBApr.rewardsApr.slice(0, poolRewardTokens.length)
    const total = [planBApr.feeApr, ...slicedRewardApr].reduce((a, b) => a + b, 0)
    return {
      fee: {
        apr: toPercent(planBApr.feeApr, { alreadyDecimaled: true }),
        percentInTotal: toPercent(div(planBApr.feeApr, total))
      },
      rewards: slicedRewardApr.map((i, idx) => ({
        apr: toPercent(i, { alreadyDecimaled: true }),
        percentInTotal: div(i, total),
        token: getToken(poolRewardTokens[idx])
      })),
      apr: toPercent(planBApr.apr, { alreadyDecimaled: true })
    }
  } else {
    // (planType === 'C')
    const planCApr = AmmV3.estimateAprsForPriceRange({
      poolInfo: ammPoolInfo.state,
      aprType: timeBasis === '24h' ? 'day' : timeBasis === '7d' ? 'week' : 'month',
      positionTickLowerIndex: Math.min(tickLower, tickUpper),
      positionTickUpperIndex: Math.max(tickLower, tickUpper)
    })
    const slicedRewardApr = planCApr.rewardsApr.slice(0, poolRewardTokens.length)
    const total = [planCApr.feeApr, ...slicedRewardApr].reduce((a, b) => a + b, 0)
    return {
      fee: {
        apr: toPercent(planCApr.feeApr, { alreadyDecimaled: true }),
        percentInTotal: toPercent(div(planCApr.feeApr, total))
      },
      rewards: slicedRewardApr.map((i, idx) => ({
        apr: toPercent(i, { alreadyDecimaled: true }),
        percentInTotal: div(i, total),
        token: getToken(poolRewardTokens[idx])
      })),
      apr: toPercent(planCApr.apr, { alreadyDecimaled: true })
    }
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

function getTokenEvenUnknow(mint: PublicKey, decimal?: number): SplToken | undefined {
  const { getToken } = useToken.getState()
  const candidateToken = getToken(mint)
  if (candidateToken) {
    return candidateToken
  } else if (decimal === undefined) {
    return undefined
  } else {
    const tokenSymbolString = toPubString(mint).substring(0, 6)
    return createSplToken({
      mint: toPubString(mint),
      decimals: decimal,
      symbol: tokenSymbolString
    })
  }
}
