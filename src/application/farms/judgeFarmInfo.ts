import { FarmPoolJsonInfo, HydratedFarmInfo } from './type'

export function isFarmJsonInfo(info: HydratedFarmInfo | FarmPoolJsonInfo): info is FarmPoolJsonInfo {
  const isHydrated = (info as HydratedFarmInfo).jsonInfo !== undefined
  return !isHydrated
}

export function isFarmHydratedInfo(info: HydratedFarmInfo | FarmPoolJsonInfo): info is HydratedFarmInfo {
  return !isFarmJsonInfo(info)
}
