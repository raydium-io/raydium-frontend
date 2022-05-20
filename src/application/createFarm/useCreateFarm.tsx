import { Numberish } from '@/types/constants'
import { SplTokens } from '@raydium-io/raydium-sdk'
import create from 'zustand'
import { SplToken } from '../token/type'

export type RewardInfo = {
  token?: SplToken
  amount?: Numberish
  startTime?: Date
  endTime?: Date
  isNewAdded: boolean
}

// actually it also use to edit farm
export type CreateFarmStore = {
  poolId?: string
  rewards: RewardInfo[]
}

const useCreateFarms = create<CreateFarmStore>((set) => ({
  rewards: [{ isNewAdded: true }]
}))

export default useCreateFarms
