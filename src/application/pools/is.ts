import { PublicKeyish } from '@raydium-io/raydium-sdk'
import { HydratedPoolItemInfo, JsonPairItemInfo } from './type'

export function isHydratedPoolItemInfo(info: JsonPairItemInfo | HydratedPoolItemInfo): info is HydratedPoolItemInfo {
  return typeof info.fee7d === 'object'
}
