import { CurrencyAmount, Percent } from '@raydium-io/raydium-sdk'
import { PublicKey } from '@solana/web3.js'

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
  liquidity: CurrencyAmount
  fee24h: CurrencyAmount
  fee7d: CurrencyAmount
  fee30d: CurrencyAmount
  volume24h: CurrencyAmount
  volume7d: CurrencyAmount
  volume30d: CurrencyAmount
}

export interface UserPositionAccount {
  /** transform to SDK function, should not used directlly in UI */
  sdkParsed: AmmV3PoolPersonalPosition
  poolId: PublicKey
  nftMint: PublicKey
  priceLower: Numberish
  priceUpper: Numberish
  amountA?: TokenAmount
  amountB?: TokenAmount
  tokenA?: SplToken
  tokenB?: SplToken
  tickLowerIndex: number
  tickUpperIndex: number
  // liquidity: BN__default; // currently useless
  // feeGrowthInsideLastX64A: BN__default; // currently useless
  // feeGrowthInsideLastX64B: BN__default; // currently useless
  // tokenFeesOwedA: BN__default; // currently useless
  // tokenFeesOwedB: BN__default; // currently useless
}
