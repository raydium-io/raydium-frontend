import { CreateFarmStore } from './useCreateFarm'
import { HydratedFarmInfo } from '../farms/type'
import { currentIsBefore } from '@/functions/date/judges'
import { mul } from '@/functions/numberish/operations'
import { getDuration, parseDurationAbsolute } from '@/functions/date/parseDuration'
import toPubString from '@/functions/format/toMintString'
import { toString } from '@/functions/numberish/toString'
import useWallet from '../wallet/useWallet'
import { isMintEqual } from '@/functions/judgers/areEqual'

export function parsedApiFarmInfoToUIRewardsInfo(farmInfo: HydratedFarmInfo) {
  const poolId = farmInfo.ammId
  const { owner: currentWalletOwner } = useWallet.getState()
  const uiRewardsInfos: CreateFarmStore['rewards'] = farmInfo.rewards.map((reward) => {
    const isRewardCreatedByThisOwner = isMintEqual(reward.owner, currentWalletOwner)
    const rewardHasEndTime = Boolean(reward.endTime) // currently only v6 has reward
    const rewardHasOpenTime = Boolean(reward.openTime) // currently only v6 has reward
    const rewardIsEnd = rewardHasEndTime && currentIsBefore(reward.endTime!, { unit: 's' })
    const rewardIsOpen = rewardHasOpenTime && currentIsBefore(reward.openTime!, { unit: 's' })
    const isRewardEditable = isRewardCreatedByThisOwner && (rewardIsEnd || !rewardIsOpen)
    const restAmount = reward.endTime
      ? currentIsBefore(reward.endTime, { unit: 's' })
        ? mul(
            reward.perSecond,
            parseDurationAbsolute(getDuration(toString(mul(reward.endTime, 1000)), Date.now())).seconds
          )
        : 0
      : undefined
    return {
      tokenMint: toPubString(reward.token?.mint),
      amount: restAmount,
      endTime: reward.endTime ? new Date(reward.endTime * 1000) : undefined,
      startTime: reward.openTime ? new Date(reward.openTime * 1000) : undefined,
      apr: reward.apr,
      canEdit: isRewardEditable,
      isRewarding: (!rewardHasEndTime && !rewardHasOpenTime) /* v3/v5 */ || (rewardIsOpen && !rewardIsEnd) /* v6 */,
      version: !rewardHasEndTime && !rewardHasOpenTime ? 'v3/v5' : 'v6'
    }
  })
  const isCreator = isMintEqual(farmInfo.creator, currentWalletOwner)
  return { isCreator, poolId, uiRewardsInfos }
}
