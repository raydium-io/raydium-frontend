import { currentIsBefore } from '@/functions/date/judges'
import { parseDurationAbsolute, getDuration } from '@/functions/date/parseDuration'
import toPubString from '@/functions/format/toMintString'
import { mul } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'
import { HydratedRewardInfo } from '../farms/type'
import { UIRewardInfo } from './type'

let lastTempUIRewardId = 1
const genTempUIRewardId = () => lastTempUIRewardId++
export function createNewUIRewardInfo(): UIRewardInfo {
  return {
    id: genTempUIRewardId(),
    type: 'new added',
    version: 'v6'
  }
}

export function parsedHydratedRewardInfoToUiRewardInfo(reward: HydratedRewardInfo): UIRewardInfo {
  const restAmount =
    reward.endTime && reward.token && reward.perSecond != null
      ? currentIsBefore(reward.endTime, { unit: 's' })
        ? mul(reward.perSecond, parseDurationAbsolute(getDuration(reward.endTime, Date.now())).seconds)
        : 0
      : undefined
  const fullAmount =
    reward.endTime && reward.openTime && reward.token && reward.perSecond != null
      ? mul(reward.perSecond, parseDurationAbsolute(getDuration(reward.endTime, reward.openTime)).seconds)
      : undefined
  const rewardVersion = !reward.endTime && !reward.openTime ? 'v3/v5' : 'v6'

  const uiRewardInfoCore = {
    ...reward,
    id: toPubString(reward.rewardVault),
    type: 'existed reward',
    amount: fullAmount,
    restAmount,
    endTime: reward.endTime, // chain time
    startTime: reward.openTime, // chain time
    version: rewardVersion
  } as const
  return { ...uiRewardInfoCore, originData: uiRewardInfoCore }
}

export function getRewardSignature(reward: Omit<UIRewardInfo, 'originData'>): string {
  return [
    reward.id,
    toPubString(reward.token?.mint),
    toString(reward.amount),
    toString(reward.restAmount),
    reward.endTime?.toString(),
    reward.startTime?.toString(),
    toString(reward.claimableRewards)
  ].join(', ')
}

export function hasRewardBeenEdited(reward: UIRewardInfo) {
  if (!reward.originData) return false
  const editedSignature = getRewardSignature(reward)
  const originSignature = getRewardSignature(reward.originData)
  return editedSignature !== originSignature
}
