import { isMintEqual } from '@/functions/judgers/areEqual'
import { AmmPoolInfo } from 'test-r-sdk'
import useConcentrated, { SDKParsedAmmPool } from './useConcentrated'

export function changeCurrentAmmPool(
  selectableAmmPools: SDKParsedAmmPool[] | undefined,
  config: AmmPoolInfo['ammConfig']
) {
  if (!selectableAmmPools) return
  const targetAmmPool = selectableAmmPools.find(({ state: { id } }) => {
    isMintEqual(id, config.id)
  })
  if (!targetAmmPool) return
  useConcentrated.setState({ currentAmmPool: targetAmmPool })
}
