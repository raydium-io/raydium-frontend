import BN from 'bn.js'

import {
  Fraction,
  LiquidityPoolJsonInfo as ConcentratedJsonInfo,
  ReplaceType,
  TokenAmount
} from '@raydium-io/raydium-sdk'
import { PublicKey } from '@solana/web3.js'

import { SplToken } from '../token/type'

export type SDKParsedConcentratedInfo = ReplaceType<ConcentratedJsonInfo, string, PublicKey> & {
  jsonInfo: ConcentratedJsonInfo
  status: BN // do not know what is this
  baseDecimals: number
  quoteDecimals: number
  lpDecimals: number
  baseReserve: BN
  quoteReserve: BN
  lpSupply: BN
  startTime: BN
}
/** computed by other info  */
// eslint-disable-next-line @typescript-eslint/no-empty-interface

export interface HydratedConcentratedInfo extends SDKParsedConcentratedInfo {
  sharePercent: Fraction | undefined
  lpToken: SplToken | undefined
  baseToken: SplToken | undefined
  quoteToken: SplToken | undefined
  userBasePooled: TokenAmount | undefined
  userQuotePooled: TokenAmount | undefined
}
