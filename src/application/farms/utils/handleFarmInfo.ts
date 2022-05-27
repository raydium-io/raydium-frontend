import {
  CurrencyAmount,
  Farm,
  FarmFetchMultipleInfoParams,
  FarmStateV3,
  FarmStateV5,
  FarmStateV6,
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

import { SplToken } from '../../token/type'
import { FarmPoolJsonInfo, FarmPoolsJsonFile, HydratedFarmInfo, SdkParsedFarmInfo } from '../type'
import toPubString from '@/functions/format/toMintString'
import { isMeaningfulNumber } from '@/functions/numberish/compare'
import { LiquidityStore } from '@/application/liquidity/useLiquidity'
import { currentIsAfter, currentIsBefore } from '@/functions/date/judges'
import { RAYMint } from '@/application/token/utils/wellknownToken.config'

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
      } as SdkParsedFarmInfo)
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
  const rewards: HydratedFarmInfo['rewards'] = farmInfo.state.rewardInfos.map((rewardInfo, idx) => {
    const pendingReward = pendingRewards?.[idx]
    const apr = aprs[idx]
    const token = rewardTokens[idx]
    if (farmInfo.version === 6) {
      const { rewardOpenTime, rewardEndTime } = rewardInfo as FarmStateV6['rewardInfos'][number]
      const openTime = rewardOpenTime.toNumber()
      const endTime = rewardEndTime.toNumber()
      const canBeRewarded =
        (openTime ? currentIsAfter(openTime, { unit: 's' }) : true) && currentIsBefore(endTime, { unit: 's' }) /* v6 */
      return { ...rewardInfo, apr, token, pendingReward, canBeRewarded }
    } else {
      const { perSlotReward } = rewardInfo as (FarmStateV3 | FarmStateV5)['rewardInfos'][number]
      const canBeRewarded = isMeaningfulNumber(pendingReward) || isMeaningfulNumber(perSlotReward)
      return { ...rewardInfo, apr, token, pendingReward, canBeRewarded }
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
    return (info.state as FarmStateV6).rewardInfos.map(({ rewardPerSecond }, idx) => {
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
    const calcAprs = (info.state as FarmStateV3 | FarmStateV5).rewardInfos.map(({ perSlotReward }, idx) => {
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
  if (info.version === 9) {
    const rewardInfos = (info.state as FarmStateV6).rewardInfos
    if (rewardInfos.every(({ rewardOpenTime }) => currentIsBefore(rewardOpenTime.toNumber(), { unit: 's' })))
      return 'upcoming pool'
    if (rewardInfos.every(({ rewardEndTime }) => currentIsBefore(rewardEndTime.toNumber(), { unit: 's' })))
      return 'closed pool'
  } else {
    const perSlotRewards = (info.state as FarmStateV3 | FarmStateV5).rewardInfos.map(
      ({ perSlotReward }) => perSlotReward
    )
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
