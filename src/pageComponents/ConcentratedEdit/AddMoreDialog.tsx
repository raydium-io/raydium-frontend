import { useEffect, useRef, useState } from 'react'

import { Fraction } from '@raydium-io/raydium-sdk'

import useAppSettings from '@/application/common/useAppSettings'
import { HydratedConcentratedInfo } from '@/application/concentrated/type'
import useWallet from '@/application/wallet/useWallet'
import Button from '@/components/Button'
import Card from '@/components/Card'
import CoinInputBox from '@/components/CoinInputBox'
import Col from '@/components/Col'
import DateInput from '@/components/DateInput'
import InputBox from '@/components/InputBox'
import ResponsiveDialogDrawer from '@/components/ResponsiveDialogDrawer'
import Row from '@/components/Row'
import { getDate, offsetDateTime } from '@/functions/date/dateFormat'
import { isDateAfter, isDateBefore } from '@/functions/date/judges'
import { gte, isMeaningfulNumber, lte } from '@/functions/numberish/compare'
import { trimTailingZero } from '@/functions/numberish/handleZero'
import { div, mul, sub } from '@/functions/numberish/operations'
import toFraction from '@/functions/numberish/toFraction'
import { Unpacked } from '@/types/generics'

import { DAY_SECONDS, getDurationFromString, MAX_DURATION, MIN_DURATION } from './utils'
import { SplToken } from '@/application/token/type'

export interface UpdateData {
  openTime: number
  endTime: number
  perSecond: Fraction
  amount?: string
  daysExtend?: string
}

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: (props: { rewardMint: string; data: UpdateData }) => void
  chainTimeOffset?: number
  disableEndTimeInput?: boolean
  reward?: Unpacked<HydratedConcentratedInfo['rewardInfos']> & { isRewardEnded: boolean }
}

interface State {
  amount: string
  duration?: string
  openTime?: Date
  endTime?: Date
  perWeek: string
}

export default function AddMoreDialog({
  open,
  reward,
  disableEndTimeInput = true,
  chainTimeOffset,
  onClose,
  onConfirm
}: Props) {
  const [getBalance, walletConnected] = useWallet((s) => [s.getBalance, s.connected])
  const [values, setValues] = useState<State>({
    amount: '',
    perWeek: ''
  })
  const decimals = reward?.rewardToken?.decimals ?? 6
  const currentBlockChainDate = new Date(Date.now() + (chainTimeOffset || 0))
  const { isRewardEnded } = reward || {}

  const haveBalance = Boolean(reward?.rewardToken && gte(getBalance(reward.rewardToken), values.amount))
  // const estimatedValueDay = isRewardEnded
  //   ? isMeaningfulNumber(values.amount) && isMeaningfulNumber(values.duration)
  //     ? div(values.amount, values.duration).toSignificant(decimals)
  //     : ''
  //   : trimTailingZero(mul(div(reward?.perSecond, 10 ** decimals), DAY_SECONDS)?.toFixed(decimals) || '')

  useEffect(() => {
    if (reward) {
      setValues({
        amount: '',
        openTime: reward.isRewardEnded ? undefined : getDate(reward.endTime),
        perWeek: trimTailingZero(mul(div(reward?.perSecond, 10 ** decimals), DAY_SECONDS * 7)?.toFixed(decimals))
      })
    }
  }, [reward, decimals])

  useEffect(() => {
    setValues(({ duration, perWeek, ...preValues }) => {
      if (isRewardEnded) {
        const perWeek =
          isMeaningfulNumber(preValues.amount) && isMeaningfulNumber(duration)
            ? trimTailingZero(mul(div(preValues.amount, duration), 7).toFixed(decimals))
            : ''
        return {
          ...preValues,
          duration,
          perWeek,
          endTime:
            isMeaningfulNumber(preValues.openTime?.valueOf()) && isMeaningfulNumber(values.duration)
              ? offsetDateTime(preValues.openTime, {
                  milliseconds: Number(values.duration) * DAY_SECONDS * 1000
                })
              : preValues.endTime
        }
      }
      return {
        ...preValues,
        duration,
        perWeek,
        amount: perWeek && duration ? trimTailingZero(mul(div(perWeek, 7), Number(duration)).toFixed(decimals)) : '0',
        endTime:
          isMeaningfulNumber(reward?.endTime.valueOf()) && isMeaningfulNumber(values.duration)
            ? offsetDateTime(reward?.endTime, {
                milliseconds: Number(values.duration) * DAY_SECONDS * 1000
              })
            : preValues.endTime
      }
    })
  }, [values.duration, values.perWeek, isRewardEnded, decimals, reward?.endTime])

  return (
    <>
      <ResponsiveDialogDrawer placement="from-bottom" open={open} onClose={onClose}>
        {({ close: closeDialog }) => (
          <Card
            className="p-8 mobile:p-4 rounded-3xl mobile:rounded-lg w-[min(540px,90vw)] max-h-[80vh] overflow-auto mobile:w-full border-1.5 border-[rgba(171,196,255,0.2)] bg-cyberpunk-card-bg shadow-cyberpunk-card"
            size="lg"
          >
            <Row className="justify-between items-center mb-6 mobile:mb-2">
              <div className="mobile:text-base text-xl font-semibold text-white">Add more rewards</div>
            </Row>

            <Col>
              <CoinInputBox
                className="mb-4 py-2 border-none mobile:py-1 px-3 mobile:px-2 border-1.5 border-[#abc4ff40]"
                disabled={!isRewardEnded}
                value={values.amount}
                haveHalfButton
                haveCoinIcon
                topLeftLabel="Asset"
                onUserInput={(amount) =>
                  setValues((preValues) => ({
                    ...preValues,
                    amount,
                    perWeek:
                      isMeaningfulNumber(amount) && isMeaningfulNumber(preValues.duration)
                        ? trimTailingZero(mul(div(amount, preValues.duration), 7).toFixed(decimals))
                        : ''
                  }))
                }
                token={reward?.rewardToken}
              />
            </Col>

            <Row className="gap-4 mb-4">
              <DateInput
                className="flex-[3] mobile:w-full rounded-md px-4"
                label="Farming Starts"
                inputProps={{
                  placeholder: 'Select date and time',
                  inputClassName: 'text-sm font-medium text-white placeholder:text-[#abc4ff50]'
                }}
                showTime={{ format: 'Select time: HH:mm UTC' }}
                value={isRewardEnded ? values.openTime : getDate(reward?.endTime)}
                disabled={!isRewardEnded}
                disableDateBeforeCurrent
                isValidDate={(date) =>
                  isDateAfter(
                    date,
                    offsetDateTime(currentBlockChainDate, {
                      seconds: -DAY_SECONDS
                    })
                  ) && isDateBefore(date, offsetDateTime(values.openTime, { seconds: MAX_DURATION * DAY_SECONDS }))
                }
                onDateChange={(selectedDate) => {
                  if (!selectedDate) return
                  setValues((preValues) => ({
                    ...preValues,
                    openTime: selectedDate,
                    endTime: values.duration
                      ? offsetDateTime(selectedDate, { milliseconds: getDurationFromString(values.duration, 'days') })
                      : undefined
                  }))
                }}
              />
              <InputBox
                label="Duration"
                className="flex-[2]"
                inputHTMLProps={{
                  min: 1,
                  maxLength: 4,
                  step: 1
                }}
                pattern={/^[\d.]{0,5}$/}
                placeholder="7-90"
                suffix={<span className="text-[#abc4ff80] text-xs">days</span>}
                value={values.duration}
                onUserInput={(duration) => setValues((preValues) => ({ ...preValues, duration }))}
              />
            </Row>

            <Row className="gap-4 mb-4">
              <DateInput
                className="shrink-0 flex-[3] mobile:w-full rounded-md px-4"
                label="Farming Ends"
                inputProps={{
                  placeholder: disableEndTimeInput ? undefined : 'Select date and time',
                  inputClassName: 'text-sm font-medium text-white placeholder:text-[#abc4ff50]'
                }}
                value={values.endTime}
                disabled={isRewardEnded}
                disableDateBeforeCurrent
                showTime={false}
                isValidDate={(date) => {
                  const isValid =
                    isDateAfter(date, offsetDateTime(values.openTime, { seconds: MIN_DURATION * DAY_SECONDS })) &&
                    isDateAfter(date, currentBlockChainDate) &&
                    isDateBefore(date, offsetDateTime(values.openTime, { seconds: MAX_DURATION * DAY_SECONDS }))
                  return isValid
                }}
                onDateChange={(selectedDate) => {
                  if (!selectedDate || isRewardEnded) return
                  setValues((preValues) => ({
                    ...preValues,
                    duration: div(sub(selectedDate.valueOf(), preValues.openTime!.valueOf()), 1000 * 3600 * 24).toFixed(
                      0
                    ),
                    endTime: selectedDate
                  }))
                }}
              />
              <InputBox
                label="Estimated rewards / week"
                className="flex-[2]"
                onUserInput={(val) => {
                  setValues((preValues) => ({
                    ...preValues,
                    perWeek: val,
                    amount: isRewardEnded
                      ? isMeaningfulNumber(val) && isMeaningfulNumber(preValues.duration)
                        ? mul(div(val, 7), preValues.duration).toFixed(decimals)
                        : '0'
                      : preValues.amount
                  }))
                }}
                value={values.perWeek}
              />
            </Row>

            <Row className="justify-between items-center mb-6 mobile:mb-2">
              <Button
                className="frosted-glass-teal min-w-[120px]"
                validators={[
                  {
                    should: walletConnected,
                    forceActive: true,
                    fallbackProps: {
                      onClick: () => useAppSettings.setState({ isWalletSelectorShown: true }),
                      children: 'Connect wallet'
                    }
                  },
                  {
                    should: isMeaningfulNumber(values.amount),
                    fallbackProps: {
                      children: `Enter ${reward?.rewardToken?.symbol} token amount`
                    }
                  },
                  {
                    should: gte(values.duration, MIN_DURATION) && lte(values.duration, MAX_DURATION),
                    fallbackProps: {
                      children: 'Insufficient duration'
                    }
                  },
                  {
                    should: values.openTime && values.endTime,
                    fallbackProps: {
                      children: 'Confirm emission time setup'
                    }
                  },
                  {
                    should: haveBalance,
                    fallbackProps: {
                      children: `Insufficient ${reward?.rewardToken?.symbol} balance`
                    }
                  },
                  {
                    should: values.openTime && isDateBefore(currentBlockChainDate, values.openTime),
                    fallbackProps: {
                      children: 'Insufficient start time'
                    }
                  }
                ]}
                onClick={() => {
                  onConfirm({
                    rewardMint: reward?.rewardToken?.mint.toBase58() || '',
                    data: {
                      openTime: values.openTime!.valueOf(),
                      endTime: values.endTime!.valueOf(),
                      perSecond: toFraction(div(mul(div(values.perWeek, 7), 10 ** decimals), DAY_SECONDS))
                    }
                  })
                  closeDialog()
                }}
              >
                Save
              </Button>
              <Button
                type="text"
                className="text-sm text-[#ABC4FF] frosted-glass-skygray min-w-[120px]"
                onClick={closeDialog}
              >
                Cancel
              </Button>
            </Row>
          </Card>
        )}
      </ResponsiveDialogDrawer>
    </>
  )
}
