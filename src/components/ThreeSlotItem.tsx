import React, { MouseEvent, ReactNode } from 'react'
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
  onClick?(ev: MouseEvent): void
}) {
  return (
    <Row className={twMerge('items-center', className)} onClick={onClick}>
      {prefix}
      <div className={twMerge('grow text-sm whitespace-nowrap', textClassName)}>{text}</div>
      {suffix}
    </Row>
  )
}
