import React, { ReactNode, RefObject, useRef } from 'react'

import { twMerge } from 'tailwind-merge'

import Row from '@/components/Row'
import { shrinkToValue } from '@/functions/shrinkToValue'

import Col from './Col'
import Input, { InputProps } from './Input'

export type InputBoxParams = {
  inputStyle?: 'inline-input' | 'textarea'
  className?: string
  label?: string
  onUserInput?(text: string): void
  onEnter?: InputProps['onEnter']
  renderInput?: ((domRef: RefObject<any>) => ReactNode) | ReactNode
}

export default function InputBox({
  inputStyle = 'inline-input',
  className,
  label,
  onUserInput,
  onEnter,
  renderInput
}: InputBoxParams) {
  const inputRef = useRef<HTMLInputElement>(null)

  function focusInput() {
    inputRef.current?.focus()
  }
  return inputStyle === 'textarea' ? (
    <Col onClick={focusInput} className={twMerge(`bg-[#141041] rounded-xl py-3 px-6 cursor-text`, className)}>
      {label && (
        <div className={`text-sm font-medium text-[rgba(171,196,255,.5)] mb-3 mobile:mb-1 mobile:text-xs`}>{label}</div>
      )}
      {shrinkToValue(renderInput, [inputRef]) ?? (
        <Input
          className="w-full"
          componentRef={inputRef}
          onUserInput={(text) => onUserInput?.(text)}
          onEnter={onEnter}
        />
      )}
    </Col>
  ) : (
    <Row onClick={focusInput} className={twMerge(`flex-wrap items-center cursor-text justify-between`, className)}>
      {label && <div className={`text-sm font-medium text-[rgba(171,196,255,.5)] mobile:text-xs my-1`}>{label}</div>}
      {shrinkToValue(renderInput, [inputRef]) ?? (
        <Input
          className="w-full bg-[#141041] rounded-lg py-2 px-4"
          componentRef={inputRef}
          onUserInput={(text) => onUserInput?.(text)}
          onEnter={onEnter}
        />
      )}
    </Row>
  )
}
