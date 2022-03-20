import React, { isValidElement, ReactElement, ReactNode } from 'react'

import { MayArray } from '@/types/generics'

/**
 * better type than React.Children.map
 */
export default function mapChildren(
  children: MayArray<ReactNode>,
  mapper: (child: ReactElement, index: number) => ReactNode
): JSX.Element {
  // @ts-expect-error type has wrong infer, so I force it
  return React.Children.map([children].flat(), (child, idx) => (isValidElement(child) ? mapper(child, idx) : child))
}
