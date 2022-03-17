import React, { ReactNode } from 'react'

import Icon from '@/components/Icon'
import Row from '@/components/Row'

/**
 * component type: styled UI component
 */
export default function AlertText({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <Row type="grid-x" className={`AlertText gap-4 ${className}`}>
      <Icon className="flex-shrink-0" heroIconName="exclamation-circle" />
      <div className="text-sm mobile:text-xs">{children}</div>
    </Row>
  )
}
