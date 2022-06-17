import useConnection from '@/application/connection/useConnection'
import { UIRewardInfo } from '@/application/createFarm/type'
import useCreateFarms from '@/application/createFarm/useCreateFarm'
import useWallet from '@/application/wallet/useWallet'
import CoinInputBoxWithTokenSelector from '@/components/CoinInputBoxWithTokenSelector'
import DateInput from '@/components/DateInput'
import FadeInStable, { FadeIn } from '@/components/FadeIn'
import Grid from '@/components/Grid'
import InputBox from '@/components/InputBox'
import Row from '@/components/Row'
import { shakeUndifindedItem } from '@/functions/arrayMethods'
import { offsetDateTime } from '@/functions/date/dateFormat'
import { isDateAfter, isDateBefore } from '@/functions/date/judges'
import parseDuration, { parseDurationAbsolute } from '@/functions/date/parseDuration'
import toPubString from '@/functions/format/toMintString'
import { isExist } from '@/functions/judgers/nil'
import { gte, isMeaningfulNumber } from '@/functions/numberish/compare'
import { div, mul } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'
import { shrinkToValue } from '@/functions/shrinkToValue'
import { useRecordedEffect } from '@/hooks/useRecordedEffect'
import { MayFunction } from '@/types/constants'
import produce from 'immer'
import { RefObject, useImperativeHandle, useState } from 'react'

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

const MAX_DURATION_DAY = 90
const MIN_DURATION_DAY = 7 /* FIXME: for Test */
export const MAX_DURATION = MAX_DURATION_DAY * 24 * 60 * 60 * 1000
export const MIN_DURATION = MIN_DURATION_DAY * 24 * 60 * 60 * 1000
const MAX_DURATION_TEXT = `${MAX_DURATION_DAY}D`
const MIN_DURATION_TEXT = `${MIN_DURATION_DAY}D`

export type RewardFormCardInputsParams = {
  reward: UIRewardInfo
  componentRef?: RefObject<any>
}

export type RewardCardInputsHandler = {
  isValid: boolean
}

export function RewardFormCardInputs({ reward: targetReward, componentRef }: RewardFormCardInputsParams) {
  const balances = useWallet((s) => s.balances)
  const rewards = useCreateFarms((s) => s.rewards)
  const rewardIndex = rewards.findIndex(({ id }) => id === targetReward.id)
  const reward = rewards[rewardIndex] as UIRewardInfo | undefined // usdate fresh data
  const [durationTime, setDurationTime] = useStateWithSuperPreferential(
    reward?.endTime && reward.startTime ? reward.endTime.getTime() - reward.startTime.getTime() : undefined
  )
  const durationDays = durationTime ? Math.round(parseDurationAbsolute(durationTime).days) : undefined

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

  const isDurationValid = Boolean(durationDays && MIN_DURATION_DAY <= durationDays && durationDays <= MAX_DURATION_DAY)
  const haveBalance = Boolean(reward && gte(balances[toPubString(reward.token?.mint)], reward.amount))
  const isAmountValid = haveBalance
  useImperativeHandle<any, RewardCardInputsHandler>(componentRef, () => ({
    isValid: isDurationValid && isAmountValid
  }))

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
        value={toString(reward.amount, { decimalLength: `auto ${reward.token?.decimals ?? 6}` })}
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
            placeholder={`${MIN_DURATION_DAY} - ${MAX_DURATION_DAY}`}
            value={getDayFromDuration(durationTime)}
            disabled={disableDurationInput}
            onBlur={(v, { setSelf }) => {
              // const duration = getDurationFromString(v)
              // if (duration.totalDuration > MAX_DURATION) {
              //   setSelf(MAX_DURATION_TEXT)
              //   setDurationTime(MAX_DURATION)
              // } else if (duration.totalDuration < MIN_DURATION) {
              //   setSelf(MIN_DURATION_TEXT)
              //   setDurationTime(MIN_DURATION)
              // }
              setIsInputDuration(false)
            }}
            suffix={<div className="font-medium text-sm text-[#abc4ff80]">Days</div>}
            onUserInput={(v) => {
              if (!v) return
              setIsInputDuration(true)
              const { totalDuration } = getDurationFromString(v)
              setDurationTime(isMeaningfulNumber(totalDuration) ? totalDuration : undefined)
              if (totalDuration > 0) {
                useCreateFarms.setState({
                  rewards: produce(rewards, (draft) => {
                    if (!draft[rewardIndex]) return

                    const haveStartTime = Boolean(reward.startTime)
                    const haveEndTime = Boolean(reward.endTime)

                    // set end time
                    if (haveStartTime) {
                      draft[rewardIndex].endTime = offsetDateTime(draft[rewardIndex].startTime, {
                        milliseconds: totalDuration
                      })
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
            value={reward.startTime}
            disabled={disableStartTimeInput}
            disableDateBeforeCurrent
            onDateChange={(selectedDate) => {
              if (!selectedDate) return
              return useCreateFarms.setState({
                rewards: produce(rewards, (draft) => {
                  if (!draft[rewardIndex]) return

                  // set end time
                  if (durationTime) {
                    const value = offsetDateTime(selectedDate, { milliseconds: durationTime })
                    draft[rewardIndex].endTime = value
                  }

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
            value={reward.endTime}
            disabled={disableEndTimeInput}
            showTime={false}
            disableDateBeforeCurrent
            isValidDate={(date) => {
              const isStartTimeBeforeCurrent = reward.startTime && isDateBefore(reward.startTime, currentBlockChainDate)
              if (reward.isRewardEnded && isStartTimeBeforeCurrent) {
                const duration = Math.round(
                  parseDurationAbsolute(date.getTime() - currentBlockChainDate.getTime()).days
                )
                return MIN_DURATION_DAY <= duration
              } else {
                const duration = Math.round(
                  parseDurationAbsolute(date.getTime() - (reward.startTime ?? currentBlockChainDate).getTime()).days
                )
                return MIN_DURATION_DAY <= duration && duration <= MAX_DURATION_DAY
              }
            }}
            onDateChange={(selectedDate) => {
              if (!selectedDate) return
              return useCreateFarms.setState({
                rewards: produce(rewards, (draft) => {
                  if (!draft[rewardIndex]) return

                  const haveStartTime = Boolean(draft[rewardIndex].startTime)

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
                      parseDurationAbsolute(selectedDate.getTime() - draft[rewardIndex].startTime!.getTime()).days
                    )
                  }

                  // set duration days
                  if (haveStartTime) {
                    const durationDays = parseDurationAbsolute(
                      selectedDate.getTime() - draft[rewardIndex].startTime!.getTime()
                    ).days
                    if (durationDays < MIN_DURATION_DAY) {
                      draft[rewardIndex].startTime = offsetDateTime(selectedDate, {
                        days: -MIN_DURATION_DAY
                      })
                      setDurationTime(MIN_DURATION)
                    } else if (durationDays > MAX_DURATION_DAY) {
                      draft[rewardIndex].startTime = offsetDateTime(selectedDate, {
                        days: -MAX_DURATION_DAY
                      })
                      setDurationTime(MAX_DURATION)
                    } else {
                      setDurationTime(durationDays)
                    }
                  }
                })
              })
            }}
          />
        </Row>
        <FadeInStable show={!isInputDuration && durationDays != null}>
          {durationDays! > MAX_DURATION_DAY ? (
            <div className="text-[#DA2EEF] text-sm font-medium pt-2 pl-2">
              Period is longer than max duration of {MAX_DURATION_DAY} days
            </div>
          ) : durationDays! < MIN_DURATION_DAY ? (
            <div className="text-[#DA2EEF] text-sm font-medium pt-2 pl-2">
              Period is shorter than min duration of {MIN_DURATION_DAY} days
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
        value={toString(estimatedValue, { decimalLength: `auto ${reward.token?.decimals ?? 6}` })}
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
function getDurationFromString(v: string) {
  const [, day, hour] = v.match(/(?:(\d+)D?) ?(?:(\d+)H?)?/i) ?? [] // noneed days and hours, but no need to change through
  const dayNumber = isFinite(Number(day)) ? Number(day) : undefined
  const hourNumber = isFinite(Number(hour)) ? Number(hour) : undefined
  const totalDuration = (dayNumber ?? 0) * 24 * 60 * 60 * 1000 + (hourNumber ?? 0) * 60 * 60 * 1000
  return { day: dayNumber, hour: hourNumber, totalDuration }
}
function getDayFromDuration(duration: number | undefined) {
  return duration ? Math.round(parseDurationAbsolute(duration).days) : duration
}
