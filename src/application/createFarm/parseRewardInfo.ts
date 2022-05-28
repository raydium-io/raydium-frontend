import { offsetDateTime } from '@/functions/date/dateFormat'
import { currentIsBefore, isDateAfter, isDateBefore } from '@/functions/date/judges'
import { parseDurationAbsolute, getDuration } from '@/functions/date/parseDuration'
import toPubString from '@/functions/format/toMintString'
import { mul } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'
import useConnection from '../connection/useConnection'
import { HydratedRewardInfo } from '../farms/type'
import { UIRewardInfo } from './type'

let lastTempUIRewardId = 1
const genTempUIRewardId = () => lastTempUIRewardId++
export function createNewUIRewardInfo(): UIRewardInfo {
  return {
    id: genTempUIRewardId(),
    type: 'new added reward info',
    version: 'v6'
  }
}

/**
 * inner have onlineChainTimeOffset
 */
export function parsedApiRewardInfoToUiRewardInfo(reward: HydratedRewardInfo): UIRewardInfo {
  const { chainTimeOffset } = useConnection.getState()
  const restAmount = reward.endTime
    ? currentIsBefore(reward.endTime, { unit: 's' })
      ? mul(
          reward.perSecond,
          parseDurationAbsolute(getDuration(toString(mul(reward.endTime, 1000)), Date.now())).seconds
        )
      : 0
    : undefined
  const fullAmount =
    reward.endTime && reward.openTime
      ? mul(
          reward.perSecond,
          parseDurationAbsolute(getDuration(toString(mul(reward.endTime, 1000)), toString(mul(reward.openTime, 1000))))
            .seconds
        )
      : undefined
  const rewardVersion = !reward.endTime && !reward.openTime ? 'v3/v5' : 'v6'
  const rewardStartTime = reward.openTime ? new Date(reward.openTime * 1000) : undefined // chain time
  const rewardEndTime = reward.endTime ? new Date(reward.endTime * 1000) : undefined // chain time
  const onlineCurrentDate = Date.now() + (chainTimeOffset ?? 0)
  const isRewardBeforeStart = Boolean(rewardStartTime && isDateBefore(onlineCurrentDate, rewardStartTime))
  const isRewardEnded = Boolean(rewardEndTime && isDateAfter(onlineCurrentDate, rewardEndTime))
  const isRewarding = (!rewardStartTime && !rewardEndTime) || (!isRewardEnded && !isRewardBeforeStart)

  return {
    id: toPubString(reward.rewardVault),
    type: 'exist reward info',
    tokenMint: toPubString(reward.rewardMint),
    amount: fullAmount,
    restAmount,
    endTime: reward.endTime ? new Date(reward.endTime * 1000) : undefined, // chain time
    startTime: reward.openTime ? new Date(reward.openTime * 1000) : undefined, // chain time
    version: rewardVersion,
    apr: reward.apr,
    isRewarding,
    isRewardBeforeStart,
    isRewardEnded
  }
}
