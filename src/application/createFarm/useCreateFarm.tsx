import create from 'zustand'
import { createNewUIRewardInfo } from './parseRewardInfo'
import { UIRewardInfo } from './type'

export type CreateFarmStore = {
  farmId?: string // in edit mode
  poolId?: string
  rewards: UIRewardInfo[]
  cannotAddNewReward?: boolean // only creater can add token info entry
}

const useCreateFarms = create<CreateFarmStore>((set) => ({
  rewards: [{ ...createNewUIRewardInfo() }]
}))

export default useCreateFarms
