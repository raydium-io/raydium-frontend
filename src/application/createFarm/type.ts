import { HexAddress, Numberish } from '@/types/constants'
import { Percent } from '@raydium-io/raydium-sdk'
import { SplToken } from '../token/type'

export type UIRewardInfo = {
  id: string | number // for farm edit it will be
  creator?: HexAddress // creator wallet address
  type: 'new added reward info' | 'exist reward info'
  version?: 'v3/v5' | 'v6' // if not detected, that's v6

  // rewardVault?: HexAddress // only existed reward may have this

  token?: SplToken
  amount?: Numberish
  startTime?: Date
  endTime?: Date

  // canEdit: boolean // 🔥 this is not a reward property, but a UI state for wallet account.  it shouldn't be here.
  apr?: Percent // only existed reward may have this // NOTE: it is not elegant here. for apr's info is actually state info
  restAmount?: Numberish // only existed reward may have this
  isRewardEnded?: boolean // for farm edit
  isRewardBeforeStart?: boolean // for farm edit
  isRewarding?: boolean // exist working farm
}
// actually it also use to edit farm

export type CreateFarmStore = {
  poolId?: string
  rewards: UIRewardInfo[]
  cannotAddNewReward?: boolean // only creater can add token info entry
}
