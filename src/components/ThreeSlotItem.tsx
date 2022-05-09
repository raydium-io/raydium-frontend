import React, { ReactNode } from 'react'
import { twMerge } from 'tailwind-merge'
import Row from './Row'

export function ThreeSlotItem({
  className,
  textClassName,

  text,
  suffix,
  prefix,
  onClick
}: {
  className?: string
  textClassName?: string
  text: ReactNode
  suffix?: ReactNode
  prefix?: ReactNode
  onClick?(): void
}) {
  return (
    <Row
      className={twMerge('cursor-pointer clickable clickable-filter-effect items-center', className)}
      onClick={onClick}
    >
      {prefix}
      <div className={twMerge('text-white text-sm whitespace-nowrap', textClassName)}>{text}</div>
      {suffix}
    </Row>
  )
}
