import React, { ComponentProps, useEffect, useState } from 'react'

import _DatePicker from '@uiw/react-date-picker'

import Input, { InputProps } from '@/components/Input'
import { offsetDateTime, toUTC } from '@/functions/date/dateFormat'

import InputBox from './InputBox'
import Popover from './Popover'

import './DatePicker.css'
import { twMerge } from 'tailwind-merge'

export type DateInputProps = {
  className?: string
  label?: string
  labelClassName?: string
  inputProps?: Omit<InputProps, 'defaultValue' | 'value'>
  onDateChange?(selectedDate: Date | undefined): void
} & Omit<InputProps, 'value' | 'defaultValue'> & {
    value?: Date
    defaultValue?: Date
  }

export default function DateInput({
  value,
  defaultValue,

  className,
  label,
  labelClassName,
  inputProps,
  onDateChange
}: DateInputProps) {
  return (
    <InputBox
      className={className}
      label={label}
      labelClassName={labelClassName}
      renderInput={
        <DateInputBody
          inputProps={inputProps}
          onDateChange={onDateChange}
          defaultValue={defaultValue}
          value={value}
        ></DateInputBody>
      }
    />
  )
}
type DateInputBodyProps = {
  defaultValue?: Date
  value?: Date
  className?: string
  inputProps?: Omit<InputProps, 'defaultValue' | 'value'>
  onDateChange?(selectedDate: Date | undefined): void
}

/**
 * base on uiw's `<DataPicker>`
 */
function DateInputBody({ value, defaultValue, className, onDateChange, inputProps }: DateInputBodyProps) {
  const [currentDate, setCurrentDate] = useState<Date | undefined>(defaultValue)
  const currentTimezoneOffset = currentDate?.getTimezoneOffset()

  useEffect(() => {
    setCurrentDate(value)
  }, [value])

  return (
    <Popover placement="top" className={className} cornerOffset={20}>
      <Popover.Button>
        <Input
          {...inputProps}
          className={twMerge(
            'bg-[#141041] font-medium text-lg text-white rounded-lg py-2 cursor-text',
            inputProps?.className
          )}
          value={currentDate ? toUTC(currentDate, { showSeconds: true }) : undefined}
          onUserInput={(text) => {
            if (!text) {
              setCurrentDate(undefined)
              onDateChange?.(undefined)
            }
          }}
        />
      </Popover.Button>
      <Popover.Panel>
        <DatePicker
          showTime
          weekday={['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']}
          weekTitle={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']}
          monthLabel={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']}
          date={
            currentDate && currentTimezoneOffset
              ? offsetDateTime(currentDate, { minutes: currentTimezoneOffset })
              : currentDate
          }
          todayButton="today"
          onChange={(selectedDate) => {
            const newDate =
              selectedDate && currentTimezoneOffset
                ? offsetDateTime(selectedDate, { minutes: -currentTimezoneOffset })
                : selectedDate
            setCurrentDate(newDate)
            onDateChange?.(newDate)
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
