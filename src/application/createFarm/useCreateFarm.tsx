import create from 'zustand'
import { UIRewardInfo } from './type'

export type CreateFarmStore = {
  farmId?: string // in edit mode
  poolId?: string
  rewards: UIRewardInfo[]
  cannotAddNewReward?: boolean // only creater can add token info entry
}

const useCreateFarms = create<CreateFarmStore>((set) => ({
  rewards: []
}))

export default useCreateFarms

export function cleanStoreEmptyRewards() {
  useCreateFarms.setState((state) => ({
    rewards: state.rewards.filter((r) => r.amount)
  }))
}
