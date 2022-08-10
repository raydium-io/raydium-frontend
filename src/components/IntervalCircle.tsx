import React, { RefObject, startTransition, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'

import { useClick } from '@/hooks/useClick'

export interface IntervalCircleHandler {
  /** percent */
  currentProgressPercent: number
  restart(): void
}
/** unit (ms) */
export default function IntervalCircle({
  run = true,
  initPercent = 0,
  componentRef,
  className,
  duration = 60 * 1000,
  strokeWidth = 3,
  updateDelay = 1000,
  svgWidth = 36,
  loop = true,
  onEnd,
  onClick
}: {
  /** like animation run */
  run?: boolean
  /**
   * when this props change, restartCircle manually
   */
  componentRef?: RefObject<any>
  initPercent?: number
  className?: string
  duration?: number
  strokeWidth?: string | number
  updateDelay?: number
  svgWidth?: number
  loop?: boolean
  onClick?: () => void
  onEnd?: () => void
} = {}) {
  const width = svgWidth
  const height = width
  const r = (0.5 * width) / 2
  const p = 2 * r * Math.PI
  const [progressPercent, setProgressPercent] = useState(initPercent) // percent
  const selfRef = useRef(null)
  useClick(selfRef, { onClick, disable: !onClick })

  useEffect(() => {
    const timeoutId = globalThis.setInterval(() => {
      if (run) setProgressPercent((old) => old + (1 / duration) * updateDelay)
    }, updateDelay)
    return () => globalThis.clearInterval(timeoutId)
  }, [duration, updateDelay, run])

  useEffect(() => {
    if (progressPercent !== 0 && (Math.round(progressPercent * 100) / 100) % 1 === 0) {
      startTransition(() => {
        onEnd?.()
      })
    }
  }, [onEnd, progressPercent])

  useImperativeHandle(
    componentRef,
    () =>
      ({
        currentProgressPercent: progressPercent % 1,
        restart() {
          setProgressPercent(0)
        }
      } as IntervalCircleHandler)
  )

  return (
    <div className={twMerge('w-full h-full rounded', className)}>
      <svg ref={selfRef} width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <circle r={r} cx="50%" cy="50%" fill="transparent" style={{ strokeWidth: strokeWidth, stroke: '#ffffff2e' }} />
        <circle
          id="bar"
          r={r}
          cx="50%"
          cy="50%"
          fill="transparent"
          strokeDasharray={p}
          strokeDashoffset={p - (loop ? progressPercent % 1 : Math.min(progressPercent, 1)) * p}
          style={{
            strokeWidth: strokeWidth,
            stroke: '#92e1ffd9',
            transform: 'rotate(-90deg)',
            transformOrigin: 'center',
            strokeLinecap: 'round',
            transition: '200ms'
          }}
        />
      </svg>
    </div>
  )
}
