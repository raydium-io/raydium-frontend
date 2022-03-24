import React, { ReactNode } from 'react'
import { twMerge } from 'tailwind-merge'
import Row from './Row'

export function ThreeSlotItem({
  className,

  text,
  suffix,
  prefix,
  onClick
}: {
  className?: string
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
      <div className="text-white text-sm whitespace-nowrap">{text}</div>
      {suffix}
    </Row>
  )
}
