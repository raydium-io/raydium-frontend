import { HexAddress, Numberish } from '@/types/constants'
import { Percent, TokenAmount } from '@raydium-io/raydium-sdk'
import { SplToken } from '../token/type'

export type UIRewardInfo = {
  id: string | number // for farm edit it will be
  owner?: HexAddress // creator wallet address
  type: 'new added' | 'existed reward'
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
  isRwardingBeforeEnd72h?: boolean // exist working farm // TODO: Dev
  claimableRewards?: TokenAmount // only existed reward may have this

  originData?: Omit<UIRewardInfo, 'originData'> // only edit have this
}
// actually it also use to edit farm
