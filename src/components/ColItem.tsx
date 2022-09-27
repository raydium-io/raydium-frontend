import { MouseEvent, ReactNode } from 'react'
import { twMerge } from 'tailwind-merge'
import Col from './Col'

export function ColItem({
  className,
  textClassName,

  text,
  children,
  suffix,
  prefix,
  onClick
}: {
  className?: string
  textClassName?: string
  text?: ReactNode
  /** can also use props:text */
  children?: ReactNode
  suffix?: ReactNode
  prefix?: ReactNode
  onClick?(ev: MouseEvent): void
}) {
  return (
    <Col className={twMerge('text-sm whitespace-nowrap', className)} onClick={onClick}>
      {prefix}
      <div className={twMerge('grow', textClassName)}>{text ?? children}</div>
      {suffix}
    </Col>
  )
}
