import useAppSettings from '@/application/appSettings/useAppSettings'
import React from 'react'
import { twMerge } from 'tailwind-merge'
import Row from './Row'

export function Badge(props: {
  className?: string
  children: React.ReactNode
  cssColor?: string
  noOutline?: boolean
  /** default: outline */
  type?: 'solid' | 'outline'
  /** default 'md' */
  size?: 'md' | 'sm'
}) {
  const isMobile = useAppSettings((s) => s.isMobile)
  const defaultSize = props.size ?? (isMobile ? 'sm' : 'md')
  return (
    <Row
      className={twMerge(
        `text-center items-center ${defaultSize === 'sm' ? 'px-1 text-2xs' : 'px-2 text-xs'} ${
          props.type === 'solid'
            ? 'bg-current text-white'
            : `${props.noOutline ? '' : defaultSize === 'sm' ? 'border' : 'border-1.5'} border-current`
        } rounded-full capitalize`,
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
