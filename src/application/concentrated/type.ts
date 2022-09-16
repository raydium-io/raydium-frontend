import { CurrencyAmount, Percent } from '@raydium-io/raydium-sdk'
import { PublicKey } from '@solana/web3.js'

import { AmmV3PoolInfo, AmmV3PoolPersonalPosition, ApiAmmV3PoolInfo } from 'test-r-sdk'

import { SplToken } from '../token/type'

export type APIConcentratedInfo = ApiAmmV3PoolInfo

export type SDKParsedConcentratedInfo = {
  state: AmmV3PoolInfo
  positionAccount?: AmmV3PoolPersonalPosition[]
}

export interface HydratedConcentratedInfo extends SDKParsedConcentratedInfo {
  protocolFeeRate: Percent
  tradeFeeRate: Percent
  userPositionAccount?: UserPositionAccount[]
  baseToken: SplToken | undefined
  quoteToken: SplToken | undefined
  name: string
  id: string
  liquidity: CurrencyAmount
  fee24h: CurrencyAmount
  fee7d: CurrencyAmount
  fee30d: CurrencyAmount
  volume24h: CurrencyAmount
  volume7d: CurrencyAmount
  volume30d: CurrencyAmount
}

interface UserPositionAccount {
  poolId: PublicKey
  nftMint: PublicKey
  tickLowerIndex: number
  tickUpperIndex: number
  liquidity: number // Rudy promise
  feeGrowthInsideLastX64A: number // Rudy promise (but don't know what's is it)
  feeGrowthInsideLastX64B: number // Rudy promise (but don't know what's is it)
  tokenFeesOwedA: number // Rudy promise
  tokenFeesOwedB: number // Rudy promise
}
