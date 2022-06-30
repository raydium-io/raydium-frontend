import React, { ComponentProps, RefObject, useEffect, useState } from 'react'

import _DatePicker from '@uiw/react-date-picker'

import Input, { InputProps } from '@/components/Input'
import { DateParam, offsetDateTime, setDateTime, setDateTimeSecondToZero, toUTC } from '@/functions/date/dateFormat'

import InputBox from './InputBox'
import Popover from './Popover'

import './DatePicker.css'
import { twMerge } from 'tailwind-merge'
import { isDateBefore, isDateEqual } from '@/functions/date/judges'
import useConnection from '@/application/connection/useConnection'
import { isObject } from '@/functions/judgers/dateType'

export type DateInputProps = {
  className?: string
  label?: string
  /** if not true, user can't input  */
  canUserInput?: boolean
  labelClassName?: string
  inputProps?: Omit<InputProps, 'defaultValue' | 'value'>
  disableDateBeforeCurrent?: boolean
  canEditSeconds?: boolean
  isValidDate?: (date: Date) => boolean
  onDateChange?(selectedDate: Date | undefined): void
  showTime?:
    | {
        format: string
      }
    | boolean
} & Omit<InputProps, 'value' | 'defaultValue'> & {
    value?: Date
    defaultValue?: Date
  }

export default function DateInput({
  value,
  defaultValue,

  className,
  label,
  canUserInput,
  labelClassName,
  inputProps,
  disableDateBeforeCurrent,
  canEditSeconds,

  isValidDate,
  onDateChange,
  showTime,
  ...otherProps
}: DateInputProps) {
  return (
    <InputBox
      {...otherProps}
      className={className}
      label={label}
      labelClassName={labelClassName}
      renderInput={(inputRef) => (
        <DateInputBody
          inputRef={inputRef}
          inputProps={inputProps}
          canUserInput={canUserInput}
          onDateChange={onDateChange}
          disableDateBeforeCurrent={disableDateBeforeCurrent}
          canEditSeconds={canEditSeconds}
          isValidDate={isValidDate}
          defaultValue={defaultValue}
          value={value}
          showTime={showTime}
        ></DateInputBody>
      )}
    />
  )
}
type DateInputBodyProps = {
  inputRef?: RefObject<HTMLInputElement | HTMLElement>
  defaultValue?: Date
  value?: Date
  isValidDate?: (date: Date) => boolean
  className?: string
  inputProps?: Omit<InputProps, 'defaultValue' | 'value'>
  disableDateBeforeCurrent?: boolean
  canEditSeconds?: boolean
  canUserInput?: boolean
  onDateChange?(selectedDate: Date | undefined): void
  showTime?:
    | {
        format: string
      }
    | boolean
}

/**
 * base on uiw's `<DataPicker>`
 */
function DateInputBody({
  inputRef,
  value,
  defaultValue,
  className,
  disableDateBeforeCurrent,
  canEditSeconds,
  canUserInput,
  isValidDate,
  onDateChange,
  showTime,
  inputProps
}: DateInputBodyProps) {
  const [currentDate, setCurrentFakeDate] = useState<Date | undefined>(defaultValue) // maybe 11:11:52

  const currentTimezoneOffset = currentDate?.getTimezoneOffset() ?? 0
  const chainTimeOffset = useConnection((s) => s.chainTimeOffset) ?? 0

  function toChainTime(date: DateParam) {
    return offsetDateTime(date, { milliseconds: chainTimeOffset })
  }

  function toFakeUTCByLocalDate(date: DateParam) {
    return offsetDateTime(date, { minutes: currentTimezoneOffset })
  }

  function deFakeUTCByLocalDate(date: DateParam) {
    return offsetDateTime(date, { minutes: -currentTimezoneOffset })
  }

  useEffect(() => {
    if (!canEditSeconds && value && isDateEqual(value, setDateTimeSecondToZero(currentDate))) return
    setCurrentFakeDate(value)
  }, [value])

  const today = toFakeUTCByLocalDate(toChainTime(new Date()))

  const parsedShowTime = isObject(showTime)
    ? {
        ...showTime
        // disabledHours(hour: number, type, date: Date) {
        //   const currentDate = setDateTime(date, { hours: hour })
        //   return isDateBefore(toFakeUTCByLocalDate(currentDate), today)
        // },
        // disabledMinutes(minutes: number, type, date: Date) {
        //   const currentDate = setDateTime(date, { minutes })
        //   return isDateBefore(toFakeUTCByLocalDate(currentDate), today)
        // },
        // disabledSeconds(seconds: number, type, date: Date) {
        //   const currentDate = setDateTime(date, { seconds })
        //   return isDateBefore(toFakeUTCByLocalDate(currentDate), today)
        // }
      }
    : showTime
  return (
    <Popover placement="top" className={className} cornerOffset={20} triggerBy={['focus', 'click']}>
      <Popover.Button>
        <Input
          {...inputProps}
          inputDomRef={inputRef}
          disableUserInput={!canUserInput}
          className={twMerge(
            'bg-[#141041] font-medium text-lg text-white rounded-lg py-2 cursor-text',
            inputProps?.className
          )}
          value={currentDate ? toUTC(currentDate) : undefined}
          onUserInput={(text) => {
            if (!text) {
              setCurrentFakeDate(undefined)
              onDateChange?.(undefined)
            }
          }}
        />
      </Popover.Button>
      <Popover.Panel>
        <DatePicker
          className={canEditSeconds ? '' : 'hide-seconds-editor'}
          showTime={showTime && currentDate ? (parsedShowTime as any) : false}
          weekday={['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']}
          weekTitle={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']}
          monthLabel={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']}
          date={currentDate ? toFakeUTCByLocalDate(currentDate) : currentDate}
          disabledDate={(date) =>
            [
              (date: Date) => (isValidDate ? !isValidDate(date) : false),
              disableDateBeforeCurrent
                ? (date: Date) =>
                    isDateBefore(date, offsetDateTime(today, { hours: -1 } /* focus user can select today */))
                : undefined
            ].some((fn) => fn?.(date))
          }
          todayButton="today"
          today={today}
          onChange={(selectedFakeDate) => {
            const newDate = selectedFakeDate ? deFakeUTCByLocalDate(selectedFakeDate) : selectedFakeDate
            setCurrentFakeDate(newDate)
            onDateChange?.(canEditSeconds ? newDate : setDateTimeSecondToZero(newDate))
          }}
          lang="en"
        />
      </Popover.Panel>
    </Popover>
  )
}

/**
 * test date input
 * @see https://uiwjs.github.io/#/components/date-input
 */
function DatePicker(props: ComponentProps<typeof _DatePicker>) {
  return <_DatePicker {...props} />
}
