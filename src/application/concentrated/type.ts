import { PublicKey } from '@solana/web3.js'
import { CurrencyAmount, Fraction, Percent, Price } from 'test-r-sdk'

import { AmmV3PoolInfo, AmmV3PoolPersonalPosition, ApiAmmV3PoolInfo, TokenAmount } from 'test-r-sdk'

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

  tvl: CurrencyAmount
  fee24h: CurrencyAmount
  fee7d: CurrencyAmount
  fee30d: CurrencyAmount
  apr24h: Percent
  apr7d: Percent
  apr30d: Percent
  feeApr24h: Percent
  feeApr7d: Percent
  feeApr30d: Percent
  volume24h: CurrencyAmount
  volume7d: CurrencyAmount
  volume30d: CurrencyAmount
  rewardsA24h: number
  rewardsB24h: number
  rewardsA7d: number
  rewardsB7d: number
  rewardsA30d: number
  rewardsB30d: number
}

export interface UserPositionAccount {
  /** transform to SDK function, should not used directlly in UI */
  sdkParsed: AmmV3PoolPersonalPosition
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
