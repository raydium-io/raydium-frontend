import useCreateFarms from '@/application/createFarm/useCreateFarm'
import CoinInputBoxWithTokenSelector from '@/components/CoinInputBoxWithTokenSelector'
import DateInput from '@/components/DateInput'
import Grid from '@/components/Grid'
import InputBox from '@/components/InputBox'
import Row from '@/components/Row'
import { offsetDateTime } from '@/functions/date/dateFormat'
import { isDateAfter, isDateBefore } from '@/functions/date/judges'
import { parseDurationAbsolute } from '@/functions/date/parseDuration'
import formatNumber from '@/functions/format/formatNumber'
import { isExist } from '@/functions/judgers/nil'
import { div, mul } from '@/functions/numberish/operations'
import { trimTailingZero } from '@/functions/numberish/stringNumber'
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

export function RewardFormCardInputs({ rewardIndex }: { rewardIndex: number }) {
  const rewards = useCreateFarms((s) => s.rewards)
  const reward = rewards[rewardIndex]
  if (!reward) return null

  const [durationDays, setDurationDays] = useStateWithSuperPreferential(
    reward.endTime && reward.startTime
      ? parseDurationAbsolute(reward.endTime.getTime() - reward.startTime.getTime()).days
      : undefined
  )

  const [estimatedValue, setEstimatedValue] = useStateWithSuperPreferential(
    reward.amount && durationDays ? div(reward.amount, durationDays) : undefined
  )

  return (
    <Grid className="gap-4">
      <CoinInputBoxWithTokenSelector
        className="rounded-md"
        haveHalfButton
        topLeftLabel="Assert"
        value={toString(reward.amount)}
        token={reward.token}
        onSelectCoin={(token) => {
          useCreateFarms.setState({
            rewards: produce(rewards, (draft) => {
              draft[rewardIndex].token = token
            })
          })
        }}
        onUserInput={(amount) => {
          useCreateFarms.setState({
            rewards: produce(rewards, (draft) => {
              draft[rewardIndex].amount = amount
            })
          })
        }}
      />

      <Row className="gap-4">
        <InputBox
          decimalMode
          className="rounded-md px-4"
          label="Day and Hours"
          inputClassName="w-12"
          value={durationDays && trimTailingZero(formatNumber(durationDays, { fractionLength: 1 }))}
          // TODO: maxValue (for end time is setted and start can't before now)
          onUserInput={(v) => {
            const durationDays = Number(v)
            setDurationDays(durationDays)

            if (v) {
              useCreateFarms.setState({
                rewards: produce(rewards, (draft) => {
                  if (!draft[rewardIndex]) return

                  const haveStartTime = Boolean(reward.startTime)
                  const haveEndTime = Boolean(reward.endTime)

                  // set end time
                  if (haveStartTime) {
                    draft[rewardIndex].endTime = offsetDateTime(draft[rewardIndex].startTime, {
                      days: durationDays
                    })
                  }

                  // set start time
                  if (haveEndTime && !haveStartTime) {
                    const calculatedStartTime = offsetDateTime(draft[rewardIndex].endTime, { days: -durationDays })
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
            inputClassName: 'text-[#abc4ff] text-xs font-medium'
          }}
          value={reward.startTime}
          disableDateBeforeCurrent
          isDisableDate={reward.endTime ? (date) => isDateAfter(date, reward.endTime!) : undefined}
          onDateChange={(selectedDate) => {
            if (!selectedDate) return
            return useCreateFarms.setState({
              rewards: produce(rewards, (draft) => {
                if (!draft[rewardIndex]) return

                const haveEndTime = Boolean(reward.endTime)

                // set start time
                draft[rewardIndex].startTime = selectedDate

                // set end time
                if (durationDays && !haveEndTime) {
                  draft[rewardIndex].endTime = offsetDateTime(selectedDate, { days: durationDays })
                }

                // set duration days
                if (haveEndTime) {
                  const durationDays = parseDurationAbsolute(
                    draft[rewardIndex].endTime!.getTime() - selectedDate.getTime()
                  ).days
                  setDurationDays(durationDays)
                }
              })
            })
          }}
        />

        <DateInput
          className="grow rounded-md px-4"
          label="Farming Ends"
          inputProps={{
            inputClassName: 'text-[#abc4ff] text-xs font-medium'
          }}
          value={reward.endTime}
          disableDateBeforeCurrent
          isDisableDate={reward.startTime ? (date) => isDateBefore(date, reward.startTime!) : undefined}
          onDateChange={(selectedDate) => {
            if (!selectedDate) return
            return useCreateFarms.setState({
              rewards: produce(rewards, (draft) => {
                if (!draft[rewardIndex]) return

                const haveEndTime = Boolean(reward.endTime)
                const haveStartTime = Boolean(reward.startTime)

                // set end time
                draft[rewardIndex].endTime = selectedDate

                // set start time
                if (durationDays && !haveStartTime) {
                  draft[rewardIndex].startTime = offsetDateTime(selectedDate, { days: -durationDays })
                }

                // set duration days
                if (haveEndTime) {
                  const durationDays = parseDurationAbsolute(
                    selectedDate.getTime() - draft[rewardIndex].startTime!.getTime()
                  ).days
                  setDurationDays(durationDays)
                }
              })
            })
          }}
        />
      </Row>

      <InputBox
        decimalMode
        valueFloating
        className="rounded-md px-4"
        label="Estimated rewards / day"
        value={estimatedValue}
        onUserInput={(v) => {
          if (!durationDays) return
          useCreateFarms.setState({
            rewards: produce(rewards, (draft) => {
              draft[rewardIndex].amount = mul(durationDays, v)
            })
          })
        }}
        suffix={reward.token && durationDays && durationDays > 0 ? <div>{reward.token.symbol} / day</div> : undefined}
      />
    </Grid>
  )
}
