import { AmmV3PoolPersonalPosition, Price } from '@raydium-io/raydium-sdk'
import { PublicKey } from '@solana/web3.js'

import { BN } from 'bn.js'

import toPubString from '@/functions/format/toMintString'
import { toPercent } from '@/functions/format/toPercent'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import toUsdCurrency from '@/functions/format/toUsdCurrency'
import { coverlyMergeObject } from '@/functions/merge'
import { gt, lt } from '@/functions/numberish/compare'
import { add, div, mul } from '@/functions/numberish/operations'
import toFraction from '@/functions/numberish/toFraction'

import { SplToken } from '../token/type'
import useToken from '../token/useToken'
import { createSplToken } from '../token/useTokenListsLoader'
import { decimalToFraction, recursivelyDecimalToFraction } from '../txTools/decimal2Fraction'

import {
  GetAprParameters,
  GetAprPoolTickParameters,
  GetAprPositionParameters,
  getPoolAprCore,
  getPoolTickAprCore,
  getPositonAprCore
} from './calcApr'
import { HydratedConcentratedInfo, SDKParsedConcentratedInfo, UserPositionAccount } from './type'

export default function hydrateConcentratedInfo(concentratedInfo: SDKParsedConcentratedInfo): HydratedConcentratedInfo {
  const hydrate1 = hydratePoolInfo(concentratedInfo)
  const hydrate2 = hydrateFeeRate(concentratedInfo)
  const hydrate3 = hydrateBaseInfo(concentratedInfo)
  const rawAmmPoolInfo = coverlyMergeObject(concentratedInfo, hydrate1, hydrate2, hydrate3) as Omit<
    HydratedConcentratedInfo,
    'userPositionAccount'
  >
  const getters = hydrateAprGetter(rawAmmPoolInfo)
  const ammPoolInfo = coverlyMergeObject(rawAmmPoolInfo, getters)
  const userPositionAccount = hydrateUserPositionAccounnt(ammPoolInfo)
  return coverlyMergeObject(ammPoolInfo, { userPositionAccount })
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

  const newRewardInfos = sdkConcentratedInfo.state.rewardInfos.map((r) => {
    const rewardToken = getToken(r.tokenMint)
    return coverlyMergeObject(r, {
      get perSecond() {
        return toFraction(r.perSecond.toString())
      },
      get rewardToken() {
        return rewardToken
      },
      get openTime() {
        return r.openTime.toNumber() * 1000
      },
      get endTime() {
        return r.endTime.toNumber() * 1000
      },
      get creator() {
        return sdkConcentratedInfo.state.creator
      },
      get lastUpdateTime() {
        return r.lastUpdateTime.toNumber() * 1000
      },
      get rewardClaimed() {
        return rewardToken ? toTokenAmount(rewardToken, r.rewardClaimed) : undefined
      },
      get rewardTotalEmissioned() {
        return rewardToken ? toTokenAmount(rewardToken, r.rewardTotalEmissioned) : undefined
      },
      get rewardPerWeek() {
        return rewardToken && toTokenAmount(rewardToken, mul(decimalToFraction(r.perSecond), 86400 * 7))
      },
      get rewardPerDay() {
        return rewardToken && toTokenAmount(rewardToken, mul(decimalToFraction(r.perSecond), 86400))
      }
    })
  })

  const part1 = {
    ammConfig: sdkConcentratedInfo.state.ammConfig,
    currentPrice,
    creator: sdkConcentratedInfo.state.creator,
    rewardInfos: newRewardInfos,
    idString: toPubString(sdkConcentratedInfo.state.id),
    tvl: toUsdCurrency(sdkConcentratedInfo.state.tvl)
  }

  const part2 = {
    get totalApr24h() {
      return toPercent(sdkConcentratedInfo.state.day.apr, { alreadyDecimaled: true })
    },
    get totalApr7d() {
      return toPercent(sdkConcentratedInfo.state.week.apr, { alreadyDecimaled: true })
    },
    get totalApr30d() {
      return toPercent(sdkConcentratedInfo.state.month.apr, { alreadyDecimaled: true })
    },
    get feeApr24h() {
      return toPercent(sdkConcentratedInfo.state.day.feeApr, { alreadyDecimaled: true })
    },
    get feeApr7d() {
      return toPercent(sdkConcentratedInfo.state.week.feeApr, { alreadyDecimaled: true })
    },
    get feeApr30d() {
      return toPercent(sdkConcentratedInfo.state.month.feeApr, { alreadyDecimaled: true })
    },
    get rewardApr24h() {
      return [
        toPercent(sdkConcentratedInfo.state.day.rewardApr.A, { alreadyDecimaled: true }),
        toPercent(sdkConcentratedInfo.state.day.rewardApr.B, { alreadyDecimaled: true }),
        toPercent(sdkConcentratedInfo.state.day.rewardApr.C, { alreadyDecimaled: true })
      ].slice(0, rewardLength)
    },
    get rewardApr7d() {
      return [
        toPercent(sdkConcentratedInfo.state.week.rewardApr.A, { alreadyDecimaled: true }),
        toPercent(sdkConcentratedInfo.state.week.rewardApr.B, { alreadyDecimaled: true }),
        toPercent(sdkConcentratedInfo.state.week.rewardApr.C, { alreadyDecimaled: true })
      ].slice(0, rewardLength)
    },
    get rewardApr30d() {
      return [
        toPercent(sdkConcentratedInfo.state.month.rewardApr.A, { alreadyDecimaled: true }),
        toPercent(sdkConcentratedInfo.state.month.rewardApr.B, { alreadyDecimaled: true }),
        toPercent(sdkConcentratedInfo.state.month.rewardApr.C, { alreadyDecimaled: true })
      ].slice(0, rewardLength)
    }
  }
  const part3 = {
    get volume24h() {
      return toUsdCurrency(sdkConcentratedInfo.state.day.volume)
    },
    get volume7d() {
      return toUsdCurrency(sdkConcentratedInfo.state.week.volume)
    },
    get volume30d() {
      return toUsdCurrency(sdkConcentratedInfo.state.month.volume)
    },
    get volumeFee24h() {
      return toUsdCurrency(sdkConcentratedInfo.state.day.volumeFee)
    },
    get volumeFee7d() {
      return toUsdCurrency(sdkConcentratedInfo.state.week.volumeFee)
    },
    get volumeFee30d() {
      return toUsdCurrency(sdkConcentratedInfo.state.month.volumeFee)
    },
    get fee24hA() {
      return tokenA ? toTokenAmount(tokenA, sdkConcentratedInfo.state.day.feeA, { alreadyDecimaled: true }) : undefined
    },
    get fee24hB() {
      return tokenB ? toTokenAmount(tokenB, sdkConcentratedInfo.state.day.feeB, { alreadyDecimaled: true }) : undefined
    },
    get fee7dA() {
      return tokenA ? toTokenAmount(tokenA, sdkConcentratedInfo.state.week.feeA, { alreadyDecimaled: true }) : undefined
    },
    get fee7dB() {
      return tokenB ? toTokenAmount(tokenB, sdkConcentratedInfo.state.week.feeB, { alreadyDecimaled: true }) : undefined
    },
    get fee30dA() {
      return tokenA
        ? toTokenAmount(tokenA, sdkConcentratedInfo.state.month.feeA, { alreadyDecimaled: true })
        : undefined
    },
    get fee30dB() {
      return tokenB
        ? toTokenAmount(tokenB, sdkConcentratedInfo.state.month.feeB, { alreadyDecimaled: true })
        : undefined
    }
  }

  return coverlyMergeObject(part1, part2, part3)
}
/**
 * part of {@link hydrateConcentratedInfo}
 */
function hydrateAprGetter(
  ammPoolInfo: Omit<HydratedConcentratedInfo, 'userPositionAccount'>
): Partial<HydratedConcentratedInfo> {
  return {
    getApr: (args: Omit<GetAprParameters, 'ammPoolInfo' | 'poolRewardInfos'>) =>
      getPoolAprCore({
        ...args,
        ammPoolInfo,
        poolRewardTokens: ammPoolInfo.state.rewardInfos.map((r) => r.tokenMint)
      }),
    getTickApr: (args: Omit<GetAprPoolTickParameters, 'ammPoolInfo' | 'poolRewardInfos'>) =>
      getPoolTickAprCore({
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
    name,
    liquidity: sdkConcentratedInfo.state.liquidity
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

const u64 = new BN(1).shln(64)
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
    const originAmountA = tokenA ? toTokenAmount(tokenA, info.amountA) : undefined
    const originAmountB = tokenB ? toTokenAmount(tokenB, info.amountB) : undefined
    const tokenFeeAmountA = tokenA ? toTokenAmount(tokenA, info.tokenFeeAmountA) : undefined
    const tokenFeeAmountB = tokenB ? toTokenAmount(tokenB, info.tokenFeeAmountB) : undefined
    const innerVolumeA = mul(currentPrice, amountA) ?? 0
    const innerVolumeB = amountB ?? 0
    const positionPercentA = toPercent(div(innerVolumeA, add(innerVolumeA, innerVolumeB)))
    const positionPercentB = toPercent(div(innerVolumeB, add(innerVolumeA, innerVolumeB)))
    const inRange = checkIsInRange(ammPoolInfo, info)
    const poolRewardInfos = ammPoolInfo.state.rewardInfos
    const positionRewardInfos = info.rewardInfos
      .map((info, idx) => {
        const token = getToken(poolRewardInfos[idx]?.tokenMint)
        const pendingRewardAmount = gt(info.pendingReward, u64) ? 0 : info.pendingReward // if tooo large, it should be zero, it's just rpc's calculation error
        const penddingReward = token ? toTokenAmount(token, pendingRewardAmount) : undefined
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
        return { penddingReward, apr24h, apr7d, apr30d, token }
      })
      .filter((info) => Boolean(info?.penddingReward)) as UserPositionAccount['rewardInfos']
    return {
      sdkParsed: info,
      ...recursivelyDecimalToFraction(info),
      amountA,
      amountB,
      originAmountA,
      originAmountB,
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
      getApr(args: Omit<GetAprPositionParameters, 'tickLower' | 'tickUpper' | 'ammPoolInfo' | 'poolRewardInfos'>) {
        return getPositonAprCore({
          ...args,
          ammPoolInfo,
          positionAccount: info,
          poolRewardTokens: poolRewardInfos.map((i) => i.tokenMint)
        })
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
