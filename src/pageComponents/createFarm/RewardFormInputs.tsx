import useConnection from '@/application/connection/useConnection'
import { hasRewardBeenEdited } from '@/application/createFarm/parseRewardInfo'
import { UIRewardInfo } from '@/application/createFarm/type'
import useCreateFarms from '@/application/createFarm/useCreateFarm'
import useWallet from '@/application/wallet/useWallet'
import CoinInputBoxWithTokenSelector from '@/components/CoinInputBoxWithTokenSelector'
import DateInput from '@/components/DateInput'
import FadeInStable from '@/components/FadeIn'
import Grid from '@/components/Grid'
import InputBox from '@/components/InputBox'
import Row from '@/components/Row'
import { shakeUndifindedItem } from '@/functions/arrayMethods'
import { offsetDateTime } from '@/functions/date/dateFormat'
import { isDateAfter, isDateBefore } from '@/functions/date/judges'
import { parseDurationAbsolute } from '@/functions/date/parseDuration'
import toPubString from '@/functions/format/toMintString'
import { isExist } from '@/functions/judgers/nil'
import { gte, isMeaningfulNumber } from '@/functions/numberish/compare'
import { div, mul } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'
import { shrinkToValue } from '@/functions/shrinkToValue'
import { useRecordedEffect } from '@/hooks/useRecordedEffect'
import { MayFunction } from '@/types/constants'
import produce from 'immer'
import { RefObject, startTransition, useImperativeHandle, useRef, useState } from 'react'

/**
 * if super preferential is not provide(undefined|null) it is normal useState
 * if super preferential is provide(not undefined|null) it is just value, and setState not work
 */
function useStateWithSuperPreferential<T>(
  superPreferential: MayFunction<T>
): [value: T, setState: React.Dispatch<React.SetStateAction<T>>] {
  const superValue = shrinkToValue(superPreferential)
  const [value, setValue] = useState(superValue)

  // if superValue comes to undefined, clear the state
  useRecordedEffect(
    ([prevSuperValue]) => {
      if (prevSuperValue != null && superValue == null) {
        setValue(superValue) // clear the state
      }
    },
    [superValue]
  )

  const doNothing = () => {}
  return [isExist(superValue) ? superValue : value, (isExist(superValue) ? doNothing : setValue) as any]
}

export const MAX_DURATION_SECOND = 2 * 60 * 60 // test
export const MIN_DURATION_SECOND = 1 * 60 * 60 // test
// const MAX_DURATION_DAY = 90
// const MIN_DURATION_DAY = 7
// export const MAX_DURATION_SECOND = MAX_DURATION_DAY * 24 * 60 * 60
// export const MIN_DURATION_SECOND = MIN_DURATION_DAY * 24 * 60 * 60
export const MAX_DURATION = MAX_DURATION_SECOND * 1000
export const MIN_DURATION = MIN_DURATION_SECOND * 1000

const HOUR_SECONDS = 60 * 60
const DAY_SECONDS = 24 * 60 * 60

export type RewardFormCardInputsParams = {
  reward: UIRewardInfo
  componentRef?: RefObject<any>
  maxDurationSeconds?: number /* only edit mode  seconds */
  minDurationSeconds?: number /* only edit mode  seconds */
}

export type RewardCardInputsHandler = {
  isValid: boolean
}

export function RewardFormCardInputs({
  reward: targetReward,
  minDurationSeconds = MIN_DURATION_SECOND,
  maxDurationSeconds = MAX_DURATION_SECOND,
  componentRef
}: RewardFormCardInputsParams) {
  const balances = useWallet((s) => s.balances)
  const rewards = useCreateFarms((s) => s.rewards)
  const rewardIndex = rewards.findIndex(({ id }) => id === targetReward.id)
  const reward = rewards[rewardIndex] as UIRewardInfo | undefined // usdate fresh data

  const isUnedited72hReward = Boolean(reward && reward.isRwardingBeforeEnd72h && !hasRewardBeenEdited(reward))
  const isUneditedEndedReward = Boolean(reward && reward.isRewardEnded && !hasRewardBeenEdited(reward))

  const [durationTime, setDurationTime] = useStateWithSuperPreferential(
    reward?.endTime && reward.startTime ? reward.endTime.getTime() - reward.startTime.getTime() : undefined
  )

  const isInit = useRef(true)

  // clear data
  if (isUneditedEndedReward && isInit.current) {
    isInit.current = false
    setDurationTime(undefined)
    startTransition(() => {
      useCreateFarms.setState({
        rewards: produce(rewards, (draft) => {
          if (!draft[rewardIndex]) return

          draft[rewardIndex].startTime = undefined
          draft[rewardIndex].endTime = undefined
          draft[rewardIndex].amount = undefined
        })
      })
    })
  }

  // NOTE: only 'days' or 'hours'
  const durationBoundaryUnit = parseDurationAbsolute(maxDurationSeconds * 1000).days > 1 ? 'days' : 'hours'
  const minDurationValue = minDurationSeconds / (durationBoundaryUnit === 'hours' ? HOUR_SECONDS : DAY_SECONDS)
  const maxDurationValue = maxDurationSeconds / (durationBoundaryUnit === 'hours' ? HOUR_SECONDS : DAY_SECONDS)
  const estimatedValue =
    reward?.amount && durationTime ? div(reward.amount, parseDurationAbsolute(durationTime).days) : undefined
  const disableCoinInput = reward?.isRwardingBeforeEnd72h
  const disableDurationInput = false
  const disableStartTimeInput = reward?.isRwardingBeforeEnd72h
  const disableEndTimeInput = !reward?.isRwardingBeforeEnd72h
  const disableEstimatedInput = reward?.isRwardingBeforeEnd72h

  const chainTimeOffset = useConnection((s) => s.chainTimeOffset) ?? 0
  const currentBlockChainDate = new Date(Date.now() + chainTimeOffset)

  const [isInputDuration, setIsInputDuration] = useState(false)

  const isStartTimeAfterCurrent = Boolean(
    reward && reward.startTime && isDateAfter(reward.startTime, currentBlockChainDate)
  )
  const isDurationValid = Boolean(
    durationTime != null && minDurationSeconds * 1e3 <= durationTime && durationTime <= maxDurationSeconds * 1e3
  )
  const haveBalance = Boolean(reward && gte(balances[toPubString(reward.token?.mint)], reward.amount))
  const isAmountValid = haveBalance

  const rewardTokenAmount = isUnedited72hReward
    ? ''
    : reward && toString(reward.amount, { decimalLength: `auto ${reward.token?.decimals ?? 6}` })
  const rewardDuration = isUnedited72hReward
    ? undefined /*  for extends existed reward */
    : getDurationValueFromMilliseconds(durationTime, durationBoundaryUnit)
  const rewardStartTime = isUnedited72hReward ? reward?.endTime /*  for extends existed reward */ : reward?.startTime
  const rewardEndTime = isUnedited72hReward ? undefined /*  for extends existed reward */ : reward?.endTime
  const rewardEstimatedValue =
    estimatedValue && toString(estimatedValue, { decimalLength: `auto ${reward?.token?.decimals ?? 6}` })
  const isValid = isDurationValid && isAmountValid && (reward?.isRwardingBeforeEnd72h || isStartTimeAfterCurrent)
  useImperativeHandle<any, RewardCardInputsHandler>(componentRef, () => ({ isValid }))
  if (!reward) return null
  return (
    <Grid className="gap-4">
      <CoinInputBoxWithTokenSelector
        className={`rounded-md`}
        haveHalfButton
        topLeftLabel="Reward Token"
        disableTokens={shakeUndifindedItem(rewards.map((r) => r.token))}
        canSelectQuantumSOL={Boolean(reward.token)}
        disabled={disableCoinInput}
        value={rewardTokenAmount}
        token={reward.token}
        disabledTokenSelect={reward.isRewardBeforeStart || reward.isRewarding || reward.isRewardEnded}
        onSelectCoin={(token) => {
          useCreateFarms.setState({
            rewards: produce(rewards, (draft) => {
              if (rewardIndex >= 0) draft[rewardIndex].token = token
            })
          })
        }}
        onUserInput={(amount) => {
          useCreateFarms.setState({
            rewards: produce(rewards, (draft) => {
              if (rewardIndex >= 0) draft[rewardIndex].amount = amount
            })
          })
        }}
      />
      <div>
        <Row className="gap-4">
          <InputBox
            className="grow-2 rounded-md text-sm font-medium text-white px-4"
            inputClassName="placeholder:text-[#abc4ff40]"
            label="Total Duration"
            type="number"
            inputHTMLProps={{
              min: 1,
              maxLength: 3,
              step: 1
            }}
            pattern={/^\d{0,5}$/}
            placeholder={`${minDurationValue} - ${maxDurationValue}`}
            value={rewardDuration}
            disabled={disableDurationInput}
            onBlur={(v) => {
              setIsInputDuration(false)
            }}
            suffix={
              <div className="font-medium text-sm text-[#abc4ff80]">
                {durationBoundaryUnit === 'hours' ? 'Hours' : 'Days'}
              </div>
            }
            onUserInput={(v) => {
              if (!v) return
              setIsInputDuration(true)
              const totalDuration = getDurationFromString(v, durationBoundaryUnit)
              setDurationTime(isMeaningfulNumber(totalDuration) ? totalDuration : undefined)
              if (totalDuration > 0) {
                useCreateFarms.setState({
                  rewards: produce(rewards, (draft) => {
                    if (!draft[rewardIndex]) return

                    const haveStartTime = Boolean(rewardStartTime)
                    const haveEndTime = Boolean(rewardEndTime)

                    // set end time
                    if (haveStartTime) {
                      draft[rewardIndex].endTime = offsetDateTime(rewardStartTime, {
                        milliseconds: totalDuration
                      })
                      draft[rewardIndex].startTime = rewardStartTime
                    }

                    // set amount (only edit-in-rewarding)
                    if (reward.isRwardingBeforeEnd72h) {
                      draft[rewardIndex].amount = mul(estimatedValue, parseDurationAbsolute(totalDuration).days)
                    }

                    // set start time
                    if (haveEndTime && !haveStartTime) {
                      const calculatedStartTime = offsetDateTime(draft[rewardIndex].endTime, {
                        milliseconds: -totalDuration
                      })
                      if (isDateAfter(calculatedStartTime, Date.now())) {
                        draft[rewardIndex].startTime = calculatedStartTime
                      }
                    }
                  })
                })
              }
            }}
          />
          <DateInput
            className="grow rounded-md px-4"
            label="Farming Starts"
            inputProps={{
              inputClassName: 'text-sm font-medium text-white'
            }}
            showTime={{ format: 'Select date: HH:mm' }}
            value={rewardStartTime}
            disabled={disableStartTimeInput}
            disableDateBeforeCurrent
            onDateChange={(selectedDate) => {
              if (!selectedDate) return
              return useCreateFarms.setState({
                rewards: produce(rewards, (draft) => {
                  if (!draft[rewardIndex]) return

                  // set end time
                  draft[rewardIndex].endTime = durationTime
                    ? offsetDateTime(selectedDate, { milliseconds: durationTime })
                    : undefined

                  // set start time
                  draft[rewardIndex].startTime = selectedDate
                })
              })
            }}
          />
          <DateInput
            className="shrink-0 grow rounded-md px-4"
            label="Farming Ends"
            inputProps={{
              inputClassName: 'text-sm font-medium text-white'
            }}
            value={rewardEndTime}
            disabled={disableEndTimeInput}
            disableDateBeforeCurrent
            showTime={false}
            isValidDate={(date) => {
              const isStartTimeBeforeCurrent = rewardStartTime && isDateBefore(rewardStartTime, currentBlockChainDate)
              if (reward.isRewardEnded && isStartTimeBeforeCurrent) {
                const duration = Math.round(
                  parseDurationAbsolute(date.getTime() - currentBlockChainDate.getTime()).seconds
                )
                return minDurationSeconds <= duration
              } else {
                const duration = Math.round(
                  parseDurationAbsolute(date.getTime() - (rewardStartTime ?? currentBlockChainDate).getTime()).seconds
                )
                return minDurationSeconds <= duration && duration <= maxDurationSeconds
              }
            }}
            onDateChange={(selectedDate) => {
              if (!selectedDate) return
              return useCreateFarms.setState({
                rewards: produce(rewards, (draft) => {
                  if (!draft[rewardIndex]) return

                  const haveStartTime = Boolean(rewardStartTime)

                  // set end time
                  draft[rewardIndex].endTime = selectedDate

                  // set start time
                  if (durationTime && !haveStartTime) {
                    draft[rewardIndex].startTime = offsetDateTime(selectedDate, { milliseconds: -durationTime })
                  }

                  // set amount (only edit-in-rewarding)
                  if (reward.isRwardingBeforeEnd72h) {
                    draft[rewardIndex].amount = mul(
                      estimatedValue,
                      parseDurationAbsolute(selectedDate.getTime() - rewardStartTime!.getTime()).days
                    )
                  }

                  // set duration days
                  if (haveStartTime) {
                    const durationSeconds = parseDurationAbsolute(
                      selectedDate.getTime() - rewardStartTime!.getTime()
                    ).seconds
                    if (durationSeconds < minDurationSeconds) {
                      draft[rewardIndex].startTime = offsetDateTime(selectedDate, {
                        seconds: -minDurationSeconds
                      })
                      setDurationTime(minDurationSeconds)
                    } else if (durationSeconds > maxDurationSeconds) {
                      draft[rewardIndex].startTime = offsetDateTime(selectedDate, {
                        seconds: -maxDurationSeconds
                      })
                      setDurationTime(maxDurationSeconds)
                    } else {
                      setDurationTime(durationSeconds)
                    }
                  }
                })
              })
            }}
          />
        </Row>
        <FadeInStable show={!isInputDuration && durationTime != null}>
          {durationTime! > maxDurationSeconds * 1e3 ? (
            <div className="text-[#DA2EEF] text-sm font-medium pt-2 pl-2">
              Period is longer than max duration of {maxDurationValue} {durationBoundaryUnit}
            </div>
          ) : durationTime! < minDurationSeconds * 1e3 ? (
            <div className="text-[#DA2EEF] text-sm font-medium pt-2 pl-2">
              Period is shorter than min duration of {minDurationValue} {durationBoundaryUnit}
            </div>
          ) : null}
        </FadeInStable>
        <div> </div>
      </div>
      <InputBox
        disabled={disableEstimatedInput}
        decimalMode
        decimalCount={reward.token?.decimals ?? 6}
        className="rounded-md px-4 font-medium text-sm"
        inputClassName="text-white"
        label="Estimated rewards / day"
        value={rewardEstimatedValue}
        onUserInput={(v) => {
          if (!durationTime) return
          useCreateFarms.setState({
            rewards: produce(rewards, (draft) => {
              if (rewardIndex >= 0) draft[rewardIndex].amount = mul(parseDurationAbsolute(durationTime).days, v)
            })
          })
        }}
        suffix={
          isMeaningfulNumber(estimatedValue) ? (
            <div className="font-medium text-sm text-[#abc4ff80]">{reward.token?.symbol ?? '--'}</div>
          ) : undefined
        }
      />
    </Grid>
  )
}
function getDurationFromString(v: string, unit: 'hours' | 'days') {
  const value = v.trim() // noneed days and hours, but no need to change through
  const valueNumber = isFinite(Number(value)) ? Number(value) : undefined
  const dayNumber = unit === 'days' ? valueNumber : undefined
  const hourNumber = unit === 'hours' ? valueNumber : undefined
  const totalDuration = (dayNumber ?? 0) * 24 * 60 * 60 * 1000 + (hourNumber ?? 0) * 60 * 60 * 1000
  return totalDuration
}

function getDurationValueFromMilliseconds(duration: number | undefined, unit: 'hours' | 'days') {
  return duration ? Math.round(parseDurationAbsolute(duration)[unit]) : duration
}
