import { isNumberish } from '@/functions/judgers/dateType'
import { mergeFunction } from '@/functions/merge'
import { gt } from '@/functions/numberish/compare'
import { abs, div, sub } from '@/functions/numberish/operations'
import { minus } from '@/functions/numberish/stringNumber'
import { toString } from '@/functions/numberish/toString'
import tryCatch from '@/functions/tryCatch'
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect '
import { Numberish } from '@/types/constants'
import React, { useState } from 'react'

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

  value?: Numberish
  defaultValue?: Numberish
  /**
   * if newValue - oldValue is between floatingValue, input will not update
   * if value is true, it will use default floatingValue:value/10000
   */
  valueFloating?: Numberish | boolean
  onUserInput?: (
    n: number | /* if value is too big */ string | undefined,
    payload: { canSafelyCovertToNumber: boolean }
  ) => void
}

/** let <Input> be a independent  component, it for consistency, as <Button> and <Icon> and <Link> etc is independent */
export default function DecimalInput({
  defaultValue,
  value,
  valueFloating,

  decimalCount = 3,
  minN = 0,
  maxN,
  onInvalid,
  onValid,
  ...restProps
}: DecimalInputProps) {
  const [innerValue, setInnerValue] = useState(defaultValue)
  useIsomorphicLayoutEffect(() => {
    if (valueFloating && value && innerValue) {
      const diff = abs(sub(value, innerValue))
      if (gt(diff, valueFloating === true ? div(innerValue, 10000) : valueFloating)) setInnerValue(value)
    } else {
      setInnerValue(value)
    }
  }, [value])
  return (
    <Input
      type="decimal"
      inputHTMLProps={{
        pattern: `^[0-9-]*[.,]?[0-9]{0,${decimalCount}}$`,
        inputMode: 'decimal',
        min: String(minN),
        max: maxN ? String(maxN) : undefined
      }}
      {...restProps}
      pattern={new RegExp(`^[0-9-]*[.,]?[0-9]{0,${decimalCount}}$`)}
      value={toString(innerValue)}
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
