import { LiquidityPoolJsonInfo, PublicKeyish } from 'test-r-sdk'

import { HydratedPairItemInfo, JsonPairItemInfo } from './type'

export function isHydratedPoolItemInfo(info: JsonPairItemInfo | HydratedPairItemInfo): info is HydratedPairItemInfo {
  return typeof info.fee7d === 'object'
}

export function isLiquidityPoolJsonInfo(info: any): info is LiquidityPoolJsonInfo {
  return 'marketId' in info
}
