import { FarmPoolJsonInfo, HydratedFarmInfo } from './type'

export function isJsonFarmInfo(info: HydratedFarmInfo | FarmPoolJsonInfo): info is FarmPoolJsonInfo {
  const isHydrated = (info as HydratedFarmInfo).jsonInfo !== undefined
  return !isHydrated
}

export function isHydratedFarmInfo(info: HydratedFarmInfo | FarmPoolJsonInfo): info is HydratedFarmInfo {
  const isHydrated = (info as HydratedFarmInfo).jsonInfo !== undefined
  return isHydrated
}
