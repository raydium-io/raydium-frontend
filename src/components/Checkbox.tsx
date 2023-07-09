import React, { ReactNode, useEffect } from 'react'

import { twMerge } from 'tailwind-merge'

import Icon from '@/components/Icon'
import useToggle from '@/hooks/useToggle'

import Row from './Row'

/**
 * it is both
 */
export function Checkbox({
  checked,
  checkBoxSize = 'md',
  className,
  defaultChecked,
  disabled,

  wrapperClassName,
  checkIconClassName,
  labelTextClassName,
  onChange,
  label
}: {
  checked?: boolean
  checkBoxSize?: 'sm' | 'md'
  className?: string
  defaultChecked?: boolean
  disabled?: boolean
  onChange?: (newChecked: boolean) => void

  wrapperClassName?: string
  checkIconClassName?: string
  labelTextClassName?: string
  label?: ReactNode
}) {
  const [innerChecked, { toggle, set, off, on }] = useToggle(defaultChecked, {
    onOn: () => onChange?.(true),
    onOff: () => onChange?.(false)
  })
  useEffect(() => {
    if (checked != null) set(checked)
  }, [checked])

  return label ? (
    <Row
      className={twMerge(
        'items-center clickable no-clicable-transform-effect',
        disabled && 'opacity-50 not-clickable-with-disallowed',
        className
      )}
      onClick={() => {
        if (!disabled) {
          toggle()
        }
      }}
    >
      <div
        className={twMerge(
          `inline-block p-[3px] ring-inset ring-1.5 ring-[rgba(171,196,255,.5)] rounded-md`,
          wrapperClassName
        )}
      >
        <Icon
          className={checkIconClassName}
          heroIconName={innerChecked ? 'check' : ' '}
          size={checkBoxSize === 'sm' ? 'xs' : 'sm'}
        />
      </div>
      <div className={twMerge(`ml-2 ${checkBoxSize === 'sm' ? 'text-sm' : 'text-xs'}`, labelTextClassName)}>
        {label}
      </div>
    </Row>
  ) : (
    <div
      className={twMerge(
        'inline-block clickable no-clicable-transform-effect p-[3px] ring-inset ring-1.5 ring-[rgba(171,196,255,.5)] rounded-md',
        disabled && 'opacity-50 not-clickable-with-disallowed',
        className
      )}
      onClick={() => {
        if (!disabled) {
          toggle()
        }
      }}
    >
      <Icon heroIconName={innerChecked ? 'check' : ' '} size="sm" />
    </div>
  )
}
