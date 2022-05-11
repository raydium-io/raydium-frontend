import { gt } from '@/functions/numberish/compare'
import { abs, sub } from '@/functions/numberish/operations'
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
  /* if newValue - oldValue is between floatingValue, input will not update */
  floating?: Numberish
}

/** let <Input> be a independent  component, it for consistency, as <Button> and <Icon> and <Link> etc is independent */
export default function DecimalInput({
  defaultValue,
  value,
  floating,

  typeDecimalDecimalCount = 3,
  typeDecimalMinValue = 0,
  onInvalid,
  onValid,
  ...restProps
}: DecimalInputProps) {
  const [innerValue, setInnerValue] = useState(defaultValue)
  useIsomorphicLayoutEffect(() => {
    if (floating && value && innerValue) {
      const diff = abs(sub(value, innerValue))
      if (gt(diff, floating)) setInnerValue(value)
    } else {
      setInnerValue(value)
    }
  }, [value])
  return (
    <Input
      type="decimal"
      labelText="input for searching coins"
      inputHTMLProps={{
        pattern: `^[0-9]*[.,]?[0-9]{0,${typeDecimalDecimalCount}}$`,
        inputMode: 'decimal',
        min: String(typeDecimalMinValue)
      }}
      {...restProps}
      value={toString(innerValue)}
      defaultValue={toString(defaultValue)}
      onDangerousValueChange={(inputContect, el) => {
        restProps.onDangerousValueChange?.(inputContect, el)
        const isValid = el.checkValidity()
        if (isValid) onValid?.()
        if (!isValid) onInvalid?.()
      }}
    />
  )
}
