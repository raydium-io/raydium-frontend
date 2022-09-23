import { debounce, DebounceOptions } from '@/functions/debounce'
import { AnyFn } from '@/types/constants'
import { useMemo, useRef } from 'react'
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect '

export function useDebounce<T extends AnyFn>(fn: T, options?: { debouncedOptions?: DebounceOptions }): T {
  const fnCoreRef = useRef<T>()
  useIsomorphicLayoutEffect(() => {
    fnCoreRef.current = fn
  })

  const wrappedFn = useMemo(
    () => debounce((...args: any[]) => fnCoreRef.current?.(...args), options?.debouncedOptions),
    []
  )

  // @ts-expect-error froce
  return wrappedFn
}
