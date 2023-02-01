import { ApiPoolInfoItem, PublicKeyish } from '@raydium-io/raydium-sdk'

import { HydratedPairItemInfo, JsonPairItemInfo } from './type'

export function isHydratedPoolItemInfo(info: JsonPairItemInfo | HydratedPairItemInfo): info is HydratedPairItemInfo {
  return typeof info.fee7d === 'object'
}

export function isApiPoolInfoItem(info: any): info is ApiPoolInfoItem {
  return 'marketId' in info
}
