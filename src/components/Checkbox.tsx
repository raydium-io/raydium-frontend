import React, { ReactNode } from 'react'

import { twMerge } from 'tailwind-merge'

import Icon from '@/components/Icon'
import useToggle from '@/hooks/useToggle'

import Row from './Row'

export function Checkbox({
  checkBoxSize = 'md',
  className,
  defaultChecked,
  onChange,
  label
}: {
  checkBoxSize?: 'sm' | 'md'
  className?: string
  defaultChecked?: boolean
  onChange?: (newChecked: boolean) => void
  label?: ReactNode
}) {
  const [innerChecked, { toggle }] = useToggle(defaultChecked, {
    onOn: () => onChange?.(true),
    onOff: () => onChange?.(false)
  })

  return label ? (
    <Row className={twMerge('items-center clickable no-clicable-transform-effect', className)} onClick={toggle}>
      <div className={twMerge('inline-block  p-[3px] ring-inset ring-1.5 ring-[rgba(171,196,255,.5)] rounded-md')}>
        <Icon heroIconName={innerChecked ? 'check' : ' '} size={checkBoxSize === 'sm' ? 'xs' : 'sm'} />
      </div>
      <div className={`ml-2 ${checkBoxSize === 'sm' ? 'text-sm' : 'text-xs'}`}>{label}</div>
    </Row>
  ) : (
    <div
      className={twMerge(
        'inline-block clickable no-clicable-transform-effect p-[3px] ring-inset ring-1.5 ring-[rgba(171,196,255,.5)] rounded-md',
        className
      )}
      onClick={toggle}
    >
      <Icon heroIconName={innerChecked ? 'check' : ' '} size="sm" />
    </div>
  )
}
