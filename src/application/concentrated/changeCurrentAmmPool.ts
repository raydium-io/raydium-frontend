import { isMintEqual } from '@/functions/judgers/areEqual'
import { AmmV3PoolInfo } from 'test-r-sdk'
import { HydratedConcentratedInfo } from './type'
import useConcentrated from './useConcentrated'

export function changeCurrentAmmPool(
  selectableAmmPools: HydratedConcentratedInfo[] | undefined,
  config: AmmV3PoolInfo['ammConfig']
) {
  if (!selectableAmmPools) return
  const targetAmmPool = selectableAmmPools.find(({ state: { id } }) => {
    isMintEqual(id, config.id)
  })
  if (!targetAmmPool) return
  useConcentrated.setState({ currentAmmPool: targetAmmPool })
}
