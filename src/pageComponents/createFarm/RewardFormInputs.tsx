import useConnection from '@/application/connection/useConnection'
import { getRewardSignature, hasRewardBeenEdited } from '@/application/createFarm/parseRewardInfo'
import { UIRewardInfo } from '@/application/createFarm/type'
import useCreateFarms from '@/application/createFarm/useCreateFarm'
import {
  MIN_DURATION_SECOND,
  MAX_DURATION_SECOND,
  MAX_OFFSET_AFTER_NOW_SECOND
} from '@/application/farms/handleFarmInfo'
import { SplToken } from '@/application/token/type'
import useWallet from '@/application/wallet/useWallet'
import CoinInputBoxWithTokenSelector from '@/components/CoinInputBoxWithTokenSelector'
import DateInput from '@/components/DateInput'
import FadeInStable from '@/components/FadeIn'
import Grid from '@/components/Grid'
import InputBox from '@/components/InputBox'
import Row from '@/components/Row'
import { shakeUndifindedItem } from '@/functions/arrayMethods'
import { getTime, offsetDateTime } from '@/functions/date/dateFormat'
import { isDateAfter, isDateBefore } from '@/functions/date/judges'
import { parseDurationAbsolute } from '@/functions/date/parseDuration'
import toPubString from '@/functions/format/toMintString'
import { isExist } from '@/functions/judgers/nil'
import { gte, isMeaningfulNumber } from '@/functions/numberish/compare'
import { div, mul } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'
import { shrinkToValue } from '@/functions/shrinkToValue'
import { useRecordedEffect } from '@/hooks/useRecordedEffect'
import { MayFunction, Numberish } from '@/types/constants'
import { TokenAccount, TokenAmount } from '@raydium-io/raydium-sdk'
import produce from 'immer'
import { RefObject, startTransition, useEffect, useImperativeHandle, useRef, useState } from 'react'

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

const HOUR_SECONDS = 60 * 60
const DAY_SECONDS = 24 * 60 * 60

export type RewardFormCardInputsParams = {
  reward: UIRewardInfo
  componentRef?: RefObject<any>
  syncDataWithZustandStore?: boolean
  maxDurationSeconds?: number /* only edit mode  seconds */
  minDurationSeconds?: number /* only edit mode  seconds */

  onRewardChange?: (reward: UIRewardInfo) => void
}

export type RewardCardInputsHandler = {
  tempReward: UIRewardInfo
  isValid: boolean
}

export function RewardFormCardInputs({
  reward: targetReward,
  syncDataWithZustandStore,
  minDurationSeconds = MIN_DURATION_SECOND,
  maxDurationSeconds = MAX_DURATION_SECOND,
  componentRef,

  onRewardChange
}: RewardFormCardInputsParams) {
  const balances = useWallet((s) => s.balances)
  const rewards = useCreateFarms((s) => s.rewards)
  const rewardIndex = rewards.findIndex(({ id }) => id === targetReward.id)
  const reward = rewards[rewardIndex] as UIRewardInfo | undefined // usdate fresh data

  //#region ------------------- reward center -------------------
  // to cache the result, have to store a temp
  const isUnedited72hReward = Boolean(reward && reward.isRwardingBeforeEnd72h && !hasRewardBeenEdited(reward))
  const isUneditedEndedReward = reward?.isRewardEnded && !hasRewardBeenEdited(targetReward)
  const [tempReward, setTempReward] = useState(() =>
    isUneditedEndedReward
      ? { ...targetReward, amount: undefined, startTime: undefined, endTime: undefined }
      : isUnedited72hReward
      ? { ...targetReward, amount: undefined, startTime: targetReward.originData?.endTime, endTime: undefined }
      : targetReward
  )

  const selectRewardToken = (token: SplToken | undefined) => {
    setTempReward(
      produce(tempReward, (draft) => {
        draft.token = token
      })
    )
    if (syncDataWithZustandStore) {
      useCreateFarms.setState({
        rewards: produce(rewards, (draft) => {
          if (rewardIndex >= 0) draft[rewardIndex].token = token
        })
      })
    }
  }
  const setRewardAmount = (amount: Numberish | undefined) => {
    setTempReward((s) =>
      produce(s, (draft) => {
        draft.amount = amount
      })
    )
    if (syncDataWithZustandStore) {
      useCreateFarms.setState({
        rewards: produce(rewards, (draft) => {
          if (rewardIndex >= 0) draft[rewardIndex].amount = amount
        })
      })
    }
  }
  const setRewardTime = (date: { start?: Date; end?: Date }) => {
    setTempReward((s) =>
      produce(s, (draft) => {
        if (date.end) draft.endTime = date.end
        if (date.start) draft.startTime = date.start
      })
    )
    if (syncDataWithZustandStore) {
      setTimeout(() => {
        useCreateFarms.setState({
          rewards: produce(rewards, (draft) => {
            // immer can't be composed atom
            if (date.start) draft[rewardIndex].startTime = date.start
            if (date.end) draft[rewardIndex].endTime = date.end
          })
        })
      })
    }
  }

  useEffect(() => {
    if (!targetReward.amount && !targetReward.startTime && !targetReward.endTime) {
      setTempReward(targetReward)
    }
  }, [targetReward])

  //#endregion

  const [durationTime, setDurationTime] = useStateWithSuperPreferential(
    tempReward.endTime && tempReward.startTime ? getTime(tempReward.endTime) - getTime(tempReward.startTime) : undefined
  )

  // NOTE: only 'days' or 'hours'
  const durationBoundaryUnit = parseDurationAbsolute(maxDurationSeconds * 1000).days > 1 ? 'days' : 'hours'
  const minDurationValue = minDurationSeconds / (durationBoundaryUnit === 'hours' ? HOUR_SECONDS : DAY_SECONDS)
  const maxDurationValue = maxDurationSeconds / (durationBoundaryUnit === 'hours' ? HOUR_SECONDS : DAY_SECONDS)
  const estimatedValue =
    isUnedited72hReward && tempReward.originData
      ? mul(tempReward.originData.perSecond, 24 * 60 * 60)
      : tempReward.amount && durationTime
      ? div(tempReward.amount, parseDurationAbsolute(durationTime).days)
      : undefined
  const disableCoinInput = reward?.isRwardingBeforeEnd72h
  const disableDurationInput = false
  const disableStartTimeInput = reward?.isRwardingBeforeEnd72h
  const disableEndTimeInput = !reward?.isRwardingBeforeEnd72h
  const disableEstimatedInput = reward?.isRwardingBeforeEnd72h

  const chainTimeOffset = useConnection((s) => s.chainTimeOffset) ?? 0
  const currentBlockChainDate = new Date(Date.now() + chainTimeOffset)

  const [isInputDuration, setIsInputDuration] = useState(false)

  const isStartTimeAfterCurrent = Boolean(
    tempReward && tempReward.startTime && isDateAfter(tempReward.startTime, currentBlockChainDate)
  )
  const isDurationValid = Boolean(
    durationTime != null && minDurationSeconds * 1e3 <= durationTime && durationTime <= maxDurationSeconds * 1e3
  )
  const haveBalance = Boolean(tempReward && gte(balances[toPubString(tempReward.token?.mint)], tempReward.amount))
  const isAmountValid = haveBalance

  const rewardTokenAmount =
    tempReward && toString(tempReward.amount, { decimalLength: `auto ${tempReward.token?.decimals ?? 6}` })
  const rewardDuration = getDurationValueFromMilliseconds(durationTime, durationBoundaryUnit)
  const rewardStartTime = tempReward.startTime
  const rewardEndTime = tempReward.endTime
  const rewardEstimatedValue =
    estimatedValue && toString(estimatedValue, { decimalLength: `auto ${tempReward?.token?.decimals ?? 6}` })
  const isValid = isDurationValid && isAmountValid && (tempReward?.isRwardingBeforeEnd72h || isStartTimeAfterCurrent)
  useImperativeHandle<any, RewardCardInputsHandler>(componentRef, () => ({ isValid, tempReward }))

  //#region ------------------- data change callback -------------------

  useEffect(() => {
    onRewardChange?.(tempReward)
  }, [tempReward])

  //#endregion
  if (!reward) return null
  return (
    <Grid className="gap-4">
      <CoinInputBoxWithTokenSelector
        className={`rounded-md`}
        haveHalfButton
        topLeftLabel="Reward Token"
        disableTokens={shakeUndifindedItem(rewards.map((r) => r.token))}
        canSelectQuantumSOL={Boolean(tempReward.token)}
        disabled={disableCoinInput}
        value={rewardTokenAmount}
        token={tempReward.token}
        disabledTokenSelect={reward.isRewardBeforeStart || reward.isRewarding || reward.isRewardEnded}
        onSelectCoin={selectRewardToken}
        onUserInput={setRewardAmount}
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
                const haveStartTime = Boolean(rewardStartTime)
                const haveEndTime = Boolean(rewardEndTime)

                // set end time
                if (haveStartTime) {
                  setRewardTime({
                    start: rewardStartTime,
                    end: offsetDateTime(rewardStartTime, {
                      milliseconds: totalDuration
                    })
                  })
                }

                // set amount (only edit-in-rewarding)
                if (reward.isRwardingBeforeEnd72h) {
                  setRewardAmount(mul(estimatedValue, parseDurationAbsolute(totalDuration).days))
                }

                // set start time
                if (haveEndTime && !haveStartTime) {
                  const calculatedStartTime = offsetDateTime(tempReward.endTime, {
                    milliseconds: -totalDuration
                  })
                  if (isDateAfter(calculatedStartTime, Date.now())) {
                    setRewardTime({ start: calculatedStartTime })
                  }
                }
              }
            }}
          />
          <DateInput
            className="grow rounded-md px-4"
            label="Farming Starts"
            inputProps={{
              inputClassName: 'text-sm font-medium text-white'
            }}
            showTime={{ format: 'Select time: HH:mm UTC' }}
            value={rewardStartTime}
            disabled={disableStartTimeInput}
            disableDateBeforeCurrent
            isValidDate={(date) => {
              const isValid = isDateBefore(
                date,
                offsetDateTime(currentBlockChainDate, { seconds: MAX_OFFSET_AFTER_NOW_SECOND })
              )
              return isValid
            }}
            onDateChange={(selectedDate) => {
              if (!selectedDate) return

              // set end time
              // set start time
              setRewardTime({
                start: selectedDate,
                end: durationTime ? offsetDateTime(selectedDate, { milliseconds: durationTime }) : undefined
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

              const haveStartTime = Boolean(rewardStartTime)

              // set end time
              // set start time
              setRewardTime({
                end: selectedDate,
                start:
                  durationTime && !haveStartTime
                    ? offsetDateTime(selectedDate, { milliseconds: -durationTime })
                    : undefined
              })

              // set amount (only edit-in-rewarding)
              if (reward.isRwardingBeforeEnd72h) {
                setRewardAmount(
                  mul(estimatedValue, parseDurationAbsolute(selectedDate.getTime() - rewardStartTime!.getTime()).days)
                )
              }

              // set duration days
              if (haveStartTime) {
                const durationSeconds = parseDurationAbsolute(
                  selectedDate.getTime() - rewardStartTime!.getTime()
                ).seconds
                if (durationSeconds < minDurationSeconds) {
                  setRewardTime({
                    start: offsetDateTime(selectedDate, {
                      seconds: -minDurationSeconds
                    })
                  })
                  setDurationTime(minDurationSeconds)
                } else if (durationSeconds > maxDurationSeconds) {
                  setRewardTime({
                    end: offsetDateTime(selectedDate, {
                      seconds: -maxDurationSeconds
                    })
                  })
                  setDurationTime(maxDurationSeconds)
                } else {
                  setDurationTime(durationSeconds)
                }
              }
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
          setRewardAmount(mul(parseDurationAbsolute(durationTime).days, v))
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
