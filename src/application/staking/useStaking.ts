import create from 'zustand'

import { HydratedFarmInfo } from '../farms/type'

type StakingStore = {
  hydratedStakingInfos: HydratedFarmInfo[] // steal from useFarm

  stakeDialogMode: 'deposit' | 'withdraw'
  isStakeDialogOpen: boolean
  stakeDialogInfo: undefined | HydratedFarmInfo
}

const useStaking = create<StakingStore>((set, get) => ({
  hydratedStakingInfos: [],

  stakeDialogMode: 'deposit',
  isStakeDialogOpen: false,
  stakeDialogInfo: undefined
}))

export default useStaking
