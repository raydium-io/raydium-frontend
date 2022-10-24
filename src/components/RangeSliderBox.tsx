import { useCallback, useEffect, useState } from 'react'

import { Fraction } from 'test-r-sdk'

import BN from 'bn.js'
import Slider, { SliderProps } from 'rc-slider'
import { twMerge } from 'tailwind-merge'

import toPercentString from '@/functions/format/toPercentString'
import { isArray } from '@/functions/judgers/dateType'
import { div, mul } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'
import mergeProps from '@/functions/react/mergeProps'

import Row from './Row'

import 'rc-slider/assets/index.css'

// TODO: dirty fixed tick
export interface RangeSliderBoxProps {
  id?: string
  title?: string
  currentAmount?: string
  className?: string
  titleClassName?: string
  tagClassName?: string
  min?: number
  max: number
  onChange?: (value: number | number[]) => void
  liquidity?: BN
  tick: Fraction
}

// this component is actually for remove liquidity purpose
export default function RangeSliderBox(props: RangeSliderBoxProps) {
  // props set by validators
  const [fallbackProps, setFallbackProps] = useState<Omit<RangeSliderBoxProps, 'validators' | 'disabled'>>()
  const [currentPercentage, setCurrentPercentage] = useState<number>(0)
  const [currentValue, setCurrentValue] = useState<number>(0)

  const { id, title, max, className, titleClassName, tagClassName, onChange, liquidity, tick } = mergeProps(
    props,
    fallbackProps
  )

  const onSliderChange = useCallback(
    (value: number | number[]) => {
      if (isArray(value)) return
      const newPercentage = value / max
      onChange && onChange(value)
      setCurrentValue(value)
      setCurrentPercentage(newPercentage)
    },
    [onChange]
  )

  const setPercentageValue = useCallback(
    (value) => {
      setCurrentPercentage(value)
      setCurrentValue(max * value)
      onChange && onChange(max * value)
    },
    [max]
  )

  useEffect(() => {
    let newCurrentPercentage = Number(toString(div(liquidity ?? 0, mul(max, tick)), { decimalLength: 'auto 4' }))
    newCurrentPercentage = newCurrentPercentage > 1 ? 1 : newCurrentPercentage
    setCurrentPercentage(newCurrentPercentage)
    setCurrentValue(Number(toString(newCurrentPercentage * max, { decimalLength: 'auto 2' })) ?? 0)
  }, [liquidity])

  return (
    <div className={twMerge('w-full py-1 px-1', className)}>
      <Row className="w-full flex flex-row justify-between">
        <div className="w-full flex flex-row justify-start items-center ">
          <span
            className={twMerge('text-[#ABC4FF] font-medium text-base mobile:text-sm', titleClassName)}
            style={{ marginRight: 8 }}
          >
            {title ?? 'Amount'}
          </span>
          <Row className="gap-1 mobile:gap-0.5">
            <PercentTag tagName="Max" className={tagClassName} percentageValue={1} onClick={setPercentageValue} />
            <PercentTag tagName="75%" className={tagClassName} percentageValue={0.75} onClick={setPercentageValue} />
            <PercentTag tagName="50%" className={tagClassName} percentageValue={0.5} onClick={setPercentageValue} />
            <PercentTag tagName="25%" className={tagClassName} percentageValue={0.25} onClick={setPercentageValue} />
          </Row>
        </div>
        <div className="text-lg mobile:text-sm text-white font-medium flex items-center">
          {toPercentString(currentPercentage)}
        </div>
      </Row>
      <SliderWrap className={'mt-5'} max={max} onChange={onSliderChange} value={currentValue} />
    </div>
  )
}

function PercentTag({
  tagName,
  className,
  percentageValue,
  onClick
}: {
  tagName: string
  className?: string
  percentageValue: number
  onClick?: (value: number) => void
}) {
  return (
    <div
      className={twMerge(
        'text-[#ABC4FF] font-medium text-sm mobile:text-xs m-0.25 bg-[#14104180] rounded-lg mobile:rounded-md hover:bg-[#ABC4FF] hover:text-[#1B1659] py-1 px-3 mobile:px-2 clickable',
        className
      )}
      onClick={() => {
        onClick && onClick(percentageValue)
      }}
    >
      {tagName}
    </div>
  )
}

function SliderWrap({
  max,
  className,
  trackStyle,
  handleStyle,
  railStyle,
  onChange,
  value,
  defaultValue,
  ...restProps
}: {
  max: number
  className?: string
  trackStyle?: SliderProps['trackStyle']
  handleStyle?: SliderProps['handleStyle']
  railStyle?: SliderProps['railStyle']
  onChange?: (value: number | number[]) => void
  value?: number
  defaultValue?: number
}) {
  return (
    <Row className={twMerge('w-full h-5, px-3', className)}>
      <Slider
        min={0}
        max={max}
        step={0.01}
        value={value ?? undefined}
        trackStyle={{ backgroundColor: '#36B9E2', height: 2, ...trackStyle }}
        handleStyle={{
          borderColor: 'transparent',
          height: 24,
          width: 24,
          marginTop: -12,
          backgroundColor: '#ABC4FF',
          opacity: 1,
          boxShadow: 'none',
          ...handleStyle
        }}
        railStyle={{
          backgroundColor: '#36B9E2',
          height: 1,
          opacity: '0.2',
          ...railStyle
        }}
        onChange={(value) => {
          onChange && onChange(value)
        }}
      />
    </Row>
  )
}
