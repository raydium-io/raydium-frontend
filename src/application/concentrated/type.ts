import { Percent } from '@raydium-io/raydium-sdk'
import { PublicKey } from '@solana/web3.js'
import { AmmV3PoolInfo, AmmV3PoolPersonalPosition, ApiAmmV3PoolInfo } from 'test-r-sdk'

export type APIConcentratedInfo = ApiAmmV3PoolInfo

export type SDKParsedConcentratedInfo = {
  state: AmmV3PoolInfo
  positionAccount?: AmmV3PoolPersonalPosition[]
}

export interface HydratedConcentratedInfo extends SDKParsedConcentratedInfo {
  protocolFeeRate: Percent
  tradeFeeRate: Percent
  userPositionAccount?: UserPositionAccount[]
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
