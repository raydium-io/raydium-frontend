import { PublicKey } from '@solana/web3.js'

import BN from 'bn.js'
import Decimal from 'decimal.js'
import {
  AmmV3PoolInfo,
  AmmV3PoolPersonalPosition,
  ApiAmmV3PoolInfo,
  CurrencyAmount,
  Fraction,
  Percent,
  Price,
  TokenAmount
} from 'test-r-sdk'

import { Numberish } from '@/types/constants'

import { SplToken } from '../token/type'

export type APIConcentratedInfo = ApiAmmV3PoolInfo

export type SDKParsedConcentratedInfo = {
  state: AmmV3PoolInfo
  positionAccount?: AmmV3PoolPersonalPosition[]
}

export interface HydratedConcentratedInfo extends SDKParsedConcentratedInfo {
  protocolFeeRate: Percent
  tradeFeeRate: Percent
  base: SplToken | undefined
  quote: SplToken | undefined
  id: PublicKey
  userPositionAccount?: UserPositionAccount[]
  name: string
  idString: string

  ammConfig: AmmV3PoolInfo['ammConfig']
  currentPrice: Fraction
  rewardInfos: {
    rewardToken: SplToken | undefined
    rewardState: number
    openTime: number
    endTime: number
    lastUpdateTime: number
    rewardTotalEmissioned: TokenAmount | undefined
    rewardClaimed: TokenAmount | undefined
    tokenMint: PublicKey
    tokenVault: PublicKey
    authority: PublicKey
    emissionsPerSecondX64: BN
    rewardGrowthGlobalX64: BN
  }[]
  tvl: CurrencyAmount
  feeApr24h: Percent
  feeApr7d: Percent
  feeApr30d: Percent
  totalApr24h: Percent
  totalApr7d: Percent
  totalApr30d: Percent
  volume24h: CurrencyAmount
  volume7d: CurrencyAmount
  volume30d: CurrencyAmount
  fee24hA: TokenAmount
  fee24hB: TokenAmount
  fee7dA: TokenAmount
  fee7dB: TokenAmount
  fee30dA: TokenAmount
  fee30dB: TokenAmount
  rewardApr24h: Percent[]
  rewardApr7d: Percent[]
  rewardApr30d: Percent[]
}

export interface UserPositionAccount {
  /** transform to SDK function, should not used directlly in UI */
  sdkParsed: AmmV3PoolPersonalPosition
  rewardInfos: {
    penddingReward: TokenAmount | undefined
  }[]
  inRange: boolean
  poolId: PublicKey
  nftMint: PublicKey
  priceLower: Numberish
  priceUpper: Numberish
  amountA?: TokenAmount
  amountB?: TokenAmount
  tokenA?: SplToken
  tokenB?: SplToken
  leverage: number
  tickLower: number
  tickUpper: number
  positionPercentA: Percent
  positionPercentB: Percent
  tokenFeeAmountA?: TokenAmount
  tokenFeeAmountB?: TokenAmount
  getLiquidityVolume: (tokenPrices: Record<string, Price>) => {
    wholeLiquidity: Fraction | undefined
    baseLiquidity: Fraction | undefined
    quoteLiquidity: Fraction | undefined
  }
  // liquidity: BN__default; // currently useless
  // feeGrowthInsideLastX64A: BN__default; // currently useless
  // feeGrowthInsideLastX64B: BN__default; // currently useless
  // tokenFeesOwedA: BN__default; // currently useless
  // tokenFeesOwedB: BN__default; // currently useless
}
