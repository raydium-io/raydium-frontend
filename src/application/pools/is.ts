import { LiquidityPoolJsonInfo, PublicKeyish } from 'test-r-sdk'

import { HydratedConcentratedInfo } from '../concentrated/type'

import { HydratedPairItemInfo, JsonPairItemInfo } from './type'

export function isHydratedPoolItemInfo(info: JsonPairItemInfo | HydratedPairItemInfo): info is HydratedPairItemInfo {
  return typeof info.fee7d === 'object'
}

export function isHydratedConcentratedItemInfo(info: HydratedConcentratedInfo): info is HydratedConcentratedInfo {
  return typeof info.idString === 'string'
}

export function isLiquidityPoolJsonInfo(info: any): info is LiquidityPoolJsonInfo {
  return 'marketId' in info
}
