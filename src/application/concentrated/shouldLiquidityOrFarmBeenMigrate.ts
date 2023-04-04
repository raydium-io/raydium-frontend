import { FarmPoolJsonInfo, HydratedFarmInfo } from '../farms/type'
import { HydratedLiquidityInfo } from '../liquidity/type'

export function shouldLiquidityOrFarmBeenMigrate(info: HydratedLiquidityInfo | HydratedFarmInfo | FarmPoolJsonInfo) {
  return true // TODO: dev temp
}
