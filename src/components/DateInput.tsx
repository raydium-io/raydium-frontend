import React, { ComponentProps, RefObject, useState } from 'react'

import _DatePicker from '@uiw/react-date-picker'

import Input, { InputProps } from '@/components/Input'
import { offsetDateTime, toUTC } from '@/functions/date/dateFormat'

import { CoinInputBoxProps } from './CoinInputBox'
import InputBox, { InputBoxParams } from './InputBox'
import Popover from './Popover'

import './DatePicker.css'

export default function DateInput({
  inputStyle,
  defaultCurrentDate,
  className,
  label,
  onDateChange
}: {
  inputStyle?: InputBoxParams['inputStyle']
  defaultCurrentDate?: Date
  className?: string
  label?: string
  onDateChange?(selectedDate: Date | undefined): void
}) {
  return (
    <InputBox
      inputStyle={inputStyle}
      className={className}
      label={label}
      renderInput={<DateInputBody onDateChange={onDateChange} defaultCurrentDate={defaultCurrentDate}></DateInputBody>}
    />
  )
}
/**
 * base on uiw's `<DataPicker>`
 */
function DateInputBody({
  defaultCurrentDate,
  className,
  onDateChange
}: {
  defaultCurrentDate?: Date
  className?: string
  onDateChange?(selectedDate: Date | undefined): void
}) {
  const [currentDate, setCurrentDate] = useState<Date | undefined>(defaultCurrentDate)
  const currentTimezoneOffset = currentDate?.getTimezoneOffset()

  return (
    <Popover placement="top" className={className} cornerOffset={20}>
      <Popover.Button>
        <Input
          className="bg-[#141041] rounded-lg py-2 px-4 cursor-text"
          value={currentDate ? toUTC(currentDate, { showSeconds: true }) : undefined}
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
              ? offsetDateTime(currentDate, currentTimezoneOffset, { unit: 'minutes' })
              : currentDate
          }
          todayButton="today"
          onChange={(selectedDate) => {
            const newDate =
              selectedDate && currentTimezoneOffset
                ? offsetDateTime(selectedDate, -currentTimezoneOffset, { unit: 'minutes' })
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
