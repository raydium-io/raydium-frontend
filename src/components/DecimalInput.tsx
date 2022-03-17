import React from 'react'

import Input, { InputProps } from './Input'

interface DecimalInputProps extends InputProps {
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
}

/** let <Input> be a independent  component, it for consistency, as <Button> and <Icon> and <Link> etc is independent */
export default function DecimalInput({
  typeDecimalDecimalCount = 3,
  typeDecimalMinValue = 0,
  onInvalid,
  onValid,
  ...restProps
}: DecimalInputProps) {
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
      onDangerousValueChange={(inputContect, el) => {
        restProps.onDangerousValueChange?.(inputContect, el)
        const isValid = el.checkValidity()
        if (isValid) onValid?.()
        if (!isValid) onInvalid?.()
      }}
    />
  )
}
