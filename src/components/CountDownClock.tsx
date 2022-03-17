import React, { useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'

import Row from '@/components/Row'
import { DateInfo } from '@/types/constants'

import parseDuration from '../functions/date/parseDuration'

export default function CountDownClock({
  type = 'block',
  play = true,
  className,
  endTime,
  hideDays,
  hideHours,
  hideMinutes,
  hideSeconds,
  hideMilliseconds = true,
  showDays = !hideDays,
  showHours = !hideHours,
  showMinutes = !hideMinutes,
  showSeconds = !hideSeconds,
  showMilliseconds = !hideMilliseconds,
  itemClassName,
  onEnd
}: {
  type?: 'text' | 'block'
  play?: boolean
  className?: string
  endTime?: DateInfo
  hideDays?: boolean
  hideHours?: boolean
  hideMinutes?: boolean
  hideSeconds?: boolean
  hideMilliseconds?: boolean
  showDays?: boolean | 'auto'
  showHours?: boolean | 'auto'
  showMinutes?: boolean | 'auto'
  showSeconds?: boolean
  showMilliseconds?: boolean
  itemClassName?: string
  onEnd?: () => void
}) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [hasReachEnd, sethasReachEnd] = useState(false)
  const endDate = new Date(endTime ?? Date.now())
  const values = parseDuration(endDate.getTime() - currentDate.getTime())
  const labels = {
    days: 'Day(s)',
    hours: 'Hour(s)',
    minutes: 'Minute(s)',
    seconds: 'Second(s)',
    milliseconds: 'Millisecond(s)'
  }

  useEffect(() => {
    const timeId = globalThis.setInterval(() => {
      if (play) setCurrentDate(new Date())
    }, 1000)
    return () => clearInterval(timeId)
  }, [play])

  useEffect(() => {
    /** nearly 50ms from zero */
    if (0 <= values.full && values.full < 50 && !hasReachEnd) {
      onEnd?.()
      sethasReachEnd(true)
    }
  }, [values])

  const showDaysNumber = showDays === 'auto' ? values.days > 0 : showDays
  const showHourNumber = showHours === 'auto' ? showDaysNumber || values.hours > 0 : showHours
  const showMinutesNumber = showMinutes === 'auto' ? showHourNumber || values.minutes > 0 : showMinutes
  const showSecondsNumber = showSeconds
  const showMillisecondsNumber = showMilliseconds

  if (type === 'text') {
    return (
      <span>
        {showDaysNumber ? `${values.days}:` : ''}
        {showHourNumber ? `${String(values.hours).padStart(2, '0')}:` : ''}
        {showMinutesNumber ? `${String(values.minutes).padStart(2, '0')}:` : ''}
        {showSecondsNumber ? `${String(values.seconds).padStart(2, '0')}` : ''}
        {showMillisecondsNumber ? `.${String(values.milliseconds).padStart(3, '0')}` : ''}
      </span>
    )
  }
  return (
    <Row className={twMerge(`space-x-6 mobile:space-x-3 ${className ?? ''}`)}>
      {showDaysNumber && (
        <Row className={twMerge(`flex-col items-center w-15 ${itemClassName ?? ''}`)}>
          <div>{values['days']}</div>
          <div className="opacity-50 text-xs">{labels['days']}</div>
        </Row>
      )}
      {showHourNumber && (
        <Row className={twMerge(`flex-col items-center w-15 ${itemClassName ?? ''}`)}>
          <div>{String(values['hours']).padStart(2, '0')}</div>
          <div className="opacity-50 text-xs">{labels['hours']}</div>
        </Row>
      )}
      {showMinutesNumber && (
        <Row className={twMerge(`flex-col items-center w-15 ${itemClassName ?? ''}`)}>
          <div>{String(values['minutes']).padStart(2, '0')}</div>
          <div className="opacity-50 text-xs">{labels['minutes']}</div>
        </Row>
      )}
      {showSecondsNumber && (
        <Row className={twMerge(`flex-col items-center w-15 ${itemClassName ?? ''}`)}>
          <div>{String(values['seconds']).padStart(2, '0')}</div>
          <div className="opacity-50 text-xs">{labels['seconds']}</div>
        </Row>
      )}
      {showMillisecondsNumber && (
        <Row className={twMerge(`flex-col items-center w-15 ${itemClassName ?? ''}`)}>
          <div>{String(values['milliseconds']).padStart(3, '0')}</div>
          <div className="opacity-50 text-xs">{labels['milliseconds']}</div>
        </Row>
      )}
    </Row>
  )
}
