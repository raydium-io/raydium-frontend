import toPubString from '@/functions/format/toMintString'
import { Numberish } from '@/types/constants'
import create from 'zustand'
import { RAYMint } from '../token/utils/wellknownToken.config'

export type RewardInfo = {
  tokenMint?: string
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
  rewards: [{ isNewAdded: true, tokenMint: toPubString(RAYMint) }]
}))

export default useCreateFarms
