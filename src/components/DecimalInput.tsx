import { mergeFunction } from '@/functions/merge'
import { gt } from '@/functions/numberish/compare'
import { abs, div, sub } from '@/functions/numberish/operations'
import { minus } from '@/functions/numberish/stringNumber'
import { toString } from '@/functions/numberish/toString'
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect '
import { Numberish } from '@/types/constants'
import React, { useState } from 'react'

import Input, { InputProps } from './Input'

export interface DecimalInputProps extends Omit<InputProps, 'value' | 'defaultValue'> {
  /**
   * only if type is decimal
   * @default  3
   */
  typeDecimalDecimalCount?: number
  /**
   * only if type is decimal
   * @default  0
   */
  typeDecimalMinValue?: number | string

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
}

/** let <Input> be a independent  component, it for consistency, as <Button> and <Icon> and <Link> etc is independent */
export default function DecimalInput({
  defaultValue,
  value,
  valueFloating,

  typeDecimalDecimalCount = 3,
  typeDecimalMinValue = 0,
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
        pattern: `^[0-9]*[.,]?[0-9]{0,${typeDecimalDecimalCount}}$`,
        inputMode: 'decimal',
        min: String(typeDecimalMinValue)
      }}
      {...restProps}
      value={toString(innerValue)}
      defaultValue={toString(defaultValue)}
      onUserInput={mergeFunction(setInnerValue, restProps.onUserInput)}
      onDangerousValueChange={(inputContect, el) => {
        restProps.onDangerousValueChange?.(inputContect, el)
        const isValid = el.checkValidity()
        if (isValid) onValid?.()
        if (!isValid) onInvalid?.()
      }}
    />
  )
}
