import { create } from 'zustand'

import { HydratedFarmInfo } from '../farms/type'

type StakingStore = {
  stakeDialogMode: 'deposit' | 'withdraw'
  isStakeDialogOpen: boolean
  stakeDialogInfo: undefined | HydratedFarmInfo
}

const useStaking = create<StakingStore>((set, get) => ({
  stakeDialogMode: 'deposit',
  isStakeDialogOpen: false,
  stakeDialogInfo: undefined
}))

export default useStaking
