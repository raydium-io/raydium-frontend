import React, { ReactNode, RefObject, useRef } from 'react'

import { twMerge } from 'tailwind-merge'

import { shrinkToValue } from '@/functions/shrinkToValue'

import Col from './Col'
import Input, { InputProps } from './Input'
import mergeRef from '@/functions/react/mergeRef'
import DecimalInput, { DecimalInputProps } from './DecimalInput'

export type InputBoxProps = {
  className?: string
  cannotInput?: boolean

  label?: string
  labelClassName?: string

  onEnter?: InputProps['onEnter']
  /** should  attach domref want focus input by click */
  renderInput?: ((inputRef: RefObject<any>) => ReactNode) | ReactNode
} & (
  | ({ decimalMode: true } & DecimalInputProps & { inputProps?: DecimalInputProps })
  | ({ decimalMode?: false } & InputProps & { inputProps?: InputProps })
)

export default function InputBox({
  decimalMode,
  className,
  cannotInput,

  label,
  labelClassName,

  inputProps,
  renderInput,
  ...restProps // input Props
}: InputBoxProps) {
  const inputRef = useRef<HTMLElement>(null)
  function focusInput() {
    inputRef.current?.focus?.()
  }
  return (
    <Col
      onClick={focusInput}
      className={twMerge(`bg-[#141041] rounded-xl py-3 px-6 ${cannotInput ? '' : 'cursor-text'}`, className)}
    >
      {label && (
        <div
          className={twMerge(`text-xs mobile:text-2xs text-[#abc4ff80] font-medium mb-2 mobile:mb-1`, labelClassName)}
        >
          {label}
        </div>
      )}
      {shrinkToValue(renderInput, [inputRef]) ??
        (decimalMode ? (
          <DecimalInput
            {...(restProps as DecimalInputProps)}
            {...(inputProps as DecimalInputProps)}
            className={twMerge('w-full font-medium text-lg text-white', inputProps?.className)}
            componentRef={mergeRef(inputRef, inputProps?.componentRef)}
          />
        ) : (
          <Input
            {...(restProps as InputProps)}
            {...(inputProps as InputProps)}
            className={twMerge('w-full font-medium text-lg text-white', inputProps?.className)}
            componentRef={mergeRef(inputRef, inputProps?.componentRef)}
          />
        ))}
    </Col>
  )
}
