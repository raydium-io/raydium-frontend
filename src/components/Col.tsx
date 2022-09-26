import { CSSProperties, ReactNode, RefObject, useRef } from 'react'
import { twMerge } from 'tailwind-merge'

import mergeRef from '@/functions/react/mergeRef'

export interface ColProps {
  className?: string
  children?: ReactNode
  style?: CSSProperties
  domRef?: RefObject<HTMLDivElement | HTMLElement>
  onClick?: (ev: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
}

/**
 * actually, it's just a `<div>` with flex
 */
export default function Col({ className, children, style, domRef, onClick }: ColProps) {
  const ref = useRef<HTMLDivElement>()
  return (
    <div
      ref={mergeRef(domRef, ref) as RefObject<HTMLDivElement>}
      className={twMerge(`Col flex flex-col ${className ?? ''}`)}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
