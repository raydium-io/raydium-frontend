import { HydratedFarmInfo } from '../farms/type'
import useWallet from '../wallet/useWallet'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { parsedApiRewardInfoToUiRewardInfo } from './parseRewardInfo'
import { CreateFarmStore } from './useCreateFarm'

export function parsedApiFarmInfo(farmInfo: HydratedFarmInfo) {
  const poolId = farmInfo.ammId
  const { owner: currentWalletOwner } = useWallet.getState()
  const uiRewardsInfos: CreateFarmStore['rewards'] = farmInfo.rewards.map((reward) =>
    parsedApiRewardInfoToUiRewardInfo(reward)
  )
  const isFarmCreator = isMintEqual(farmInfo.creator, currentWalletOwner)
  return { isFarmCreator, poolId, uiRewardsInfos }
}
