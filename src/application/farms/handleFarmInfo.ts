import {
  CurrencyAmount,
  Farm,
  FarmFetchMultipleInfoParams,
  FarmState,
  FarmStateV3,
  FarmStateV5,
  Fraction,
  ONE,
  Price,
  TEN,
  TokenAmount
} from '@raydium-io/raydium-sdk'

import BN from 'bn.js'

import { findAmmId } from '@/application/liquidity/utils/miscToolFns'
import { PoolsStore } from '@/application/pools/usePools'
import { TokenStore } from '@/application/token/useToken'
import jFetch from '@/functions/dom/jFetch'
import toTotalPrice from '@/functions/format/toTotalPrice'

import { SplToken } from '../token/type'
import { FarmPoolJsonInfo, FarmPoolsJsonFile, HydratedFarmInfo, SdkParsedFarmInfo } from './type'
import toPubString, { toPub } from '@/functions/format/toMintString'
import { isMeaningfulNumber } from '@/functions/numberish/compare'
import { LiquidityStore } from '@/application/liquidity/useLiquidity'
import { currentIsAfter, currentIsBefore, isDateAfter, isDateBefore } from '@/functions/date/judges'
import { RAYMint } from '@/application/token/utils/wellknownToken.config'
import { toHumanReadable } from '@/functions/format/toHumanReadable'
import { Connection, PublicKey } from '@solana/web3.js'
import { unionArr } from '@/types/generics'
import { shakeUndifindedItem } from '@/functions/arrayMethods'
import { AppSettingsStore } from '@/application/appSettings/useAppSettings'
import { ConnectionStore } from '@/application/connection/useConnection'

export async function fetchFarmJsonInfos(): Promise<(FarmPoolJsonInfo & { official: boolean })[] | undefined> {
  const result = await jFetch<FarmPoolsJsonFile>('https://api.raydium.io/v2/sdk/farm-v2/mainnet.json', {
    ignoreCache: true
  })
  if (!result) return undefined
  const officials = result.official.map((i) => ({ ...i, official: true }))
  const unOfficial = result.unOfficial?.map((i) => ({ ...i, official: false }))
  return [...officials, ...(unOfficial ?? [])]
}

/** and state info  */
export async function mergeSdkFarmInfo(
  options: FarmFetchMultipleInfoParams,
  payload: {
    jsonInfos: FarmPoolJsonInfo[]
  }
): Promise<SdkParsedFarmInfo[]> {
  const rawInfos = await Farm.fetchMultipleInfo(options)
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
    getToken: TokenStore['getToken']
    getLpToken: TokenStore['getLpToken']
    lpPrices: PoolsStore['lpPrices']
    tokenPrices: TokenStore['tokenPrices']
    liquidityJsonInfos: LiquidityStore['jsonInfos']
    chainTimeOffset: ConnectionStore['chainTimeOffset']
  }
): HydratedFarmInfo {
  const farmPoolType = judgeFarmType(farmInfo)
  const isStakePool = whetherIsStakeFarmPool(farmInfo)
  const isDualFusionPool = farmPoolType === 'dual fusion pool'
  const isNormalFusionPool = farmPoolType === 'normal fusion pool'
  const isClosedPool = farmPoolType === 'closed pool'
  const isUpcomingPool = (farmInfo.upcoming && isClosedPool) || farmPoolType === 'upcoming pool'
  const isNewPool = farmInfo.upcoming && !isClosedPool
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
    rewardTokenPrices: farmInfo.rewardInfos.map(({ rewardMint }) => payload.tokenPrices?.[String(rewardMint)]) ?? []
  })

  const totalApr = aprs.reduce((acc, cur) => (acc ? (cur ? acc.add(cur) : acc) : cur), undefined)
  const ammId = findAmmId(farmInfo.lpMint)
  const rewards: HydratedFarmInfo['rewards'] =
    farmInfo.version === 6
      ? shakeUndifindedItem(
          farmInfo.state.rewardInfos.map((rewardInfo, idx) => {
            const { rewardOpenTime: openTime, rewardEndTime: endTime } = rewardInfo
            // ------------ reward time -----------------
            const rewardStartTime = openTime.toNumber() ? new Date(openTime.toNumber() * 1000) : undefined // chain time
            const rewardEndTime = endTime.toNumber() ? new Date(endTime.toNumber() * 1000) : undefined // chain time
            const onlineCurrentDate = Date.now() + (payload.chainTimeOffset ?? 0)
            if (!rewardStartTime && !rewardEndTime) return undefined // if reward is not any state, return undefined to delete it

            const isRewardBeforeStart = Boolean(rewardStartTime && isDateBefore(onlineCurrentDate, rewardStartTime))
            const isRewardEnded = Boolean(rewardEndTime && isDateAfter(onlineCurrentDate, rewardEndTime))
            const isRewarding = (!rewardStartTime && !rewardEndTime) || (!isRewardEnded && !isRewardBeforeStart)

            const pendingReward = pendingRewards?.[idx]
            const apr = aprs[idx]
            const token = rewardTokens[idx]
            const usedTohaveReward = Boolean(rewardEndTime)

            return {
              ...rewardInfo,
              apr,
              token,
              pendingReward,
              usedTohaveReward,
              perSecond: rewardInfo.rewardPerSecond.toString(),
              openTime: rewardStartTime,
              endTime: rewardEndTime,
              isRewardBeforeStart,
              isRewardEnded,
              isRewarding
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
            pendingReward,
            usedTohaveReward
          }
        })
  const userStakedLpAmount =
    lpToken && farmInfo.ledger?.deposited ? new TokenAmount(lpToken, farmInfo.ledger?.deposited) : undefined

  // console.log(
  //   'farmInfo.lpVault.amount: ',
  //   name,
  //   lpToken && toString(new TokenAmount(lpToken, farmInfo.lpVault.amount)),
  //   lpPrice && toString(lpPrice),
  //   lpToken?.decimals,
  //   tvl?.toExact(),
  //   toString(toFraction(lpPrice)),
  //   aprs,
  //   rewardTokens,
  //   farmInfo.rewardMints.map((rewardMint) => payload.tokenPrices?.[String(rewardMint)]) ?? []
  // )
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
    raydiumFeeRpr: undefined
  }
}

function calculateFarmPoolAprs(
  info: SdkParsedFarmInfo,
  payload: {
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
          .mul(new BN(2 * 60 * 60 * 24 * 365)),
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
  info: SdkParsedFarmInfo
): 'closed pool' | 'normal fusion pool' | 'dual fusion pool' | undefined | 'upcoming pool' {
  if (info.version === 6) {
    const rewardInfos = info.state.rewardInfos
    if (rewardInfos.every(({ rewardOpenTime }) => currentIsBefore(rewardOpenTime.toNumber(), { unit: 's' })))
      return 'upcoming pool'
    if (rewardInfos.every(({ rewardEndTime }) => currentIsAfter(rewardEndTime.toNumber(), { unit: 's' })))
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
