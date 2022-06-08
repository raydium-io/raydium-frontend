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
import { Connection } from '@solana/web3.js'

export async function fetchFarmJsonInfos(): Promise<FarmPoolJsonInfo[] | undefined> {
  return jFetch<FarmPoolsJsonFile>('https://api.raydium.io/v2/sdk/farm/mainnet.json', {
    ignoreCache: true
  }).then((res) => res?.official)
}

/** and state info  */
export async function mergeSdkFarmInfo(
  options: FarmFetchMultipleInfoParams,
  payload: {
    jsonInfos: FarmPoolJsonInfo[]
  }
): Promise<SdkParsedFarmInfo[]> {
  const rawInfos = await Farm.fetchMultipleInfo(options)
  const result = options.pools.map((pool, idx) =>
    Object.assign(pool, rawInfos[String(pool.id)], { jsonInfo: payload.jsonInfos[idx] })
  )

  return result
}

export async function getSlotCountForSecond(connection: Connection | undefined): Promise<number> {
  if (!connection) return 1
  const performanceList = await connection.getRecentPerformanceSamples(100)
  const slotList = performanceList.map((item) => item.numSlots)
  return slotList.reduce((a, b) => a + b) / slotList.length / 60
}
export function hydrateFarmInfo(
  farmInfo: SdkParsedFarmInfo,
  payload: {
    blockSlotCountForSecond: number
    getToken: TokenStore['getToken']
    getLpToken: TokenStore['getLpToken']
    lpPrices: PoolsStore['lpPrices']
    tokenPrices: TokenStore['tokenPrices']
    liquidityJsonInfos: LiquidityStore['jsonInfos']
  }
): HydratedFarmInfo {
  const farmPoolType = judgeFarmType(farmInfo)
  const isRaydiumPool = whetherIsRaydiumFarmPool(farmInfo)
  const isStakePool = whetherIsStakeFarmPool(farmInfo)
  const isDualFusionPool = farmPoolType === 'dual fusion pool'
  const isNormalFusionPool = farmPoolType === 'normal fusion pool'
  const isClosedPool = farmPoolType === 'closed pool'
  const isUpcomingPool = farmInfo.jsonInfo.upcoming && isClosedPool
  const isNewPool = farmInfo.jsonInfo.upcoming && !isClosedPool
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

  const rewardTokens = farmInfo.rewardMints.map((mint) => payload.getToken(String(mint)))

  const pendingRewards = farmInfo.wrapped?.pendingRewards.map((reward, idx) =>
    rewardTokens[idx] ? new TokenAmount(rewardTokens[idx]!, reward) : undefined
  )

  const lpPrice = (isStakePool ? payload.tokenPrices : payload.lpPrices)[toPubString(farmInfo.lpMint)]

  const stakedLpAmount = lpToken && new TokenAmount(lpToken, farmInfo.lpVault.amount)

  const tvl = lpPrice && lpToken ? toTotalPrice(new TokenAmount(lpToken, farmInfo.lpVault.amount), lpPrice) : undefined

  const aprs = calculateFarmPoolAprs(farmInfo, {
    tvl,
    rewardTokens: rewardTokens,
    rewardTokenPrices: farmInfo.rewardMints.map((rewardMint) => payload.tokenPrices?.[String(rewardMint)]) ?? [],
    blockSlotCountForSecond: payload.blockSlotCountForSecond
  })

  const totalApr = aprs.reduce((acc, cur) => (acc ? (cur ? acc.add(cur) : acc) : cur), undefined)
  const ammId = findAmmId(farmInfo.lpMint)
  const rewards: HydratedFarmInfo['rewards'] = farmInfo.state.perSlotRewards.map((perSlotReward, idx) => {
    const pendingReward = pendingRewards?.[idx]
    const hasPendingReward = isMeaningfulNumber(pendingReward)
    const canBeRewarded = hasPendingReward || !perSlotReward.eq(ZERO) // for history reason, reward can be 0
    const apr = aprs[idx]
    const token = rewardTokens[idx]
    return { apr, token, pendingReward, canBeRewarded }
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

    isRaydiumPool,
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
    blockSlotCountForSecond: number
    tvl: CurrencyAmount | undefined
    rewardTokens: (SplToken | undefined)[]
    rewardTokenPrices: (Price | undefined)[]
  }
) {
  const calcAprs = info.state.perSlotRewards.map((perSlotReward, idx) => {
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

function judgeFarmType(
  info: SdkParsedFarmInfo
): 'closed pool' | 'normal fusion pool' | 'dual fusion pool' | 'unknown type pool' {
  const perSlotRewards = info.state.perSlotRewards

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

  return 'unknown type pool'
}

function whetherIsRaydiumFarmPool(info: SdkParsedFarmInfo): boolean {
  return info.state.perSlotRewards.length === 1 && !whetherIsStakeFarmPool(info)
}

function whetherIsStakeFarmPool(info: SdkParsedFarmInfo): boolean {
  return (
    info.state.perSlotRewards.length === 1 && String(info.lpMint) === '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R'
  ) // Ray Mint
}
