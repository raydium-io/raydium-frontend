import { HydratedConcentratedInfo } from '../concentrated/type'

export function isHydratedConcentratedItemInfo(info: any): info is HydratedConcentratedInfo {
  return info && 'idString' in info
}
