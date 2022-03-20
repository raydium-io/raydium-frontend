import mergeRef from '@/functions/react/mergeRef'
import { useHover, UseHoverOptions } from '@/hooks/useHover'
import { CSSProperties, ReactNode, RefObject, useRef } from 'react'

import { twMerge } from 'tailwind-merge'

export interface RowProps {
  type?: 'flex' | 'grid' | 'grid-x'
  className?: string
  children?: ReactNode
  style?: CSSProperties
  domRef?: RefObject<HTMLDivElement | HTMLElement>
  onClick?: (ev: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
  onHoverChange?: UseHoverOptions['onHover']
  htmlPorps?: JSX.IntrinsicElements['div']
}

/**
 * actually, it's just a `<div>` with flex
 */
export default function Row({
  type = 'flex',
  className,
  children,
  style,
  domRef,
  htmlPorps,
  onClick,
  onHoverChange
}: RowProps) {
  const classNameForDisplay = { flex: 'flex', grid: 'grid', 'grid-x': 'grid grid-flow-col' }[type]
  const ref = useRef<HTMLDivElement>(null)
  useHover(ref, { disable: !onHoverChange, onHover: onHoverChange })
  return (
    <div
      ref={mergeRef(ref, domRef)}
      className={twMerge(`Row ${classNameForDisplay} ${className ?? ''}`)}
      style={style}
      onClick={onClick}
      {...htmlPorps}
    >
      {children}
    </div>
  )
}
