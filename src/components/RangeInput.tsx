import { CSSProperties, useState } from 'react'

import Slider, { SliderProps } from 'rc-slider'
import { twMerge } from 'tailwind-merge'

import mergeProps from '@/functions/react/mergeProps'

import Row from './Row'

import 'rc-slider/assets/index.css'

export interface InputProps {
  id?: string
  title?: string
  currentAmount?: string
  className?: string
  titleClassName?: string
  tagClassName?: string
  min?: number
  max: number
}

export default function RangeInput(props: InputProps) {
  // props set by validators
  const [fallbackProps, setFallbackProps] = useState<Omit<InputProps, 'validators' | 'disabled'>>()

  const {
    id,
    title,
    currentAmount,
    //  type,

    //  noCSSInputDefaultWidth,

    //  required,
    //  labelText,

    //  placeholder,

    //  disabled,
    //  disableUserInput,
    //  validators,
    //  pattern,
    //  maximum,

    //  defaultValue,
    //  value,

    //  prefix,
    //  suffix,
    //  domRef,
    //  style,
    className,
    titleClassName,
    tagClassName
    //  componentRef,
    //  inputDomRef,
    //  inputWrapperClassName,
    //  inputClassName,
    //  inputHTMLProps,
    //  onDangerousValueChange,
    //  onUserInput,
    //  onEnter,
    //  onBlur,
    //  onFocus,
    //  onClick
  } = mergeProps(props, fallbackProps)

  return (
    <div className={twMerge('w-full py-1 px-1', className)}>
      <Row className="w-full flex flex-row justify-between">
        <div className="w-full flex flex-row justify-start items-center ">
          <span className={twMerge('text-[#ABC4FF] font-normal', titleClassName)} style={{ marginRight: 8 }}>
            {title ?? 'Amount'}
          </span>
          <PercentTag tagName="Max" className={tagClassName} />
          <PercentTag tagName="100%" />
          <PercentTag tagName="75%" />
          <PercentTag tagName="50%" />
          <PercentTag tagName="25%" />
        </div>
        <div style={{ color: 'white', fontSize: 18, fontWeight: 500 }}>{currentAmount}</div>
      </Row>
      <SliderWrap currentValue={55} className={'mt-5'} />
    </div>
  )
}

function PercentTag({ tagName, className }: { tagName: string; className?: string }) {
  return (
    <div
      className={twMerge(
        'text-[#ABC4FF] font-medium m-0.25 bg-[#1B1659] rounded-xl mobile:rounded-l hover:bg-[#ABC4FF] hover:text-[#1B1659] py-1 px-3 clickable',
        className
      )}
    >
      {tagName}
    </div>
  )
}

function SliderWrap({
  currentValue,
  className,
  trackStyle,
  handleStyle,
  railStyle,
  ...restProps
}: {
  currentValue: number
  className?: string
  trackStyle?: SliderProps['trackStyle']
  handleStyle?: SliderProps['handleStyle']
  railStyle?: SliderProps['railStyle']
}) {
  const [maxValue, setMaxValue] = useState(100)

  return (
    <Row className={twMerge('w-full h-5, pl-3', className)}>
      <Slider
        min={0}
        max={maxValue}
        step={0.1}
        trackStyle={{ backgroundColor: '#ABC4FF', height: 2, ...trackStyle }}
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
      />
    </Row>
  )
}
