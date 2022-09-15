import { Percent } from '@raydium-io/raydium-sdk'

import { AmmV3PoolInfo, ApiAmmV3PoolInfo } from 'test-r-sdk'

import { SplToken } from '../token/type'

export type APIConcentratedInfo = ApiAmmV3PoolInfo

export type SDKParsedConcentratedInfo = {
  state: AmmV3PoolInfo
}

/** computed by other info  */
// eslint-disable-next-line @typescript-eslint/no-empty-interface

export interface HydratedConcentratedInfo extends SDKParsedConcentratedInfo {
  protocolFeeRate: Percent
  tradeFeeRate: Percent
  baseToken: SplToken | undefined
  quoteToken: SplToken | undefined
  name: string
  id: string
}
