import { PublicKeyish } from '@raydium-io/raydium-sdk'
import { HydratedPairItemInfo, JsonPairItemInfo } from './type'

export function isHydratedPoolItemInfo(info: JsonPairItemInfo | HydratedPairItemInfo): info is HydratedPairItemInfo {
  return typeof info.fee7d === 'object'
}
