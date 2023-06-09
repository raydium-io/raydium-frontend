import React, { ReactNode, useRef } from 'react'

import { twMerge } from 'tailwind-merge'

import { shrinkToValue } from '@/functions/shrinkToValue'
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect'
import AutoBox from './AutoBox'
import Row from './Row'
import toPercentString from '@/functions/format/toPercentString'

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

  borderThemeMode,

  labelClassName,
  value,
  labelFormat = (v) => toPercentString(v, { fixed: 0 })
}: {
  className?: string
  slotClassName?: string
  pillarClassName?: string

  /** UI, progress bar will be one line  */
  borderThemeMode?: boolean

  /**css color */
  isGray?: boolean

  labelClassName?: string
  value?: number
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
  const themeColor = clampedValue < 1 / 3 ? '#ABC4FF' : clampedValue < 2 / 3 ? '#39D0D8' : '#DA2EEF'
  return borderThemeMode ? (
    <Row
      className={twMerge(`Progress relative border-1.5 rounded-full overflow-hidden w-full h-6  ${className ?? ''}`)}
      style={{
        borderColor: themeColor
      }}
    >
      <div
        className={twMerge(
          `Progress-inner-pillar absolute top-0 rounded-full opacity-20 h-full ${pillarClassName ?? ''}`
        )}
        style={{
          width: `${clampedValue * 100}%`,
          backgroundColor: themeColor
        }}
      />
      <div
        ref={labelRef}
        className={twMerge(`inline-block Progress-label ${labelClassName ?? ''}`)}
        style={{
          marginInline: 'auto',
          color: themeColor
        }}
      >
        {shrinkToValue(labelFormat, [value])}
      </div>
    </Row>
  ) : (
    <AutoBox is="div" domRef={progressRef} className={twMerge(`Progress relative ${className ?? ''}`)}>
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
      <div
        ref={labelRef}
        className={twMerge(`inline-block Progress-label ${labelClassName ?? ''}`)}
        style={{
          marginLeft: `${clampedValue * 100}%`,
          transform: `translate(calc(-50% + var(--patch-delta, 0px)))`,
          color: themeColor
        }}
      >
        {shrinkToValue(labelFormat, [value])}
      </div>
    </AutoBox>
  )
}
