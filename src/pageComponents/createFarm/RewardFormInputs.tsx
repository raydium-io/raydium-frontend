import useConnection from '@/application/connection/useConnection'
import { UIRewardInfo } from '@/application/createFarm/type'
import useCreateFarms from '@/application/createFarm/useCreateFarm'
import CoinInputBoxWithTokenSelector from '@/components/CoinInputBoxWithTokenSelector'
import DateInput from '@/components/DateInput'
import Grid from '@/components/Grid'
import InputBox from '@/components/InputBox'
import Row from '@/components/Row'
import { shakeUndifindedItem } from '@/functions/arrayMethods'
import { offsetDateTime } from '@/functions/date/dateFormat'
import { isDateAfter, isDateBefore } from '@/functions/date/judges'
import parseDuration, { parseDurationAbsolute } from '@/functions/date/parseDuration'
import { isExist } from '@/functions/judgers/nil'
import { isMeaningfulNumber } from '@/functions/numberish/compare'
import { div, mul } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'
import { shrinkToValue } from '@/functions/shrinkToValue'
import { useRecordedEffect } from '@/hooks/useRecordedEffect'
import { MayFunction } from '@/types/constants'
import produce from 'immer'
import { useState } from 'react'

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
const MIN_DURATION_DAY = 0 /* FIXME: for Test */
const MAX_DURATION = MAX_DURATION_DAY * 24 * 60 * 60 * 1000
const MIN_DURATION = MIN_DURATION_DAY * 24 * 60 * 60 * 1000
const MAX_DURATION_TEXT = `${MAX_DURATION_DAY}D`
const MIN_DURATION_TEXT = `${MIN_DURATION_DAY}D`

export type RewardFormCardInputsParams = {
  reward: UIRewardInfo
}

export function RewardFormCardInputs({ reward: targetReward }: RewardFormCardInputsParams) {
  const rewards = useCreateFarms((s) => s.rewards)
  const rewardIndex = rewards.findIndex(({ id }) => id === targetReward.id)
  const reward = rewards[rewardIndex] as UIRewardInfo | undefined // usdate fresh data

  const [durationTime, setDurationTime] = useStateWithSuperPreferential(
    reward?.endTime && reward.startTime ? reward.endTime.getTime() - reward.startTime.getTime() : undefined
  )

  const estimatedValue =
    reward?.amount && durationTime ? div(reward.amount, parseDurationAbsolute(durationTime).days) : undefined

  const disableCoinInput = reward?.isRwardingBeforeEnd72h
  const disableDurationInput = false
  const disableStartTimeInput = reward?.isRwardingBeforeEnd72h
  const disableEndTimeInput = false
  const disableEstimatedInput = reward?.isRwardingBeforeEnd72h

  const chainTimeOffset = useConnection((s) => s.chainTimeOffset) ?? 0
  const currentBlockChainDate = new Date(Date.now() + chainTimeOffset)
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
        value={toString(reward.amount)}
        token={reward.token}
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

      <Row className="gap-4">
        <InputBox
          className="grow-2 rounded-md text-sm font-medium text-white px-4"
          label="Total Duration"
          value={getStringFromDuration(durationTime)}
          pattern={[
            /^(?:(\d+)D?)? ?(?:(\d+)H?)?$/i,
            (s) => (s ? getDurationFromString(s).totalDuration <= MAX_DURATION : true)
          ]}
          disabled={disableDurationInput}
          onBlur={(v, { setSelf }) => {
            const duration = getDurationFromString(v)
            if (duration.totalDuration > MAX_DURATION) {
              setSelf(MAX_DURATION_TEXT)
              setDurationTime(MAX_DURATION)
            } else if (duration.totalDuration < MIN_DURATION) {
              setSelf(MIN_DURATION_TEXT)
              setDurationTime(MIN_DURATION)
            }
          }}
          onUserInput={(v) => {
            if (!v) return
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

                const prevStartTime = draft[rewardIndex].startTime?.getTime()
                const currentStartTime = selectedDate.getTime()

                // set end time
                if (durationTime) {
                  const diffStartTime = prevStartTime ? currentStartTime - prevStartTime : 0
                  draft[rewardIndex].endTime = offsetDateTime(selectedDate, {
                    milliseconds: durationTime + diffStartTime
                  })
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
          disableDateBeforeCurrent
          isValidDate={(date) => {
            const isStartTimeBeforeCurrent = reward.startTime && isDateBefore(reward.startTime, currentBlockChainDate)
            if (reward.isRewardEnded && isStartTimeBeforeCurrent) {
              const duration = Math.round(parseDurationAbsolute(date.getTime() - currentBlockChainDate.getTime()).days)
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

      <InputBox
        disabled={disableEstimatedInput}
        decimalMode
        decimalCount={reward.token?.decimals ?? 6}
        valueFloating
        className="rounded-md px-4 font-medium text-sm"
        inputClassName="text-white"
        label="Estimated rewards / day"
        value={estimatedValue}
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
  const [, day, hour] = v.match(/(?:(\d+)D?) ?(?:(\d+)H?)?/i) ?? []
  const dayNumber = isFinite(Number(day)) ? Number(day) : undefined
  const hourNumber = isFinite(Number(hour)) ? Number(hour) : undefined
  const totalDuration = (dayNumber ?? 0) * 24 * 60 * 60 * 1000 + (hourNumber ?? 0) * 60 * 60 * 1000
  return { day: dayNumber, hour: hourNumber, totalDuration }
}
function getStringFromDuration(duration: number | undefined) {
  if (!duration) return
  const { days, hours } = parseDuration(duration)
  if (hours > 0) {
    return `${days}D ${hours}H`
  } else {
    return `${days}D`
  }
}
