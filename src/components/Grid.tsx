import mergeRef from '@/functions/react/mergeRef'
import { CSSProperties, ReactNode, RefObject, useRef } from 'react'
import { twMerge } from 'tailwind-merge'

export interface GridProps {
  className?: string
  children?: ReactNode
  style?: CSSProperties
  domRef?: RefObject<HTMLDivElement | HTMLElement>
  onClick?: (ev: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
}

/**
 * actually, it's just a `<div>` with grid
 */
export default function Grid({ className, children, style, domRef, onClick }: GridProps) {
  const ref = useRef<HTMLDivElement>()
  return (
    <div
      ref={mergeRef(domRef, ref) as RefObject<HTMLDivElement>}
      className={twMerge('grid', className)}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
