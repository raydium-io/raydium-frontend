import { ConnectionStore } from '@/application/connection/useConnection'
import { findAmmId } from '@/application/liquidity/miscToolFns'
import { LiquidityStore } from '@/application/liquidity/useLiquidity'
import { PoolsStore } from '@/application/pools/usePools'
import { TokenStore } from '@/application/token/useToken'
import { RAYMint } from '@/application/token/wellknownToken.config'
import { shakeUndifindedItem } from '@/functions/arrayMethods'
import { DateParam, offsetDateTime } from '@/functions/date/dateFormat'
import { isDateAfter, isDateBefore } from '@/functions/date/judges'
import jFetch from '@/functions/dom/jFetch'
import toPubString from '@/functions/format/toMintString'
import { toPercent } from '@/functions/format/toPercent'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import toTotalPrice from '@/functions/format/toTotalPrice'
import { isMeaningfulNumber } from '@/functions/numberish/compare'
import { sub } from '@/functions/numberish/operations'
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
  TokenAmount
} from '@raydium-io/raydium-sdk'
import BN from 'bn.js'
import { SplToken } from '../token/type'
import { APIRewardInfo, FarmPoolJsonInfo, FarmPoolsJsonFile, HydratedFarmInfo, SdkParsedFarmInfo } from './type'

function getMaxOpenTime(i: APIRewardInfo[]) {
  return Math.max(...i.map((r) => r.rewardOpenTime))
}

export async function fetchFarmJsonInfos(): Promise<(FarmPoolJsonInfo & { official: boolean })[] | undefined> {
  const result = await jFetch<FarmPoolsJsonFile>('https://api.raydium.io/v2/sdk/farm-v2/mainnet.json', {
    ignoreCache: true
  })
  if (!result) return undefined
  const officials = result.official.map((i) => ({ ...i, official: true }))
  const unOfficial = result.unOfficial
    ?.map((i) => ({ ...i, official: false }))
    .sort((a, b) => -getMaxOpenTime(a.rewardInfos) + getMaxOpenTime(b.rewardInfos))
  return [...officials, ...(unOfficial ?? [])]
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
    aprs: Record<string, number> // from api:pairs
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
  const isClosedPool = farmPoolType === 'closed pool'
  const isUpcomingPool = farmInfo.upcoming && isClosedPool
  const isNewPool = farmInfo.version !== 6 && farmInfo.upcoming && !isClosedPool // NOTE: Rudy says!!!
  const isStablePool = payload.liquidityJsonInfos?.find((i) => i.lpMint === toPubString(farmInfo.lpMint))?.version === 5

  const lpToken = isStakePool ? payload.getToken(farmInfo.lpMint) : payload.getLpToken(farmInfo.lpMint)
  const baseToken = isStakePool ? payload.getToken(farmInfo.lpMint) : payload.getLpToken(farmInfo.lpMint)?.base
  const quoteToken = isStakePool ? payload.getToken(farmInfo.lpMint) : payload.getLpToken(farmInfo.lpMint)?.quote

  if (!baseToken?.symbol) {
    // console.log('farmInfo: ', farmInfo.jsonInfo)
  }
  const name = isStakePool
    ? `${baseToken?.symbol ?? 'unknown'}`
    : `${baseToken?.symbol ?? 'unknown'}-${quoteToken?.symbol ?? 'unknown'}`

  const rewardTokens = farmInfo.rewardInfos.map(({ rewardMint: mint }) => payload.getToken(String(mint)))

  const pendingRewards = farmInfo.wrapped?.pendingRewards.map((reward, idx) =>
    rewardTokens[idx] ? new TokenAmount(rewardTokens[idx]!, reward) : undefined
  )

  const lpPrice = (isStakePool ? payload.tokenPrices : payload.lpPrices)[toPubString(farmInfo.lpMint)]

  const stakedLpAmount = lpToken && new TokenAmount(lpToken, farmInfo.lpVault.amount)

  const tvl = lpPrice && lpToken ? toTotalPrice(new TokenAmount(lpToken, farmInfo.lpVault.amount), lpPrice) : undefined

  const aprs = calculateFarmPoolAprs(farmInfo, {
    tvl,
    rewardTokens: rewardTokens,
    rewardTokenPrices: farmInfo.rewardInfos.map(({ rewardMint }) => payload.tokenPrices?.[String(rewardMint)]) ?? [],
    blockSlotCountForSecond: payload.blockSlotCountForSecond
  })

  const ammId = findAmmId(farmInfo.lpMint)
  const raydiumFeeRpr = ammId ? toPercent(payload.aprs[ammId], { alreadyDecimaled: true }) : undefined
  const totalApr = aprs.reduce((acc, cur) => (acc ? (cur ? acc.add(cur) : acc) : cur), raydiumFeeRpr)
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
              isDateAfter(onlineCurrentDate, offsetDateTime(rewardEndTime, { hours: -0.5 /* NOTE - test */ /* -72 */ }))
            const claimableRewards =
              token && toTokenAmount(token, sub(rewardInfo.totalReward, rewardInfo.totalRewardEmissioned))

            const pendingReward = pendingRewards?.[idx]
            const apr = aprs[idx]
            const usedTohaveReward = Boolean(rewardEndTime)

            return {
              ...rewardInfo,
              owner: farmInfo.rewardInfos[idx]?.rewardSender,
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

    ammId,
    totalApr,
    tvl,
    userHasStaked: isMeaningfulNumber(userStakedLpAmount),
    rewards,
    userStakedLpAmount,
    stakedLpAmount,
    raydiumFeeRpr
  }
}

function calculateFarmPoolAprs(
  info: SdkParsedFarmInfo,
  payload: {
    blockSlotCountForSecond: number
    tvl: CurrencyAmount | undefined
    rewardTokens: (SplToken | undefined)[]
    rewardTokenPrices: (Price | undefined)[]
  }
) {
  if (info.version === 6) {
    return info.state.rewardInfos.map(({ rewardPerSecond }, idx) => {
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
      const apr = rewardtotalPricePerYear.div(payload.tvl ?? ONE)
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
      const apr = rewardtotalPricePerYear.div(payload.tvl ?? ONE)
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
