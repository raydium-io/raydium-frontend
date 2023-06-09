import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect '
import { ReactNode, useState } from 'react'

/**
 * handle promise value
 */
export function AsyncAwait<T>(props: {
  fallback?: ReactNode
  promise: T
  children?: (solvedValue: Awaited<T>) => ReactNode
}): JSX.Element {
  // TODO: what if promise solved is null?🤔
  const [innerValue, setInnerValue] = useState<Awaited<T> | null>(null)
  useIsomorphicLayoutEffect(() => {
    Promise.resolve(props.promise).then((value) => {
      setInnerValue(value)
    })
  }, [props.promise])
  return <>{innerValue === null ? props.fallback : props.children?.(innerValue)}</>
}
