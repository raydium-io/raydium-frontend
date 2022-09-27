import { useCallback, useEffect, useState } from 'react'

import BN from 'bn.js'
import Slider, { SliderProps } from 'rc-slider'
import { twMerge } from 'tailwind-merge'

import { toPercent } from '@/functions/format/toPercent'
import toPercentString from '@/functions/format/toPercentString'
import { isArray } from '@/functions/judgers/dateType'
import { div } from '@/functions/numberish/operations'
import toFraction from '@/functions/numberish/toFraction'
import mergeProps from '@/functions/react/mergeProps'
import Liquidity from '@/pages/liquidity/add'

import Row from './Row'

import 'rc-slider/assets/index.css'

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
}

// this component is actually for remove liquidity purpose
export default function RangeSliderBox(props: RangeSliderBoxProps) {
  // props set by validators
  const [fallbackProps, setFallbackProps] = useState<Omit<RangeSliderBoxProps, 'validators' | 'disabled'>>()
  const [currentPercentage, setCurrentPercentage] = useState<number>(0)
  const [currentValue, setCurrentValue] = useState<number>(0)

  const { id, title, max, className, titleClassName, tagClassName, onChange, liquidity } = mergeProps(
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
    const newCurrentPercentage = (liquidity?.toNumber() ?? 0) / max
    setCurrentPercentage(newCurrentPercentage > 1 ? 1 : newCurrentPercentage)
    setCurrentValue(liquidity?.toNumber() ?? 0)
  }, [liquidity])

  return (
    <div className={twMerge('w-full py-1 px-1', className)}>
      <Row className="w-full flex flex-row justify-between">
        <div className="w-full flex flex-row justify-start items-center ">
          <span className={twMerge('text-[#ABC4FF] font-normal', titleClassName)} style={{ marginRight: 8 }}>
            {title ?? 'Amount'}
          </span>
          <PercentTag tagName="Max" className={tagClassName} percentageValue={1} onClick={setPercentageValue} />
          <PercentTag tagName="75%" className={tagClassName} percentageValue={0.75} onClick={setPercentageValue} />
          <PercentTag tagName="50%" className={tagClassName} percentageValue={0.5} onClick={setPercentageValue} />
          <PercentTag tagName="25%" className={tagClassName} percentageValue={0.25} onClick={setPercentageValue} />
        </div>
        <div style={{ color: 'white', fontSize: 18, fontWeight: 500 }}>{toPercentString(currentPercentage)}</div>
      </Row>
      <SliderWrap currentValue={55} className={'mt-5'} max={max} onChange={onSliderChange} value={currentValue} />
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
        'text-[#ABC4FF] font-medium m-0.25 bg-[#1B1659] rounded-xl mobile:rounded-l hover:bg-[#ABC4FF] hover:text-[#1B1659] py-1 px-3 clickable',
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
  currentValue,
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
  currentValue: number
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
        step={0.1}
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
