import { useMemo } from 'react'
import { twMerge } from 'tailwind-merge'

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
  size = 'lg',
  cssGradientRotate,
  ...restProps
}: CardProps & { haveMinHeight?: boolean; wrapperClassName?: string; cssGradientRotate?: number /* unit: deg */ }) {
  const borderRoundSize = useMemo(() => {
    if (restProps.style?.borderRadius) return `calc(${restProps.style.borderRadius} + ${paddingSize}px)`
    if (restProps.className?.includes('round-2xl')) return 16 + paddingSize
    if (size === 'md') return 6 + paddingSize
    return 20 + paddingSize // default size is lg
  }, [restProps.className, size, restProps.style?.borderRadius])
  return (
    <div
      ref={domRef as any}
      className={wrapperClassName}
      style={{
        //@ts-expect-error css variable
        ['--gradient-rotate']: cssGradientRotate != null ? `${cssGradientRotate}deg` : undefined,
        minHeight: haveMinHeight ? '300px' : undefined, // or style will be freak
        borderRadius: borderRoundSize,
        padding: paddingSize,
        backgroundImage: 'linear-gradient(var(--gradient-rotate, 246deg), #da2eef 7.97%, #2b6aff 49.17%, #39d0d8 92.1%)'
      }}
    >
      <Card {...restProps} size={size} className={twMerge('bg-cyberpunk-card-bg', restProps.className)}>
        {children}
      </Card>
    </div>
  )
}
