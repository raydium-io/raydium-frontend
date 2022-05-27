import toPubString from '@/functions/format/toMintString'
import { Numberish } from '@/types/constants'
import { Percent } from '@raydium-io/raydium-sdk'
import create from 'zustand'
import { RAYMint } from '../token/utils/wellknownToken.config'

export type RewardInfo = {
  tokenMint?: string
  amount?: Numberish | '(official maintained)'
  startTime?: Date
  endTime?: Date
  apr?: Percent // for farm edit
  canEdit: boolean
  isEnded?: boolean // for farm edit
  isBeforeOpen?: boolean // for farm edit
  isRewarding?: boolean // exist working farm
  version?: 'v3/v5' | 'v6' // if not satisfied, that's v6
}

// actually it also use to edit farm
export type CreateFarmStore = {
  poolId?: string
  rewards: RewardInfo[]
  cannotAddNewReward?: boolean // only creater can add token info entry
}

const useCreateFarms = create<CreateFarmStore>((set) => ({
  rewards: [{ canEdit: true, tokenMint: toPubString(RAYMint) }]
}))

export default useCreateFarms
