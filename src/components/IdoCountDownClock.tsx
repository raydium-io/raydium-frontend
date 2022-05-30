import React, { useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'

import Row from '@/components/Row'

import parseDuration from '../functions/date/parseDuration'
import { TimeStamp } from '@/functions/date/interface'
import useConnection from '@/application/connection/useConnection'

/** !!! use Chain time  */
export default function IdoCountDownClock({
  singleValueMode,
  labelClassName = '',
  play = true,
  className,
  endTime,
  onEnd
}: {
  /** only have one value `90 seconds` instead of `1 minute 30 seconds` */
  singleValueMode?: boolean
  labelClassName?: string
  play?: boolean
  className?: string
  endTime: TimeStamp
  onEnd?: () => void
}) {
  const getChainDate = useConnection((s) => s.getChainDate)
  const [currentDate, setCurrentDate] = useState(getChainDate())
  const endDate = new Date(endTime)
  const duration = parseDuration(endDate.getTime() - currentDate.getTime())
  const labels = {
    days: duration.days <= 1 ? 'Day' : 'Days',
    hours: duration.hours <= 1 ? 'Hour' : 'Hours',
    minutes: duration.minutes <= 1 ? 'Minute' : 'Minutes',
    seconds: duration.seconds <= 1 ? 'Second' : 'Seconds'
  }

  const isValueNegative = duration.full < 0

  const showDaysNumber = duration.days > 0
  const showHourNumber = duration.hours > 0
  const showMinutesNumber = !showDaysNumber && duration.minutes > 0
  const showSecondsNumber = !showHourNumber

  useEffect(() => {
    if (isValueNegative) return
    if (showSecondsNumber) {
      const timeId = globalThis.setInterval(() => {
        if (play) setCurrentDate(getChainDate())
      }, 1000)
      return () => clearInterval(timeId)
    } else if (showMinutesNumber) {
      const timeId = globalThis.setInterval(() => {
        if (play) setCurrentDate(getChainDate())
      }, 1000 * 60)
      return () => clearInterval(timeId)
    } else if (showHourNumber) {
      const timeId = globalThis.setInterval(() => {
        if (play) setCurrentDate(getChainDate())
      }, 1000 * 60 * 60)
      return () => clearInterval(timeId)
    }
  }, [play, isValueNegative, showHourNumber, showMinutesNumber, showSecondsNumber])

  useEffect(() => {
    /** nearly 50ms from zero */
    if (0 <= duration.full && duration.full < 50) {
      onEnd?.()
    }
  }, [duration])

  if (singleValueMode) {
    if (duration.days >= 1)
      return (
        <Row className={twMerge('items-baseline', className)}>
          <div>{duration['days']}</div>
          <div className={twMerge('ml-1 text-xs', labelClassName)}>{labels['days']}</div>
        </Row>
      )
    if (duration.hours >= 1)
      return (
        <Row className={twMerge('items-baseline', className)}>
          <div>{24 * duration['days'] + duration['hours']}</div>
          <div className={twMerge('ml-1 text-xs', labelClassName)}>{labels['hours']}</div>
        </Row>
      )
    if (duration.minutes >= 1)
      return (
        <Row className={twMerge('items-baseline', className)}>
          <div>{24 * 60 * duration['days'] + 60 * duration['hours'] + duration['minutes']}</div>
          <div className={twMerge('ml-1 text-xs', labelClassName)}>{labels['minutes']}</div>
        </Row>
      )
    return (
      <Row className={twMerge('items-baseline', className)}>
        <div>
          {24 * 60 * 60 * duration['days'] +
            60 * 60 * duration['hours'] +
            60 * duration['minutes'] +
            duration['seconds']}
        </div>
        <div className={twMerge('ml-1 text-xs', labelClassName)}>{labels['seconds']}</div>
      </Row>
    )
  }
  return (
    <Row className={twMerge(`space-x-1 ${className ?? ''}`)}>
      {showDaysNumber && (
        <Row className="items-baseline">
          <div>{duration['days']}</div>
          <div className={twMerge('ml-1 text-xs', labelClassName)}>{labels['days']}</div>
        </Row>
      )}
      {showHourNumber && (
        <Row className="items-baseline">
          <div>{duration['hours']}</div>
          <div className={twMerge('ml-1 text-xs', labelClassName)}>{labels['hours']}</div>
        </Row>
      )}
      {showMinutesNumber && (
        <Row className="items-baseline">
          <div>{String(duration['minutes']).padStart(2, '0')}</div>
          <div className={twMerge('ml-1 text-xs', labelClassName)}>{labels['minutes']}</div>
        </Row>
      )}
      {showSecondsNumber && (
        <Row className="items-baseline">
          <div>{String(duration['seconds']).padStart(2, '0')}</div>
          <div className={twMerge('ml-1 text-xs', labelClassName)}>{labels['seconds']}</div>
        </Row>
      )}
    </Row>
  )
}
