import { HydratedPairItemInfo, JsonPairItemInfo } from './type'

export function isHydratedPoolItemInfo(
  info: JsonPairItemInfo | HydratedPairItemInfo | undefined
): info is HydratedPairItemInfo {
  return typeof info?.fee7d === 'object'
}
export function isJsonPoolItemInfo(
  info: JsonPairItemInfo | HydratedPairItemInfo | undefined
): info is JsonPairItemInfo {
  return !isHydratedPoolItemInfo(info)
}
