import { isDateAfter } from '@/functions/date/judges'
import { getDuration } from '@/functions/date/parseDuration'
import { toHumanReadable } from '@/functions/format/toHumanReadable'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { gte, isMeaningfulNumber, lt, lte } from '@/functions/numberish/compare'
import { add, div } from '@/functions/numberish/operations'
import useConnection from '../connection/useConnection'
import { MAX_DURATION, MIN_DURATION } from '../farms/handleFarmInfo'
import { RAYMint } from '../token/wellknownToken.config'
import useWallet from '../wallet/useWallet'
import { UIRewardInfo } from './type'
import useCreateFarms from './useCreateFarm'

export function validate300Ray(): { valid: boolean; reason?: string } {
  const { getBalance, owner } = useWallet.getState()
  if (!owner) return { valid: false, reason: 'wallet not connected' }

  const { rewards } = useCreateFarms.getState()
  const rewardRayAmount = rewards.find((r) => isMintEqual(r.token?.mint, RAYMint))?.amount
  const haveOver300Ray = gte(getBalance(RAYMint) ?? 0, add(0, rewardRayAmount ?? 0)) /** Test 300 RAY */
  if (!haveOver300Ray) return { valid: false, reason: 'User must have 300 RAY' }
  return { valid: true }
}

export function isUiRewardInfoEmpty(reward: UIRewardInfo): boolean {
  return !reward.token && !reward.amount && !reward.startTime && !reward.endTime
}

type ValidRewardInfo = {
  valid: boolean
  reason: string
  invalidRewardProperties: ('token' | 'token-amount' | 'start-time' | 'end-time' | 'duration' | 'emission')[]
}
export function validateUiRewardInfo(rewards: UIRewardInfo | UIRewardInfo[]): ValidRewardInfo {
  const { getBalance } = useWallet.getState()

  const { chainTimeOffset = 0 } = useConnection.getState()
  const chainDate = new Date(Date.now() + chainTimeOffset)

  const result: ValidRewardInfo = {
    valid: true,
    reason: '',
    invalidRewardProperties: []
  }

  for (const reward of [rewards].flat()) {
    // check user has select a token
    if (!reward.token) {
      result.valid = false
      result.reason = 'Confirm reward token'
      result.invalidRewardProperties = [...result.invalidRewardProperties, 'token']
    }

    // check user has set amount
    if (!isMeaningfulNumber(reward.amount)) {
      result.valid = false
      result.reason = `Enter ${reward.token?.symbol ?? '--'} token amount`
      result.invalidRewardProperties = [...result.invalidRewardProperties, 'token-amount']
    }

    // check user have enough balance
    const haveBalance = gte(getBalance(reward.token), reward.amount)
    if (!haveBalance) {
      result.valid = false
      result.reason = `Insufficient ${reward.token?.symbol ?? '--'} balance`
      result.invalidRewardProperties = [...result.invalidRewardProperties, 'token-amount']
    }

    // check if startTime and endTime is setted
    if (!reward.startTime || !reward.endTime) {
      result.valid = false
      result.reason = 'Confirm emission time setup'
      result.invalidRewardProperties = [...result.invalidRewardProperties, 'duration']
    }

    const minBoundary =
      reward.endTime &&
      reward.startTime &&
      reward.token?.decimals &&
      div(getDuration(reward.endTime, reward.startTime) / 1000, 10 ** reward.token.decimals)
    if (lt(reward.amount, minBoundary)) {
      result.valid = false
      result.reason = `Emission rewards is lower than min required`
      result.invalidRewardProperties = [...result.invalidRewardProperties, 'emission']
    }

    // check starttime is valid
    if (!reward.startTime || !isDateAfter(reward.startTime, chainDate)) {
      result.valid = false
      result.reason = 'Insufficient start time'
      result.invalidRewardProperties = [...result.invalidRewardProperties, 'start-time']
    }

    // check duration
    const duration = reward.endTime && reward.startTime && getDuration(reward.endTime, reward.startTime)
    if (!gte(duration, MIN_DURATION) || !lte(duration, MAX_DURATION)) {
      result.valid = false
      result.reason = 'Insufficient duration'
      result.invalidRewardProperties = [...result.invalidRewardProperties, 'duration']
    }
  }
  return result
}
