import React, { ReactNode, useRef } from 'react'

import { twMerge } from 'tailwind-merge'

import { shrinkToValue } from '@/functions/shrinkToValue'
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect '
import AutoBox from './AutoBox'

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

  labelStayToRight,
  isGray,

  labelClassName,
  value,
  showLabel,
  labelFormat = (v) => (v * 100).toFixed(2) + '%'
}: {
  className?: string
  slotClassName?: string
  pillarClassName?: string

  /** UI */
  labelStayToRight?: boolean
  /**css color */
  isGray?: boolean

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
  const themeColor =
    clampedValue < 1 / 3
      ? isGray
        ? '#ABC4FF80'
        : 'var(--style-color-cyan)'
      : clampedValue < 2 / 3
      ? isGray
        ? '#ABC4FF80'
        : 'var(--style-color-blue)'
      : isGray
      ? '#ABC4FF80'
      : 'var(--style-color-fuchsia)'
  return (
    <AutoBox
      is={labelStayToRight ? 'Row' : 'div'}
      domRef={progressRef}
      className={twMerge(`Progress relative ${labelStayToRight ? 'items-center gap-2' : ''} ${className ?? ''}`)}
    >
      <div
        className={twMerge(
          `Progress-whole-slot bg-gray-50 bg-opacity-20 rounded-full overflow-hidden w-full h-2 ${slotClassName ?? ''}`
        )}
      >
        <div
          className={twMerge(`Progress-inner-pillar rounded-full  h-full ${pillarClassName ?? ''}`)}
          style={{
            width: `${clampedValue * 100}%`,
            backgroundColor: themeColor
          }}
        />
      </div>
      {showLabel && (
        <div
          ref={labelRef}
          className={twMerge(`inline-block Progress-label ${labelClassName ?? ''}`)}
          style={{
            marginLeft: labelStayToRight ? undefined : `${clampedValue * 100}%`,
            transform: labelStayToRight ? undefined : `translate(calc(-50% + var(--patch-delta, 0px)))`,
            color: themeColor
          }}
        >
          {shrinkToValue(labelFormat, [value])}
        </div>
      )}
    </AutoBox>
  )
}
