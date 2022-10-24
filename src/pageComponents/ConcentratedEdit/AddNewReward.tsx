import { useEffect, useMemo, useState } from 'react'
import { HydratedConcentratedInfo } from '@/application/concentrated/type'
import useAppSettings from '@/application/common/useAppSettings'
import useConnection from '@/application/connection/useConnection'
import CoinInputBoxWithTokenSelector from '@/components/CoinInputBoxWithTokenSelector'
import InputBox from '@/components/InputBox'
import DateInput from '@/components/DateInput'
import { FadeIn } from '@/components/FadeIn'
import Card from '@/components/Card'
import Grid from '@/components/Grid'
import Row from '@/components/Row'
import Icon from '@/components/Icon'
import { offsetDateTime, getDate } from '@/functions/date/dateFormat'
import { isDateAfter, isDateBefore } from '@/functions/date/judges'
import { shakeUndifindedItem } from '@/functions/arrayMethods'
import { isMeaningfulNumber, isMeaninglessNumber, gt, lt } from '@/functions/numberish/compare'
import { getDuration } from '@/functions/date/parseDuration'
import { trimTailingZero } from '@/functions/numberish/handleZero'
import { div, mul } from '@/functions/numberish/operations'
import { SplToken } from '@/application/token/type'
import { MIN_DURATION, MAX_DURATION, DAY_SECONDS } from './utils'
interface Props {
  pool: HydratedConcentratedInfo
  defaultData?: NewReward
  onValidateChange: (err?: string) => void
  onUpdateReward: (data: { newReward?: NewReward }) => void
  chainTimeOffset?: number
}

export interface NewReward {
  token?: SplToken
  amount?: string
  duration?: string
  openTime?: Date
  endTime?: Date
  perDay?: string
}

export default function AddNewReward(props: Props) {
  const { pool, defaultData, onValidateChange, onUpdateReward } = props
  const isMobile = useAppSettings((s) => s.isMobile)
  const chainTimeOffset = useConnection((s) => s.chainTimeOffset)
  const [showForm, setShowForm] = useState(!!defaultData)
  const [newReward, setNewReward] = useState<NewReward>(defaultData || {})

  const currentBlockChainDate = new Date(Date.now() + (chainTimeOffset || 0))

  const minBoundary =
    newReward.openTime && newReward.endTime && newReward.token
      ? div(
          getDuration(newReward.endTime.valueOf(), newReward.openTime.valueOf()) / 1000,
          10 ** newReward.token.decimals
        )
      : undefined

  const noTokenError = showForm && !newReward.token ? 'Confirm reward token' : undefined
  const noAmountError =
    showForm && isMeaninglessNumber(newReward.amount) ? `Enter ${newReward.token?.symbol} token amount` : undefined
  const needShowAmountAlert =
    showForm && newReward.amount && lt(newReward.amount, minBoundary)
      ? 'Emission rewards is lower than min required'
      : undefined

  const timeError = useMemo(() => {
    if (!showForm) return undefined
    if (!newReward.openTime || !newReward.duration) return 'Confirm emission time setup'
    if (gt(newReward.duration, MAX_DURATION)) return `Period is longer than max duration of ${MAX_DURATION} days`
    if (lt(newReward.duration, MIN_DURATION)) return `Period is shorter than min duration of ${MIN_DURATION} days`
    return undefined
  }, [newReward.duration, newReward.openTime, showForm])

  useEffect(() => {
    onValidateChange(noTokenError || noAmountError || needShowAmountAlert || timeError)
  }, [noTokenError, noAmountError, timeError, needShowAmountAlert, newReward.amount, onValidateChange])

  useEffect(() => {
    setNewReward((values) => {
      const decimals = values.token?.decimals || 6
      return {
        ...values,
        endTime:
          isMeaningfulNumber(values.openTime?.valueOf()) && isMeaningfulNumber(values.duration)
            ? offsetDateTime(values.openTime, {
                milliseconds: Number(values.duration) * DAY_SECONDS * 1000
              })
            : values.endTime,
        perDay:
          isMeaningfulNumber(values.amount) && isMeaningfulNumber(values.duration)
            ? trimTailingZero(div(values.amount, values.duration).toFixed(decimals))
            : '0'
      }
    })
  }, [newReward.duration, newReward.openTime, newReward.amount])

  useEffect(() => {
    onUpdateReward({ newReward: showForm ? newReward : undefined })
  }, [onUpdateReward, newReward, showForm])

  return (
    <>
      <Row
        className={`items-center mb-2 ${showForm ? 'opacity-50 cursor-default' : 'cursor-pointer'}`}
        onClick={showForm ? undefined : () => setShowForm(true)}
      >
        <Icon className="text-[#abc4ff]" heroIconName="plus-circle" size="sm" />
        <div className="ml-1.5 text-[#abc4ff] font-base mobile:text-sm">Add another reward token</div>
        <div className="ml-1.5 text-[#abc4ff80] font-base mobile:text-sm">({showForm ? '0' : '1'} more)</div>
      </Row>
      {showForm && (
        <FadeIn>
          <Card
            className={`p-4 mobile:p-3 bg-cyberpunk-card-bg border-1.5 border-[rgba(171,196,255,0.2)] ${
              isMobile ? 'rounded-2xl' : 'rounded-3xl'
            }`}
            size="lg"
          >
            <Grid className="gap-4">
              <Row className="gap-4 mobile:flex-col">
                <CoinInputBoxWithTokenSelector
                  className="rounded-md grow"
                  haveHalfButton
                  hasPlaceholder
                  topLeftLabel="Token"
                  disableTokens={shakeUndifindedItem(pool.rewardInfos.map((r) => r.rewardToken))}
                  value={newReward.amount || ''}
                  token={newReward.token}
                  onSelectToken={(token) => setNewReward((values) => ({ ...values, token }))}
                  onUserInput={(amount) => {
                    setNewReward((values) => ({ ...values, amount }))
                  }}
                />
                <InputBox
                  className="grow-2 rounded-md text-sm font-medium text-white px-4"
                  inputClassName="placeholder:text-[#abc4ff50]"
                  label="Duration"
                  type="number"
                  inputHTMLProps={{
                    min: 1,
                    maxLength: 3,
                    step: 1
                  }}
                  pattern={/^\d{0,5}$/}
                  placeholder={`${MIN_DURATION} - ${MAX_DURATION}`}
                  value={newReward.duration}
                  suffix={<div className="font-medium text-sm text-[#abc4ff80]">Days</div>}
                  onUserInput={(duration) => setNewReward((values) => ({ ...values, duration }))}
                />
              </Row>
              <>
                {newReward.amount && needShowAmountAlert && (
                  <div className="text-[#DA2EEF] text-right text-sm font-medium px-2">
                    Emission rewards is lower than min required
                  </div>
                )}
              </>
              <Row className="gap-3 mobile:flex-col">
                <DateInput
                  className="flex-[3] mobile:w-full rounded-md px-4"
                  label="Farming Starts"
                  inputProps={{
                    placeholder: 'Select date and time',
                    inputClassName: 'text-sm font-medium text-white placeholder:text-[#abc4ff50]'
                  }}
                  showTime={{ format: 'Select time: HH:mm UTC' }}
                  value={newReward.openTime ? getDate(newReward.openTime) : undefined}
                  disableDateBeforeCurrent
                  isValidDate={(date) => {
                    return (
                      isDateAfter(date, currentBlockChainDate) &&
                      isDateBefore(
                        date,
                        offsetDateTime(newReward.openTime || currentBlockChainDate, {
                          seconds: MAX_DURATION * DAY_SECONDS
                        })
                      )
                    )
                  }}
                  onDateChange={(selectedDate) => {
                    if (!selectedDate) return
                    setNewReward((values) => ({ ...values, openTime: getDate(selectedDate) }))
                  }}
                />
                <DateInput
                  className="flex-[3] mobile:w-full rounded-md px-4"
                  label="Farming Ends"
                  inputProps={{
                    placeholder: 'Select date and time',
                    inputClassName: 'text-sm font-medium text-white placeholder:text-[#abc4ff50]'
                  }}
                  showTime={{ format: 'Select time: HH:mm UTC' }}
                  value={newReward.endTime ? getDate(newReward.endTime) : undefined}
                  disabled
                  disableDateBeforeCurrent
                />
                <InputBox
                  label="Estimated rewards / day"
                  className="flex-[3]"
                  onUserInput={(perDay) =>
                    setNewReward((values) => ({
                      ...values,
                      perDay,
                      amount: isMeaningfulNumber(values.duration)
                        ? trimTailingZero(mul(perDay, values.duration).toFixed(values.token?.decimals || 6))
                        : '0'
                    }))
                  }
                  value={newReward.perDay}
                />
              </Row>
              <div>
                {newReward.duration && newReward.openTime && (
                  <div>
                    {gt(newReward.duration, MAX_DURATION) ? (
                      <div className="text-[#DA2EEF] text-sm font-medium  pl-2">
                        Period is longer than max duration of {MAX_DURATION} days
                      </div>
                    ) : lt(newReward.duration, MIN_DURATION) ? (
                      <div className="text-[#DA2EEF] text-sm font-medium pl-2">
                        Period is shorter than min duration of {MIN_DURATION} days
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </Grid>
          </Card>
        </FadeIn>
      )}
    </>
  )
}
