import { PublicKey } from '@solana/web3.js'

import { Fraction, ApiPoolInfoItem as LiquidityJsonInfo, ReplaceType, TokenAmount } from '@raydium-io/raydium-sdk'
import BN from 'bn.js'

import { SplToken } from '../token/type'

export type SDKParsedLiquidityInfo = ReplaceType<LiquidityJsonInfo, string, PublicKey> & {
  jsonInfo: LiquidityJsonInfo
  status: BN // do not know what is this
  baseDecimals: number
  quoteDecimals: number
  lpDecimals: number
  baseReserve: BN
  quoteReserve: BN
  lpSupply: BN
  startTime: BN // second
}
/** computed by other info  */
// eslint-disable-next-line @typescript-eslint/no-empty-interface

export interface HydratedLiquidityInfo extends Omit<SDKParsedLiquidityInfo, 'startTime'> {
  sdkInfo: SDKParsedLiquidityInfo
  sharePercent: Fraction | undefined
  lpToken: SplToken | undefined
  baseToken: SplToken | undefined
  quoteToken: SplToken | undefined
  userBasePooled: TokenAmount | undefined
  userQuotePooled: TokenAmount | undefined
  startTime: number // millisecond
}
