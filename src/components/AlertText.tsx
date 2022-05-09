import React, { ReactNode } from 'react'

import Icon, { IconProps } from '@/components/Icon'
import Row from '@/components/Row'

/**
 * component type: styled UI component
 */
export default function AlertText({
  children,
  className,
  iconSize
}: {
  children?: ReactNode
  className?: string
  iconSize?: IconProps['size']
}) {
  return (
    <Row type="grid-x" className={`AlertText gap-2 items-center ${className}`}>
      <Icon className="flex-shrink-0" size={iconSize} heroIconName="exclamation-circle" />
      <div>{children}</div>
    </Row>
  )
}
