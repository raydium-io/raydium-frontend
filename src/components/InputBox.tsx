import React, { ReactNode, RefObject, useRef } from 'react'

import { twMerge } from 'tailwind-merge'

import { shrinkToValue } from '@/functions/shrinkToValue'

import Col from './Col'
import Input, { InputProps } from './Input'
import mergeRef from '@/functions/react/mergeRef'
import { mergeFunction } from '@/functions/merge'

export type InputBoxParams = {
  className?: string
  cannotInput?: boolean

  label?: string
  labelClassName?: string

  onUserInput?(text: string): void
  inputProps?: InputProps
  onEnter?: InputProps['onEnter']
  /** should  attach domref want focus input by click */
  renderInput?: ((domRef: RefObject<any>) => ReactNode) | ReactNode
}

export default function InputBox({
  className,
  cannotInput,

  label,
  labelClassName,

  onUserInput,
  inputProps,
  onEnter,
  renderInput
}: InputBoxParams) {
  const inputRef = useRef<HTMLInputElement>(null)
  function focusInput() {
    inputRef.current?.focus()
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
      {shrinkToValue(renderInput, [inputRef]) ?? (
        <Input
          {...inputProps}
          className={twMerge('w-full font-medium text-lg text-white', inputProps?.className)}
          componentRef={mergeRef(inputRef, inputProps?.componentRef)}
          onUserInput={mergeFunction((text) => onUserInput?.(text), inputProps?.onUserInput)}
          onEnter={onEnter}
        />
      )}
    </Col>
  )
}
