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
  canEdit: boolean | 'only-x' | 'only'
}

// actually it also use to edit farm
export type CreateFarmStore = {
  poolId?: string
  rewards: RewardInfo[]
  cannotAddNewReward?: boolean // only create can add token info entry
}

const useCreateFarms = create<CreateFarmStore>((set) => ({
  rewards: [{ canEdit: true, tokenMint: toPubString(RAYMint) }]
}))

export default useCreateFarms
