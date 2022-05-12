import { CSSProperties, ReactNode, RefObject, useRef } from 'react'
import { twMerge } from 'tailwind-merge'

import mergeRef from '@/functions/react/mergeRef'
import useClickableElement from '@/hooks/useClickableElement'

export interface CardProps {
  /** lg: rounded-3xl. md: rounded-md */
  size?: 'lg' | 'md'
  domRef?: RefObject<HTMLDivElement | HTMLElement>
  className?: string
  style?: CSSProperties
  htmlProps?: JSX.IntrinsicElements['div']
  onClick?: () => void
  children?: ReactNode
}

export default function Card({ size = 'md', domRef, children, style, onClick, className, htmlProps }: CardProps) {
  const clickRef = useRef<HTMLDivElement>(null)
  useClickableElement(clickRef, { onClick, disable: !onClick })
  return (
    <div
      {...htmlProps}
      className={twMerge(`Card ${size === 'lg' ? 'rounded-3xl' : 'rounded-xl'} ${className ?? ''}`)}
      ref={mergeRef(domRef as RefObject<HTMLDivElement>, clickRef)}
      style={style}
    >
      {children}
    </div>
  )
}
