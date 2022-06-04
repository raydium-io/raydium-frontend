import { UIRewardInfo } from '@/application/createFarm/type'
import useCreateFarms from '@/application/createFarm/useCreateFarm'
import CoinInputBoxWithTokenSelector from '@/components/CoinInputBoxWithTokenSelector'
import DateInput from '@/components/DateInput'
import Grid from '@/components/Grid'
import InputBox from '@/components/InputBox'
import Row from '@/components/Row'
import { shakeUndifindedItem } from '@/functions/arrayMethods'
import { offsetDateTime } from '@/functions/date/dateFormat'
import { isDateAfter } from '@/functions/date/judges'
import parseDuration, { parseDurationAbsolute } from '@/functions/date/parseDuration'
import { isExist } from '@/functions/judgers/nil'
import { isMeaningfulNumber } from '@/functions/numberish/compare'
import { div, mul } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'
import { shrinkToValue } from '@/functions/shrinkToValue'
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
  const doNothing = () => {}
  return [isExist(superValue) ? superValue : value, (isExist(superValue) ? doNothing : setValue) as any]
}

const MAX_DURATION = 90 * 24 * 60 * 60 * 1000
const MIN_DURATION = 7 * 24 * 60 * 60 * 1000
const MAX_DURATION_TEXT = '90D'
const MIN_DURATION_TEXT = '7D'

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

  if (!reward) return null
  return (
    <Grid className="gap-4">
      <CoinInputBoxWithTokenSelector
        className={`rounded-md`}
        haveHalfButton
        topLeftLabel="Assert"
        disableTokenMints={shakeUndifindedItem(rewards.map((r) => r.token?.mint))}
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
          label="Day and Hours"
          value={getStringFromDuration(durationTime)}
          // TODO: maxValue (for end time is setted and start can't before now)
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
          label="Farming Start"
          inputProps={{
            inputClassName: 'text-sm font-medium text-white'
          }}
          value={reward.startTime}
          disabled={disableStartTimeInput}
          disableDateBeforeCurrent
          isValidDate={(date) => {
            if (!reward.endTime) return true
            const duration = reward.endTime.getTime() - date.getTime()
            return MIN_DURATION < duration && duration < MAX_DURATION
          }}
          onDateChange={(selectedDate) => {
            if (!selectedDate) return
            return useCreateFarms.setState({
              rewards: produce(rewards, (draft) => {
                if (!draft[rewardIndex]) return

                const haveEndTime = Boolean(reward.endTime)

                // set start time
                draft[rewardIndex].startTime = selectedDate

                // set end time
                if (durationTime && !haveEndTime) {
                  draft[rewardIndex].endTime = offsetDateTime(selectedDate, { milliseconds: durationTime })
                }

                // set duration days
                if (haveEndTime) {
                  const durationDays = parseDurationAbsolute(
                    draft[rewardIndex].endTime!.getTime() - selectedDate.getTime()
                  ).days
                  setDurationTime(durationDays)
                }
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
            if (!reward.startTime) return true
            const duration = date.getTime() - reward.startTime.getTime()
            return MIN_DURATION < duration && duration < MAX_DURATION
          }}
          onDateChange={(selectedDate) => {
            if (!selectedDate) return
            return useCreateFarms.setState({
              rewards: produce(rewards, (draft) => {
                if (!draft[rewardIndex]) return

                const haveStartTime = Boolean(reward.startTime)

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
                  setDurationTime(durationDays)
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
              if (rewardIndex > 0) draft[rewardIndex].amount = mul(parseDurationAbsolute(durationTime).days, v)
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
