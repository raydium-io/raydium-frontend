import React, { useEffect, useRef } from 'react'

import { isNumberish } from '@/functions/judgers/dateType'
import { add, clamp, minus } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'
import mergeRef from '@/functions/react/mergeRef'
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect '
import { useSignalState } from '@/hooks/useSignalState'
import { Numberish } from '@/types/constants'

import Icon from './Icon'
import Input, { InputProps } from './Input'

type TriggerBy = 'user-input' | 'increase-decrease' | 'code-input'

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
  showPlusMinusControls?: boolean

  /**
   * only if type is decimal
   * @default  0
   */
  minN?: number
  maxN?: number
  step?: number

  /**
   * it will auto-valid each time when user input.
   * html will invoke this
   */
  onInvalid?: () => void
  onValid?: () => void

  /** default: false */
  canNegative?: boolean
  value?: Numberish
  defaultValue?: Numberish
  onUserInput?: (
    n: number | /* if value is too big */ string | undefined,
    payload: { canSafelyCovertToNumber: boolean; triggerBy: TriggerBy }
  ) => void
  skipAutoIncrease?: boolean
  skipAutoDecrease?: boolean
  increaseFn?: (currentValue: Numberish) => Numberish | undefined
  decreaseFn?: (currentValue: Numberish) => Numberish | undefined
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
  showPlusMinusControls,
  minN = 0,
  maxN,
  step = Number((1 / 10 ** Math.floor(decimalCount)).toFixed(decimalCount)),
  onInvalid,
  canNegative,
  onValid,
  skipAutoIncrease,
  skipAutoDecrease,
  increaseFn,
  decreaseFn,
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

  const userInput = (v: string, triggerBy: TriggerBy = 'user-input') => {
    if (isNumberish(v)) {
      setInnerValue(v)
      restProps.onUserInput?.(v, { canSafelyCovertToNumber: canSafelyCovertToNumber(v), triggerBy })
    }
  }

  /**@deprecated */
  const dangerousInput = (v: string) => {
    const el = inputDomRef.current
    if (!el) return
    restProps.onDangerousValueChange?.(v, el)
    const isValid = el.checkValidity()
    if (isValid) onValid?.()
    if (!isValid) onInvalid?.()
  }

  const increase = () => {
    const increasedValue = increaseFn?.(toString(innerValueSignal())) ?? add(toString(innerValueSignal()), step)
    const newN = clamp(minN, increasedValue, maxN)
    const newNString = toString(newN)
    userInput(newNString, 'increase-decrease')
    dangerousInput(newNString)
  }

  const decrease = () => {
    const decreasedValue = decreaseFn?.(toString(innerValueSignal())) ?? minus(toString(innerValueSignal()), step)
    const newN = clamp(minN, decreasedValue, maxN)
    const newNString = toString(newN)
    userInput(newNString, 'increase-decrease')
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
        step: step
      }}
      {...restProps}
      inputDomRef={mergeRef(inputDomRef, restProps.inputDomRef)}
      pattern={new RegExp(canNegative ? regexps.canNegativeRegexpString : regexps.decimalRegexpString)} // TODO: pattern should also accept function, so it can accept: (v, oldV)=> v.length < oldV.length
      value={innerValue ? toString(innerValue) : ''}
      defaultValue={toString(defaultValue)}
      onUserInput={(v) => {
        userInput(v)
      }}
      onBlur={(v) => {
        if (minN || maxN) userInput(toString(clamp(minN, String(v), maxN)))
      }}
      onDangerousValueChange={(v) => {
        dangerousInput(v)
      }}
      prefix={
        showPlusMinusControls ? (
          <Icon className="text-light-blue clickable" heroIconName="minus" size="xs" onClick={decrease} />
        ) : undefined
      }
      suffix={
        showArrowControls ? (
          <div>
            <Icon
              className="opacity-50 hover:opacity-100 clickable"
              heroIconName="chevron-up"
              size="xs"
              onClick={increase}
              canLongClick
            />
            <Icon
              className="opacity-50 hover:opacity-100 clickable"
              heroIconName="chevron-down"
              size="xs"
              onClick={decrease}
              canLongClick
            />
          </div>
        ) : showPlusMinusControls ? (
          <Icon className="text-light-blue clickable" heroIconName="plus" size="xs" onClick={increase} />
        ) : undefined
      }
    />
  )
}

function canSafelyCovertToNumber(v: string): boolean {
  return Number(v) < Number.MAX_SAFE_INTEGER && Number(v) > Number.MIN_SAFE_INTEGER
}
