import React, { ReactNode, useRef, useState } from 'react'

import { twMerge } from 'tailwind-merge'

import useAppSettings from '@/application/appSettings/useAppSettings'
import { useHover } from '@/hooks/useHover'

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
  onClick?: () => void
  /** usually, it appear with onClick */
  hoverChildren?: ReactNode
}) {
  const isMobile = useAppSettings((s) => s.isMobile)
  const defaultSize = props.size ?? (isMobile ? 'sm' : 'md')
  return (
    <Row
      className={twMerge(
        `relative group text-center items-center ${defaultSize === 'sm' ? 'px-1 text-2xs' : 'px-2 text-xs'} ${
          props.type === 'solid'
            ? 'bg-current text-white'
            : `${props.noOutline ? '' : defaultSize === 'sm' ? 'border' : 'border-1.5'} border-current`
        } rounded-full capitalize`,
        props.className
      )}
      style={{
        color: props.cssColor ?? '#5ac4be'
      }}
      onClick={props.onClick}
    >
      {props.hoverChildren && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-300">
          {props.hoverChildren}
        </div>
      )}
      <div className={props.hoverChildren ? 'group-hover:opacity-0 transition duration-300' : undefined}>
        {props.children}
      </div>
    </Row>
  )
}
