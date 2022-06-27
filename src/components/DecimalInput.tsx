import { isNumberish } from '@/functions/judgers/dateType'
import { toString } from '@/functions/numberish/toString'
import mergeRef from '@/functions/react/mergeRef'
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect '
import { Numberish } from '@/types/constants'
import React, { useEffect, useRef, useState } from 'react'

import Input, { InputProps } from './Input'

export interface DecimalInputProps extends Omit<InputProps, 'value' | 'defaultValue' | 'onUserInput'> {
  /**
   * only if type is decimal
   * @default  3
   */
  decimalCount?: number
  // TODO: onlyInt?: boolean
  // TODO: mustAboveZero?: boolean
  /**
   * only if type is decimal
   * @default  0
   */
  minN?: number | string
  maxN?: number | string

  /** it will auto-valid each time when user input.
   * html will invoke this
   */
  onInvalid?: () => void

  /** this  */
  onValid?: () => void
  /** default: false */
  canNegative?: boolean
  value?: Numberish
  defaultValue?: Numberish
  onUserInput?: (
    n: number | /* if value is too big */ string | undefined,
    payload: { canSafelyCovertToNumber: boolean }
  ) => void
}

function getRegexp(decimalCount: number) {
  const canNegativeRegexpString = `^[0-9-]*[.,]?[0-9]{0,${decimalCount}}$`
  const decimalRegexpString = `^[0-9]*[.,]?[0-9]{0,${decimalCount}}$`
  const canNegativeLetter = /^[0-9-,.]$/
  const decimalLetter = /^[0-9,.]$/
  return { canNegativeLetter, canNegativeRegexpString, decimalRegexpString, decimalLetter }
}

/** let <Input> be a independent  component, it for consistency, as <Button> and <Icon> and <Link> etc is independent */
export default function DecimalInput({
  defaultValue,
  value,
  decimalCount = 3,
  minN = 0,
  maxN,
  onInvalid,
  canNegative,
  onValid,
  ...restProps
}: DecimalInputProps) {
  const [innerValue, setInnerValue] = useState(defaultValue)
  useIsomorphicLayoutEffect(() => {
    setInnerValue(value)
  }, [value])
  const regexps = getRegexp(decimalCount)
  const inputDomRef = useRef<HTMLInputElement>()

  useEffect(() => {
    const letterRegex = canNegative ? regexps.canNegativeLetter : regexps.decimalLetter
    inputDomRef.current?.addEventListener(
      'keydown',
      (ev) => {
        const key = ev.key
        const isPureDecimal = key.length > 1 /* is control KEY like ArrowLeft */ || letterRegex.test(key)
        if (!isPureDecimal) {
          ev.preventDefault()
        }
      },
      { capture: true, passive: false }
    )
  }, [])

  return (
    <Input
      type="number"
      inputHTMLProps={{
        pattern: canNegative ? regexps.canNegativeRegexpString : regexps.decimalRegexpString,
        inputMode: 'decimal',
        min: String(minN),
        max: maxN ? String(maxN) : undefined
      }}
      {...restProps}
      domRef={mergeRef(inputDomRef, restProps.inputDomRef)}
      pattern={new RegExp(canNegative ? regexps.canNegativeRegexpString : regexps.decimalRegexpString)} // TODO: pattern should also accept function, so it can accept: (v, oldV)=> v.length < oldV.length
      value={innerValue ? toString(innerValue) : ''}
      defaultValue={toString(defaultValue)}
      onUserInput={(v) => {
        if (isNumberish(v)) {
          setInnerValue(v)
          restProps.onUserInput?.(v, { canSafelyCovertToNumber: canSafelyCovertToNumber(v) })
        }
      }}
      onDangerousValueChange={(inputContect, el) => {
        restProps.onDangerousValueChange?.(inputContect, el)
        const isValid = el.checkValidity()
        if (isValid) onValid?.()
        if (!isValid) onInvalid?.()
      }}
    />
  )
}

function canSafelyCovertToNumber(v: string): boolean {
  return Number(v) < Number.MAX_SAFE_INTEGER && Number(v) > Number.MIN_SAFE_INTEGER
}
