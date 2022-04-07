import React, { useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'

import Row from '@/components/Row'

import parseDuration from '../functions/date/parseDuration'
import { TimeStamp } from '@/functions/date/interface'

export default function CountDownClock({
  play = true,
  className,
  endTime,
  onEnd
}: {
  play?: boolean
  className?: string
  endTime?: TimeStamp
  onEnd?: () => void
}) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [hasReachEnd, sethasReachEnd] = useState(false)
  const endDate = new Date(endTime ?? Date.now())
  const values = parseDuration(endDate.getTime() - currentDate.getTime())
  //TODO values
  const labels = {
    days: values.days <= 1 ? 'Day' : 'Days',
    hours: values.hours <= 1 ? 'Hour' : 'Hours',
    minutes: values.minutes <= 1 ? 'Minute' : 'Minutes',
    seconds: values.seconds <= 1 ? 'Second' : 'Seconds'
  }

  const isValueNegative = values.full < 0

  const showDaysNumber = values.days > 0
  const showHourNumber = values.hours > 0
  const showMinutesNumber = !showDaysNumber && showHourNumber && values.minutes > 0
  const showSecondsNumber = !showHourNumber && showMinutesNumber

  useEffect(() => {
    if (isValueNegative) return
    if (showSecondsNumber) {
      const timeId = globalThis.setInterval(() => {
        if (play) setCurrentDate(new Date())
      }, 1000)
      return () => clearInterval(timeId)
    } else if (showMinutesNumber) {
      const timeId = globalThis.setInterval(() => {
        if (play) setCurrentDate(new Date())
      }, 1000 * 60)
      return () => clearInterval(timeId)
    } else if (showHourNumber) {
      const timeId = globalThis.setInterval(() => {
        if (play) setCurrentDate(new Date())
      }, 1000 * 60 * 60)
      return () => clearInterval(timeId)
    }
  }, [play, isValueNegative, showHourNumber, showMinutesNumber, showSecondsNumber])

  useEffect(() => {
    /** nearly 50ms from zero */
    if (0 <= values.full && values.full < 50 && !hasReachEnd) {
      onEnd?.()
      sethasReachEnd(true)
    }
  }, [values])

  return (
    <Row className={twMerge(`space-x-1 ${className ?? ''}`)}>
      {showDaysNumber && (
        <Row className="items-baseline">
          <div>{values['days']}</div>
          <div className="ml-1 text-xs">{labels['days']}</div>
        </Row>
      )}
      {showHourNumber && (
        <Row className="items-baseline">
          <div>{String(values['hours']).padStart(2, '0')}</div>
          <div className="ml-1 text-xs">{labels['hours']}</div>
        </Row>
      )}
      {showMinutesNumber && (
        <Row className="items-baseline">
          <div>{String(values['minutes']).padStart(2, '0')}</div>
          <div className="ml-1 text-xs">{labels['minutes']}</div>
        </Row>
      )}
      {showSecondsNumber && (
        <Row className="items-baseline">
          <div>{String(values['seconds']).padStart(2, '0')}</div>
          <div className="ml-1 text-xs">{labels['seconds']}</div>
        </Row>
      )}
    </Row>
  )
}
