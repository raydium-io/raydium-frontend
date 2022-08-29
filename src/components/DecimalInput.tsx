import { isNumberish } from '@/functions/judgers/dateType'
import { padZero } from '@/functions/numberish/handleZero'
import { add, getMin, clamp, minus } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'
import mergeRef from '@/functions/react/mergeRef'
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect '
import { useSignalState } from '@/hooks/useSignalState'
import { Numberish } from '@/types/constants'
import React, { useEffect, useRef, useState } from 'react'
import Icon from './Icon'

import Input, { InputProps } from './Input'

export interface DecimalInputProps extends Omit<InputProps, 'value' | 'defaultValue' | 'onUserInput'> {
  /**
   * only if type is decimal
   * it will also affact <input>'s step
   * @default  3
   */
  // also stepN
  decimalCount?: number
  // TODO: onlyInt?: boolean
  // TODO: mustAboveZero?: boolean

  showArrowControls?: boolean

  /**
   * only if type is decimal
   * @default  0
   */
  minN?: number
  maxN?: number

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
  showArrowControls,
  minN = 0,
  maxN,
  onInvalid,
  canNegative,
  onValid,
  ...restProps
}: DecimalInputProps) {
  const [innerValue, setInnerValue, innerValueSignal] = useSignalState(defaultValue)
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
        const isControlKey = ev.ctrlKey || ev.altKey
        if (!isPureDecimal && !isControlKey) {
          ev.preventDefault()
        }
      },
      { capture: true, passive: false }
    )
  }, [])

  const userInput = (v: string) => {
    if (isNumberish(v)) {
      setInnerValue(v)
      restProps.onUserInput?.(v, { canSafelyCovertToNumber: canSafelyCovertToNumber(v) })
    }
  }

  const dangerousInput = (v: string) => {
    const el = inputDomRef.current
    if (!el) return
    restProps.onDangerousValueChange?.(v, el)
    const isValid = el.checkValidity()
    if (isValid) onValid?.()
    if (!isValid) onInvalid?.()
  }

  const stepS = (1 / 10 ** Math.floor(decimalCount)).toFixed(decimalCount)

  const increase = (step = stepS) => {
    const newN = clamp(minN, add(toString(innerValueSignal()), step), maxN)
    const newNString = toString(newN)
    userInput(newNString)
    dangerousInput(newNString)
  }

  const decrease = (step = stepS) => {
    const newN = clamp(minN, minus(toString(innerValueSignal()), step), maxN)
    const newNString = toString(newN)
    userInput(newNString)
    dangerousInput(newNString)
  }

  return (
    <Input
      type="number"
      inputHTMLProps={{
        pattern: canNegative ? regexps.canNegativeRegexpString : regexps.decimalRegexpString,
        inputMode: 'decimal',
        min: String(minN),
        max: maxN ? String(maxN) : undefined,
        step: stepS
      }}
      {...restProps}
      inputDomRef={mergeRef(inputDomRef, restProps.inputDomRef)}
      pattern={new RegExp(canNegative ? regexps.canNegativeRegexpString : regexps.decimalRegexpString)} // TODO: pattern should also accept function, so it can accept: (v, oldV)=> v.length < oldV.length
      value={innerValue ? toString(innerValue) : ''}
      defaultValue={toString(defaultValue)}
      onUserInput={(v) => {
        userInput(v)
      }}
      onDangerousValueChange={(v) => {
        dangerousInput(v)
      }}
      suffix={
        showArrowControls ? (
          <div>
            <Icon
              className="opacity-50 hover:opacity-100 clickable"
              heroIconName="chevron-up"
              size="xs"
              onClick={() => {
                increase()
              }}
              canLongClick
            />
            <Icon
              className="opacity-50 hover:opacity-100 clickable"
              heroIconName="chevron-down"
              size="xs"
              onClick={() => {
                decrease()
              }}
              canLongClick
            />
          </div>
        ) : undefined
      }
    />
  )
}

function canSafelyCovertToNumber(v: string): boolean {
  return Number(v) < Number.MAX_SAFE_INTEGER && Number(v) > Number.MIN_SAFE_INTEGER
}
