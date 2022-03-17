import { CSSProperties, ReactNode, RefObject, useRef } from 'react'
import { twMerge } from 'tailwind-merge'

import mergeRef from '@/functions/react/mergeRef'
import { useClick } from '@/hooks/useClick'

export interface ColProps {
  className?: string
  children?: ReactNode
  style?: CSSProperties
  domRef?: RefObject<HTMLDivElement | HTMLElement>
  onClick?: () => void
}

/**
 * actually, it's just a `<div>` with flex
 */
export default function Col({ className, children, style, domRef, onClick }: ColProps) {
  const ref = useRef<HTMLDivElement>()
  useClick(ref, { onClick, disable: !onClick })
  return (
    <div
      ref={mergeRef(domRef, ref) as RefObject<HTMLDivElement>}
      className={twMerge(`Col flex flex-col ${className ?? ''}`)}
      style={style}
    >
      {children}
    </div>
  )
}
