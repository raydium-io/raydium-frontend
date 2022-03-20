import React from 'react'
import { twMerge } from 'tailwind-merge'
import Row from './Row'

export function Badge(props: {
  className?: string
  children: React.ReactNode
  cssColor?: string
  noOutline?: boolean
  /** default 'md' */
  size?: 'md' | 'sm'
}) {
  return (
    <Row
      className={twMerge(
        `self-center text-center items-center ml-2 ${props.size === 'sm' ? 'px-1 text-2xs' : 'px-2 text-xs'} ${
          props.noOutline ? '' : props.size === 'sm' ? 'border-1.5' : 'border-2'
        } border-current rounded-full`,
        props.className
      )}
      style={{
        color: props.cssColor ?? '#5ac4be'
      }}
    >
      {props.children}
    </Row>
  )
}
