import { ConnectionStore } from '@/application/connection/useConnection'
import { findAmmId } from '@/application/liquidity/miscToolFns'
import { LiquidityStore } from '@/application/liquidity/useLiquidity'
import { PoolsStore } from '@/application/pools/usePools'
import { TokenStore } from '@/application/token/useToken'
import { RAYMint } from '@/application/token/wellknownToken.config'
import { shakeUndifindedItem, unifyByKey } from '@/functions/arrayMethods'
import { DateParam, offsetDateTime } from '@/functions/date/dateFormat'
import { isDateAfter, isDateBefore } from '@/functions/date/judges'
import jFetch from '@/functions/dom/jFetch'
import { getLocalItem } from '@/functions/dom/jStorage'
import toPubString from '@/functions/format/toMintString'
import { toPercent } from '@/functions/format/toPercent'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import toTotalPrice from '@/functions/format/toTotalPrice'
import { eq, isMeaningfulNumber } from '@/functions/numberish/compare'
import { getMax, sub } from '@/functions/numberish/operations'
import toBN from '@/functions/numberish/toBN'
import toFraction from '@/functions/numberish/toFraction'
import { toString } from '@/functions/numberish/toString'
import { unionArr } from '@/types/generics'
import {
  CurrencyAmount,
  Farm,
  FarmFetchMultipleInfoParams,
  Fraction,
  ONE,
  Price,
  TEN,
  TokenAmount,
  ZERO
} from '@raydium-io/raydium-sdk'
import BN from 'bn.js'
import { SplToken } from '../token/type'
import { APIRewardInfo, FarmPoolJsonInfo, FarmPoolsJsonFile, HydratedFarmInfo, SdkParsedFarmInfo } from './type'

function getMaxOpenTime(i: APIRewardInfo[]) {
  return Math.max(...i.map((r) => r.rewardOpenTime))
}

const MAX_DURATION_DAY = 90
const MIN_DURATION_DAY = 7
export const MAX_DURATION_SECOND = MAX_DURATION_DAY * 24 * 60 * 60
export const MIN_DURATION_SECOND = MIN_DURATION_DAY * 24 * 60 * 60
export const MAX_DURATION = MAX_DURATION_SECOND * 1000
export const MIN_DURATION = MIN_DURATION_SECOND * 1000

export const MAX_OFFSET_AFTER_NOW_SECOND = 7 * 24 * 60 * 60
export const MAX_OFFSET_AFTER_NOW = MAX_OFFSET_AFTER_NOW_SECOND * 1000

export const EXTEND_BEFORE_END_SECOND = 72 * 60 * 60 // test
export const EXTEND_BEFORE_END = EXTEND_BEFORE_END_SECOND * 1000

export async function fetchFarmJsonInfos(): Promise<FarmPoolJsonInfo[] | undefined> {
  const result = await jFetch<FarmPoolsJsonFile>('https://api.raydium.io/v2/sdk/farm-v2/mainnet.json')
  if (!result) return undefined
  const stakeFarmInfoList = result.stake.map((i) => ({ ...i, category: 'stake' })) ?? []
  const raydiumFarmInfoList = result.raydium.map((i) => ({ ...i, category: 'raydium' })) ?? []
  const fusionFarmInfoList = result.fusion.map((i) => ({ ...i, category: 'fusion' })) ?? []
  const ecosystemFarmInfoList = result.ecosystem.map((i) => ({ ...i, category: 'ecosystem' })) ?? []
  // @ts-expect-error string literial type error. safe to ignore it
  return [...stakeFarmInfoList, ...raydiumFarmInfoList, ...fusionFarmInfoList, ...ecosystemFarmInfoList]
}

/** and state info  */
export async function mergeSdkFarmInfo(
  options: FarmFetchMultipleInfoParams,
  payload: {
    jsonInfos: FarmPoolJsonInfo[]
  }
): Promise<SdkParsedFarmInfo[]> {
  const rawInfos = await Farm.fetchMultipleInfoAndUpdate(options)
  const result = options.pools.map(
    (pool, idx) =>
      ({
        ...payload.jsonInfos[idx],
        ...pool,
        ...rawInfos[String(pool.id)],
        jsonInfo: payload.jsonInfos[idx]
      } as unknown as SdkParsedFarmInfo)
  )
  return result
}

export function hydrateFarmInfo(
  farmInfo: SdkParsedFarmInfo,
  payload: {
    blockSlotCountForSecond: number
    aprs: Record<string, { apr30d: number; apr7d: number; apr24h: number }> // from api:pairs
    getToken: TokenStore['getToken']
    getLpToken: TokenStore['getLpToken']
    lpPrices: PoolsStore['lpPrices']
    tokenPrices: TokenStore['tokenPrices']
    liquidityJsonInfos: LiquidityStore['jsonInfos']
    currentBlockChainDate: Date
    chainTimeOffset: ConnectionStore['chainTimeOffset']
  }
): HydratedFarmInfo {
  const farmPoolType = judgeFarmType(farmInfo, payload.currentBlockChainDate)
  const isStakePool = whetherIsStakeFarmPool(farmInfo)
  const isDualFusionPool = farmPoolType === 'dual fusion pool'
  const isNormalFusionPool = farmPoolType === 'normal fusion pool'
  const isClosedPool = farmPoolType === 'closed pool' && !farmInfo.upcoming // NOTE: I don't know why, but Amanda says there is a bug.
  const isUpcomingPool = farmInfo.version !== 6 ? farmInfo.upcoming && isClosedPool : farmInfo.upcoming
  const isNewPool = farmInfo.version !== 6 && farmInfo.upcoming && !isClosedPool // NOTE: Rudy says!!!
  const isStablePool = payload.liquidityJsonInfos?.find((i) => i.lpMint === toPubString(farmInfo.lpMint))?.version === 5

  const lpToken = isStakePool ? payload.getToken(farmInfo.lpMint) : payload.getLpToken(farmInfo.lpMint)
  const baseToken = isStakePool ? payload.getToken(farmInfo.lpMint) : payload.getToken(farmInfo.baseMint)
  const quoteToken = isStakePool ? payload.getToken(farmInfo.lpMint) : payload.getToken(farmInfo.quoteMint)

  if (!baseToken?.symbol) {
    // console.log('farmInfo: ', farmInfo.jsonInfo)
  }
  const name = isStakePool
    ? `${baseToken?.symbol ?? 'unknown'}`
    : `${baseToken?.symbol ?? 'unknown'}-${quoteToken?.symbol ?? 'unknown'}`

  const rewardTokens = farmInfo.jsonInfo.rewardInfos.map(({ rewardMint: mint }) => payload.getToken(toPubString(mint)))

  const pendingRewards = farmInfo.wrapped?.pendingRewards.map((reward, idx) =>
    rewardTokens[idx] ? new TokenAmount(rewardTokens[idx]!, toBN(getMax(reward, 0))) : undefined
  )

  const lpPrice = (isStakePool ? payload.tokenPrices : payload.lpPrices)[toPubString(farmInfo.lpMint)]

  const stakedLpAmount = lpToken && new TokenAmount(lpToken, farmInfo.lpVault.amount)

  const tvl = lpPrice && lpToken ? toTotalPrice(new TokenAmount(lpToken, farmInfo.lpVault.amount), lpPrice) : undefined

  const aprs = calculateFarmPoolAprs(farmInfo, {
    tvl,
    currentBlockChainDate: payload.currentBlockChainDate,
    rewardTokens: rewardTokens,
    rewardTokenPrices:
      farmInfo.rewardInfos.map(({ rewardMint }) => payload.tokenPrices?.[toPubString(rewardMint)]) ?? [],
    blockSlotCountForSecond: payload.blockSlotCountForSecond
  })

  const ammId = findAmmId(farmInfo.lpMint)
  const raydiumFeeApr7d = ammId ? toPercent(payload.aprs[ammId]?.apr7d, { alreadyDecimaled: true }) : undefined
  const raydiumFeeApr30d = ammId ? toPercent(payload.aprs[ammId]?.apr30d, { alreadyDecimaled: true }) : undefined
  const raydiumFeeApr24h = ammId ? toPercent(payload.aprs[ammId]?.apr24h, { alreadyDecimaled: true }) : undefined
  const totalApr7d = aprs.reduce((acc, cur) => (acc ? (cur ? acc.add(cur) : acc) : cur), raydiumFeeApr7d)
  const totalApr30d = aprs.reduce((acc, cur) => (acc ? (cur ? acc.add(cur) : acc) : cur), raydiumFeeApr30d)
  const totalApr24h = aprs.reduce((acc, cur) => (acc ? (cur ? acc.add(cur) : acc) : cur), raydiumFeeApr24h)
  const rewards: HydratedFarmInfo['rewards'] =
    farmInfo.version === 6
      ? shakeUndifindedItem(
          farmInfo.state.rewardInfos.map((rewardInfo, idx) => {
            const { rewardOpenTime: openTime, rewardEndTime: endTime, rewardPerSecond } = rewardInfo
            // ------------ reward time -----------------
            const rewardOpenTime = openTime.toNumber()
              ? new Date(openTime.toNumber() * 1000 + (payload.chainTimeOffset ?? 0))
              : undefined // chain time
            const rewardEndTime = endTime.toNumber()
              ? new Date(endTime.toNumber() * 1000 + (payload.chainTimeOffset ?? 0))
              : undefined // chain time
            const onlineCurrentDate = Date.now() + (payload.chainTimeOffset ?? 0)
            if (!rewardOpenTime && !rewardEndTime) return undefined // if reward is not any state, return undefined to delete it

            const token = payload.getToken(toPubString(rewardInfo.rewardMint ?? farmInfo.rewardInfos[idx]?.rewardMint))
            const isRewardBeforeStart = Boolean(rewardOpenTime && isDateBefore(onlineCurrentDate, rewardOpenTime))
            const isRewardEnded = Boolean(rewardEndTime && isDateAfter(onlineCurrentDate, rewardEndTime))
            const isRewarding = (!rewardOpenTime && !rewardEndTime) || (!isRewardEnded && !isRewardBeforeStart)
            const isRwardingBeforeEnd72h =
              isRewarding &&
              isDateAfter(
                onlineCurrentDate,
                offsetDateTime(rewardEndTime, { seconds: -(farmInfo.jsonInfo.rewardPeriodExtend ?? 72 * 60 * 60) })
              )
            const claimableRewards =
              token && toTokenAmount(token, sub(rewardInfo.totalReward, rewardInfo.totalRewardEmissioned))

            const pendingReward = pendingRewards?.[idx]
            const apr = aprs[idx]
            const usedTohaveReward = Boolean(rewardEndTime)

            const jsonRewardInfo = farmInfo.rewardInfos[idx]

            return {
              ...jsonRewardInfo,
              ...rewardInfo,
              owner: jsonRewardInfo?.rewardSender,
              apr: apr,
              token,
              userPendingReward: pendingReward,
              userHavedReward: usedTohaveReward,
              perSecond: token && toString(toTokenAmount(token, rewardPerSecond)),
              openTime: rewardOpenTime,
              endTime: rewardEndTime,
              isRewardBeforeStart,
              isRewardEnded,
              isRewarding,
              isRwardingBeforeEnd72h,
              claimableRewards,
              version: 6
            }
          })
        )
      : unionArr(farmInfo.state.rewardInfos).map((rewardInfo, idx) => {
          const pendingReward = pendingRewards?.[idx]
          const apr = aprs[idx]
          const token = rewardTokens[idx]
          const { perSlotReward } = rewardInfo

          const usedTohaveReward = isMeaningfulNumber(pendingReward) || isMeaningfulNumber(perSlotReward)
          return {
            ...rewardInfo,
            apr,
            token,
            userPendingReward: pendingReward,
            userHavedReward: usedTohaveReward,
            version: farmInfo.version
          }
        })
  const userStakedLpAmount =
    lpToken && farmInfo.ledger?.deposited ? new TokenAmount(lpToken, farmInfo.ledger?.deposited) : undefined

  return {
    ...farmInfo,
    lp: lpToken,
    lpPrice,
    base: baseToken,
    quote: quoteToken,
    name,

    isStakePool,
    isDualFusionPool,
    isNormalFusionPool,
    isClosedPool,
    isUpcomingPool,
    isStablePool,
    isNewPool,

    totalApr7d,
    raydiumFeeApr7d,
    totalApr24h,
    raydiumFeeApr24h,
    totalApr30d,
    raydiumFeeApr30d,

    ammId,
    tvl,
    userHasStaked: isMeaningfulNumber(userStakedLpAmount),
    rewards,
    userStakedLpAmount,
    stakedLpAmount
  }
}

function calculateFarmPoolAprs(
  info: SdkParsedFarmInfo,
  payload: {
    currentBlockChainDate: Date
    blockSlotCountForSecond: number
    tvl: CurrencyAmount | undefined
    rewardTokens: (SplToken | undefined)[]
    rewardTokenPrices: (Price | undefined)[]
  }
) {
  if (info.version === 6) {
    return info.state.rewardInfos.map(({ rewardPerSecond, rewardOpenTime, rewardEndTime }, idx) => {
      // don't calculate upcoming reward || inactive reward
      const isRewardBeforeStart = isDateBefore(payload.currentBlockChainDate, rewardOpenTime.toNumber(), { unit: 's' })
      const isRewardAfterEnd = isDateAfter(payload.currentBlockChainDate, rewardEndTime.toNumber(), { unit: 's' })
      if (isRewardBeforeStart || isRewardAfterEnd) return undefined
      const rewardToken = payload.rewardTokens[idx]
      if (!rewardToken) return undefined
      const rewardTokenPrice = payload.rewardTokenPrices[idx]
      if (!rewardTokenPrice) return undefined
      const rewardtotalPricePerYear = toTotalPrice(
        new Fraction(rewardPerSecond, ONE)
          .div(TEN.pow(new BN(rewardToken.decimals || 1)))
          .mul(new BN(60 * 60 * 24 * 365)),
        rewardTokenPrice
      )
      if (!payload.tvl) return undefined
      // if tvl is zero, apr should be zero
      const apr = payload.tvl.isZero() ? toFraction(0) : rewardtotalPricePerYear.div(payload.tvl ?? ONE)
      return apr
    })
  } else {
    const calcAprs = unionArr(info.state.rewardInfos).map(({ perSlotReward }, idx) => {
      const rewardToken = payload.rewardTokens[idx]
      if (!rewardToken) return undefined
      const rewardTokenPrice = payload.rewardTokenPrices[idx]
      if (!rewardTokenPrice) return undefined
      const rewardtotalPricePerYear = toTotalPrice(
        new Fraction(perSlotReward, ONE)
          .div(TEN.pow(new BN(rewardToken.decimals || 1)))
          .mul(new BN(payload.blockSlotCountForSecond * 60 * 60 * 24 * 365)),
        rewardTokenPrice
      )
      if (!payload.tvl) return undefined
      // if tvl is zero, apr should be zero
      const apr = payload.tvl.isZero() ? toFraction(0) : rewardtotalPricePerYear.div(payload.tvl ?? ONE)
      return apr
    })
    return calcAprs
  }
}

function judgeFarmType(
  info: SdkParsedFarmInfo,
  currentTime: DateParam = Date.now()
): 'closed pool' | 'normal fusion pool' | 'dual fusion pool' | undefined | 'upcoming pool' {
  if (info.version === 6) {
    const rewardInfos = info.state.rewardInfos
    if (rewardInfos.every(({ rewardOpenTime }) => isDateBefore(currentTime, rewardOpenTime.toNumber(), { unit: 's' })))
      return 'upcoming pool'
    if (rewardInfos.every(({ rewardEndTime }) => isDateAfter(currentTime, rewardEndTime.toNumber(), { unit: 's' })))
      return 'closed pool'
  } else {
    const perSlotRewards = info.state.rewardInfos.map(({ perSlotReward }) => perSlotReward)
    if (perSlotRewards.length === 2) {
      // v5
      if (String(perSlotRewards[0]) === '0' && String(perSlotRewards[1]) !== '0') {
        return 'normal fusion pool' // reward xxx token
      }
      if (String(perSlotRewards[0]) !== '0' && String(perSlotRewards[1]) !== '0') {
        return 'dual fusion pool' // reward ray and xxx token
      }
      if (String(perSlotRewards[0]) === '0' && String(perSlotRewards[1]) === '0') {
        return 'closed pool'
      }
    } else if (perSlotRewards.length === 1) {
      // v3
      if (String(perSlotRewards[0]) === '0') {
        return 'closed pool'
      }
    }
  }
}

function whetherIsStakeFarmPool(info: SdkParsedFarmInfo): boolean {
  return info.state.rewardInfos.length === 1 && String(info.lpMint) === toPubString(RAYMint) // Ray Mint
}
