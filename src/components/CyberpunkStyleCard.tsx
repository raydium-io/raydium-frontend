import { useMemo } from 'react'

import Card, { CardProps } from './Card'

const paddingSize = 1

/**
 * only used in pools page and farm page
 */
export default function CyberpunkStyleCard({
  haveMinHeight,
  wrapperClassName,
  children,
  domRef,
  ...restProps
}: CardProps & { haveMinHeight?: boolean; wrapperClassName?: string }) {
  const borderRoundSize = useMemo(() => {
    if (restProps.style?.borderRadius) return `calc(${restProps.style.borderRadius} + ${paddingSize}px)`
    if (restProps.className?.includes('round-2xl')) return 16 + paddingSize
    if (restProps.size === 'lg') return 20 + paddingSize
    if (restProps.size === 'md') return 6 + paddingSize
  }, [restProps.className, restProps.size, restProps.style?.borderRadius])
  return (
    <div
      ref={domRef as any}
      className={wrapperClassName}
      style={{
        minHeight: haveMinHeight ? '300px' : undefined, // or style will be freak
        borderRadius: borderRoundSize,
        padding: paddingSize,
        backgroundImage: 'linear-gradient(246deg, #da2eef 7.97%, #2b6aff 49.17%, #39d0d8 92.1%)'
      }}
    >
      <Card {...restProps}>{children}</Card>
    </div>
  )
}
