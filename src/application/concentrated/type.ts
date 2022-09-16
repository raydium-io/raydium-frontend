import { Numberish } from '@/types/constants'
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
  priceLower: Numberish
  priceUpper: Numberish
  amountA: Numberish
  amountB: Numberish
  tickLowerIndex: number
  tickUpperIndex: number
  // liquidity: BN__default; // currently useless
  // feeGrowthInsideLastX64A: BN__default; // currently useless
  // feeGrowthInsideLastX64B: BN__default; // currently useless
  // tokenFeesOwedA: BN__default; // currently useless
  // tokenFeesOwedB: BN__default; // currently useless
}
