import { ReactNode } from 'react'
import InputBox from './InputBox'
import Select, { SelectProps } from './Select'

/**
 * styled component
 */
export default function SelectBox<T extends string>({
  inputBoxClassName,
  label,
  disabled,
  ...restProps
}: Omit<SelectProps<T>, 'suffix'> & { label?: ReactNode; inputBoxClassName?: string }) {
  return (
    <InputBox
      className={inputBoxClassName}
      label={label}
      disabled={disabled}
      renderInput={(inputRef) => (
        <Select
          {...restProps}
          disabled={disabled}
          faceClassName="px-3"
          dropDownOpenedClassName={({ open }) => (open ? 'bg-[#141041]' : '')}
        />
      )}
    />
  )
}
