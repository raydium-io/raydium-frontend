import { FarmPoolJsonInfo, HydratedFarmInfo } from './type'

export function isJsonFarmInfo(info: HydratedFarmInfo | FarmPoolJsonInfo): info is FarmPoolJsonInfo {
  const isHydrated = (info as HydratedFarmInfo).jsonInfo !== undefined
  return !isHydrated
}

export function isHydratedFarmInfo(info: HydratedFarmInfo | FarmPoolJsonInfo): info is HydratedFarmInfo {
  const isHydrated = (info as HydratedFarmInfo).jsonInfo !== undefined
  return isHydrated
}

export function isFarmInfo(info: any): info is FarmPoolJsonInfo | HydratedFarmInfo {
  return 'rewardInfos' in info && 'lpMint' in info && 'category' in info && 'authority' in info
}
