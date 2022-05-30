import toPubString from '@/functions/format/toMintString'
import create from 'zustand'
import { RAYMint } from '../token/utils/wellknownToken.config'
import { createNewUIRewardInfo } from './parseRewardInfo'
import { UIRewardInfo } from './type'

export type CreateFarmStore = {
  poolId?: string
  rewards: UIRewardInfo[]
  cannotAddNewReward?: boolean // only creater can add token info entry
}

const useCreateFarms = create<CreateFarmStore>((set) => ({
  poolId: undefined,
  rewards: [{ ...createNewUIRewardInfo(), tokenMint: toPubString(RAYMint) }]
}))

export default useCreateFarms
