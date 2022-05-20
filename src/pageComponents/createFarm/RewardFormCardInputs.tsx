import useCreateFarms, { CreateFarmStore } from '@/application/createFarm/useCreateFarm'
import CoinInputBoxWithTokenSelector from '@/components/CoinInputBoxWithTokenSelector'
import DateInput from '@/components/DateInput'
import Grid from '@/components/Grid'
import InputBox from '@/components/InputBox'
import Row from '@/components/Row'
import { offsetDateTime } from '@/functions/date/dateFormat'
import { parseDurationAbsolute } from '@/functions/date/parseDuration'
import formatNumber from '@/functions/format/formatNumber'
import { div, mul } from '@/functions/numberish/operations'
import { trimTailingZero } from '@/functions/numberish/stringNumber'
import { toString } from '@/functions/numberish/toString'
import produce from 'immer'

export function RewardFormCardInputs({ rewardIndex }: { rewardIndex: number }) {
  const rewards = useCreateFarms((s) => s.rewards)
  const reward = rewards[rewardIndex]
  if (!reward) return null

  const durationDays = reward.endTime
    ? parseDurationAbsolute(reward.endTime.getTime() - (reward.startTime?.getTime() ?? Date.now())).days
    : undefined

  const estimatedValue = reward.amount && durationDays ? div(reward.amount, durationDays) : undefined
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
        <DateInput
          className="grow rounded-md"
          label="Farming Start"
          inputProps={{
            inputClassName: 'text-[#abc4ff] text-xs font-medium'
          }}
          value={reward.startTime}
          disableDateBeforeCurrent
          onDateChange={(selectedDate) =>
            useCreateFarms.setState({
              rewards: produce(rewards, (draft) => {
                draft[rewardIndex].startTime = selectedDate
              })
            })
          }
        />

        <DateInput
          className="grow rounded-md"
          label="Farming Ends"
          inputProps={{
            inputClassName: 'text-[#abc4ff] text-xs font-medium'
          }}
          value={reward.endTime}
          disableDateBeforeCurrent
          onDateChange={(selectedDate) =>
            useCreateFarms.setState({
              rewards: produce(rewards, (draft) => {
                draft[rewardIndex].endTime = selectedDate
              })
            })
          }
        />

        <InputBox
          decimalMode
          className="py-3 px-3 rounded-md"
          label="Days"
          inputClassName="w-12"
          value={durationDays && trimTailingZero(formatNumber(durationDays, { fractionLength: 1 }))}
          onUserInput={(v) => {
            if (v) {
              useCreateFarms.setState({
                rewards: produce(rewards, (draft) => {
                  draft[rewardIndex].endTime = offsetDateTime(reward.startTime ?? Date.now(), { days: Number(v) })
                })
              })
            }
          }}
        />
      </Row>

      <InputBox
        decimalMode
        valueFloating
        className="rounded-md"
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
