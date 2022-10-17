import { PublicKey } from '@solana/web3.js'

import BN from 'bn.js'
import Decimal from 'decimal.js'
import {
  AmmV3PoolInfo,
  AmmV3PoolPersonalPosition,
  ApiAmmV3ConfigInfo,
  ApiAmmV3PoolInfo,
  CurrencyAmount,
  Fraction,
  Percent,
  Price,
  TokenAmount
} from 'test-r-sdk'

import { HexAddress, Numberish } from '@/types/constants'

import { SplToken } from '../token/type'

export type APIConcentratedInfo = ApiAmmV3PoolInfo

export type SDKParsedConcentratedInfo = {
  /** SDK info */
  state: AmmV3PoolInfo
  /** SDK info */
  positionAccount?: AmmV3PoolPersonalPosition[]
}

export type UICLMMRewardInfo = {
  id: string | number // for farm edit it will be
  owner?: HexAddress // creator wallet address
  type: 'new added' | 'existed reward'

  // rewardVault?: HexAddress // only existed reward may have this

  token?: SplToken
  isOptionToken?: boolean
  amount?: Numberish
  startTime?: Date
  endTime?: Date

  // canEdit: boolean // 🔥 this is not a reward property, but a UI state for wallet account.  it shouldn't be here.
  apr?: Percent // only may edited farms may have this // NOTE: it is not elegant here. for apr's info is actually state info
  restAmount?: Numberish // only existed reward may have this

  isRewardEnded?: boolean // for farm edit
  isRewardBeforeStart?: boolean // for farm edit
  isRewarding?: boolean // exist working farm
  isRwardingBeforeEnd72h?: boolean // exist working farm // TODO: Dev

  rewardPeriodMin?: number // only may edited farms // v6 '7-90 days's     7 * 24 * 60 * 60 seconds
  rewardPeriodMax?: number // only may edited farms // v6 '7-90 days's     90 * 24 * 60 * 60 seconds
  rewardPeriodExtend?: number // only may edited farms // v6 'end before 72h's    72 * 60 * 60 seconds

  claimableRewards?: TokenAmount // only existed reward may have this
  perSecond?: string | number // only existed reward may have this

  originData?: Omit<UICLMMRewardInfo, 'originData'> // only edit have this
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

  volumeFee24h: CurrencyAmount
  volumeFee7d: CurrencyAmount
  volumeFee30d: CurrencyAmount

  rewardApr24h: Percent[]
  rewardApr7d: Percent[]
  rewardApr30d: Percent[]

  getApr({
    tickLower,
    tickUpper,
    tokenPrices,
    tokenDecimals,
    timeBasis,
    planType,
    chainTimeOffsetMs
  }: {
    tickLower: number
    tickUpper: number
    tokenPrices: Record<string, Price>
    tokenDecimals: Record<string, number>
    timeBasis: '24h' | '7d' | '30d'
    planType: 'A' | 'B' | 'C'
    chainTimeOffsetMs?: number | undefined
  }): {
    fee: {
      apr: Percent
      percentInTotal: Percent
    }
    rewards: { apr: Percent; percentInTotal: Percent; token: SplToken | undefined }[]
    apr: Percent
  }
}

export interface UserPositionAccount {
  /** transform to SDK function, should not used directlly in UI */
  sdkParsed: AmmV3PoolPersonalPosition
  rewardInfos: {
    penddingReward: TokenAmount | undefined
    apr24h: Percent
    apr7d: Percent
    apr30d: Percent
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
  getLiquidityVolume(tokenPrices: Record<string, Price>): {
    wholeLiquidity: Fraction | undefined
    baseLiquidity: Fraction | undefined
    quoteLiquidity: Fraction | undefined
  }
  getApr({
    tokenPrices,
    tokenDecimals,
    timeBasis,
    planType,
    chainTimeOffsetMs
  }: {
    tokenPrices: Record<string, Price>
    tokenDecimals: Record<string, number>
    timeBasis: '24h' | '7d' | '30d'
    planType: 'A' | 'B' | 'C'
    chainTimeOffsetMs?: number | undefined
  }): {
    fee: {
      apr: Percent
      percentInTotal: Percent
    }
    rewards: { apr: Percent; percentInTotal: Percent; token: SplToken | undefined }[]
    apr: Percent
  }
  // liquidity: BN__default; // currently useless
  // feeGrowthInsideLastX64A: BN__default; // currently useless
  // feeGrowthInsideLastX64B: BN__default; // currently useless
  // tokenFeesOwedA: BN__default; // currently useless
  // tokenFeesOwedB: BN__default; // currently useless
}

export interface HydratedAmmV3ConfigInfo {
  id: string
  index: number
  protocolFeeRate: Percent
  tradeFeeRate: Percent
  tickSpacing: number

  original: ApiAmmV3ConfigInfo
}
