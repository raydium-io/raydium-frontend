import React, { ReactNode, useRef } from 'react'

import { twMerge } from 'tailwind-merge'

import { shrinkToValue } from '@/functions/shrinkToValue'
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect '

/**
 * same as html <progress>
 * but with prettier ui and a label
 *
 * already imply `twMerge()`
 * @example
 * <Progress value={0.7} showLabel />
 */
export default function Progress({
  className,
  slotClassName,
  pillarClassName,
  labelClassName,
  value,
  showLabel,
  labelFormat = (v) => (v * 100).toFixed(2) + '%'
}: {
  className?: string
  slotClassName?: string
  pillarClassName?: string
  labelClassName?: string
  value?: number
  showLabel?: boolean
  /** only effective when showlabel */
  labelFormat?: ((value: number) => ReactNode) | ReactNode
}) {
  const progressRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  useIsomorphicLayoutEffect(() => {
    if (!labelRef.current) return
    if (!progressRef.current) return
    labelRef.current!.style.setProperty('--patch-delta', 0 + 'px')
    const labelBoundingRect = labelRef.current!.getBoundingClientRect()
    const progressBoundingRect = progressRef.current!.getBoundingClientRect()
    const labelOffsetLeft = labelBoundingRect.left - progressBoundingRect.left
    const labelOffsetRight = labelBoundingRect.right - progressBoundingRect.right
    labelRef.current!.style.setProperty(
      '--patch-delta',
      -(labelOffsetLeft < 0 ? labelOffsetLeft : labelOffsetRight > 0 ? labelOffsetRight : 0) + 'px'
    )
  })
  const clampedValue = Math.min(Number(value), 1)
  return (
    <div ref={progressRef} className={twMerge(`Progress relative ${className ?? ''}`)}>
      <div
        className={twMerge(
          `Progress-whole-slot bg-gray-50 bg-opacity-20 rounded-full overflow-hidden w-full h-2 ${slotClassName ?? ''}`
        )}
      >
        <div
          className={twMerge(`Progress-inner-pillar rounded-full  h-full ${pillarClassName ?? ''}`)}
          style={{
            width: `${clampedValue * 100}%`,
            backgroundColor:
              clampedValue < 1 / 3
                ? 'var(--style-color-cyan)'
                : clampedValue < 2 / 3
                ? 'var(--style-color-blue)'
                : 'var(--style-color-fuchsia)'
          }}
        />
      </div>
      {showLabel && (
        <div
          ref={labelRef}
          className={twMerge(`inline-block Progress-label ${labelClassName ?? ''}`)}
          style={{
            marginLeft: `${clampedValue * 100}%`,
            transform: `translate(calc(-50% + var(--patch-delta, 0px)))`,
            color:
              clampedValue < 1 / 3
                ? 'var(--style-color-cyan)'
                : clampedValue < 2 / 3
                ? 'var(--style-color-blue)'
                : 'var(--style-color-fuchsia)'
          }}
        >
          {shrinkToValue(labelFormat, [value])}
        </div>
      )}
    </div>
  )
}
