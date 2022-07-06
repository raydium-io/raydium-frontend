import { isDateAfter } from '@/functions/date/judges'
import { getDuration } from '@/functions/date/parseDuration'
import { gte, isMeaningfulNumber, lte } from '@/functions/numberish/compare'
import useConnection from '../connection/useConnection'
import { MAX_DURATION, MIN_DURATION } from '../farms/handleFarmInfo'
import { RAYMint } from '../token/wellknownToken.config'
import useWallet from '../wallet/useWallet'
import { UIRewardInfo } from './type'

export function valid300Ray(): { valid: boolean; reason?: string } {
  const { getBalance, owner } = useWallet.getState()
  if (!owner) return { valid: false, reason: 'wallet not connected' }
  const userRayBalance = getBalance(RAYMint)
  const haveOver300Ray = gte(userRayBalance ?? 0, 300) /** Test */
  if (!haveOver300Ray) return { valid: false, reason: 'User must have 300 RAY' }
  return { valid: true }
}

export function validUiRewardInfo(rewards: UIRewardInfo[]): { valid: boolean; reason?: string } {
  const { getBalance, owner } = useWallet.getState()
  if (!owner) return { valid: false, reason: 'wallet not connected' }

  const { chainTimeOffset = 0 } = useConnection.getState()
  const chainDate = new Date(Date.now() + chainTimeOffset)
  for (const reward of rewards) {
    // check user has select a token
    if (!reward.token) return { valid: false, reason: 'Confirm reward token' }

    // check user has set amount
    if (!isMeaningfulNumber(reward.amount))
      return { valid: false, reason: `Enter ${reward.token.symbol ?? '--'} token amount` }

    // check user have enough balance
    const haveBalance = gte(getBalance(reward.token), reward.amount)
    if (!haveBalance) return { valid: false, reason: `Insufficient ${reward.token.symbol} balance` }

    // check if startTime and endTime is setted
    if (!reward.startTime || !reward.endTime) return { valid: false, reason: 'Confirm emission time setup' }

    // check starttime is valid
    if (!isDateAfter(reward.startTime, chainDate)) return { valid: false, reason: 'Insufficient start time' }

    // check duration
    const duration = getDuration(reward.endTime, reward.startTime)
    if (!gte(duration, MIN_DURATION) && lte(duration, MAX_DURATION))
      return { valid: false, reason: 'Insufficient duration' }
  }
  return { valid: true }
}
