import { AmmV3, AmmV3PoolPersonalPosition, Price, PublicKeyish } from 'test-r-sdk'
import { toPercent } from '@/functions/format/toPercent'
import { add, div } from '@/functions/numberish/operations'
import useToken from '../token/useToken'
import { HydratedConcentratedInfo } from './type'

export type GetAprParameters = {
  ammPoolInfo: Omit<HydratedConcentratedInfo, 'userPositionAccount'>
  poolRewardTokens: PublicKeyish[]
  timeBasis: '24h' | '7d' | '30d'
}
export function getPoolAprCore({ ammPoolInfo, poolRewardTokens, timeBasis }: GetAprParameters) {
  const { getToken } = useToken.getState()
  if (timeBasis === '24h') {
    const total = [ammPoolInfo.feeApr24h, ...ammPoolInfo.rewardApr24h].reduce((a, b) => add(a, b), toPercent(0))
    return {
      fee: {
        apr: ammPoolInfo.feeApr24h,
        percentInTotal: toPercent(div(ammPoolInfo.feeApr24h, total))
      },
      rewards: ammPoolInfo.rewardApr24h.map((i, idx) => ({
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
      rewards: ammPoolInfo.rewardApr7d.map((i, idx) => ({
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
}
export type GetAprPoolTickParameters = {
  ammPoolInfo: Omit<HydratedConcentratedInfo, 'userPositionAccount'>
  tickLower: number
  tickUpper: number
  poolRewardTokens: PublicKeyish[]
  tokenPrices: Record<string, Price>
  tokenDecimals: Record<string, number>
  timeBasis: '24h' | '7d' | '30d'
  planType: 'D' | 'C'
  chainTimeOffsetMs?: number
}
export function getPoolTickAprCore({
  ammPoolInfo,
  tickLower,
  tickUpper,
  poolRewardTokens,
  tokenPrices,
  tokenDecimals,
  timeBasis,
  planType,
  chainTimeOffsetMs = 0
}: GetAprPoolTickParameters) {
  const { getToken } = useToken.getState()
  if (planType === 'D') {
    const planBApr = AmmV3.estimateAprsForPriceRangeDelta({
      poolInfo: ammPoolInfo.state,
      aprType: timeBasis === '24h' ? 'day' : timeBasis === '7d' ? 'week' : 'month',
      mintPrice: tokenPrices,
      positionTickLowerIndex: Math.min(tickLower, tickUpper),
      positionTickUpperIndex: Math.max(tickLower, tickUpper),
      chainTime: (Date.now() + chainTimeOffsetMs) / 1000,
      rewardMintDecimals: tokenDecimals,
      liquidity: ammPoolInfo.state.liquidity
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
    const planCApr = AmmV3.estimateAprsForPriceRangeMultiplier({
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
export type GetAprPositionParameters = {
  ammPoolInfo: Omit<HydratedConcentratedInfo, 'userPositionAccount'>
  positionAccount: AmmV3PoolPersonalPosition
  poolRewardTokens: PublicKeyish[]
  tokenPrices: Record<string, Price>
  tokenDecimals: Record<string, number>
  timeBasis: '24h' | '7d' | '30d'
  planType: 'D' | 'C'
  chainTimeOffsetMs?: number
}
export function getPositonAprCore({
  ammPoolInfo,
  positionAccount,
  poolRewardTokens,
  tokenPrices,
  tokenDecimals,
  timeBasis,
  planType,
  chainTimeOffsetMs = 0
}: GetAprPositionParameters) {
  const { getToken } = useToken.getState()
  if (planType === 'D') {
    const planBApr = AmmV3.estimateAprsForPriceRangeDelta({
      poolInfo: ammPoolInfo.state,
      aprType: timeBasis === '24h' ? 'day' : timeBasis === '7d' ? 'week' : 'month',
      mintPrice: tokenPrices,
      positionTickLowerIndex: Math.min(positionAccount.tickLower, positionAccount.tickUpper),
      positionTickUpperIndex: Math.max(positionAccount.tickLower, positionAccount.tickUpper),
      chainTime: (Date.now() + chainTimeOffsetMs) / 1000,
      rewardMintDecimals: tokenDecimals,
      liquidity: positionAccount.liquidity
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
    const planCApr = AmmV3.estimateAprsForPriceRangeMultiplier({
      poolInfo: ammPoolInfo.state,
      aprType: timeBasis === '24h' ? 'day' : timeBasis === '7d' ? 'week' : 'month',
      positionTickLowerIndex: Math.min(positionAccount.tickLower, positionAccount.tickUpper),
      positionTickUpperIndex: Math.max(positionAccount.tickLower, positionAccount.tickUpper)
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
