import { debounce, DebounceOptions, throttle, ThrottleOptions } from '@/functions/debounce'
import { AnyFn } from '@/types/constants'
import { useMemo, useRef } from 'react'
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect'

export function useDebounce<T extends AnyFn>(fn: T, options?: { debouncedOptions?: DebounceOptions }): T {
  const fnCoreRef = useRef<T>()
  const cleanFnRef = useRef<() => void>()

  useIsomorphicLayoutEffect(() => {
    fnCoreRef.current = fn
  })

  const wrappedFn = useMemo(
    () =>
      debounce((...args: any[]) => {
        cleanFnRef.current?.()
        const newCleanFn = fnCoreRef.current?.(...args)
        cleanFnRef.current = newCleanFn
      }, options?.debouncedOptions),
    []
  )

  // @ts-expect-error froce
  return wrappedFn
}
export function useThrottle<T extends AnyFn>(fn: T, options?: { throttleOption?: ThrottleOptions }): T {
  const fnCoreRef = useRef<T>()
  const cleanFnRef = useRef<() => void>()

  useIsomorphicLayoutEffect(() => {
    fnCoreRef.current = fn
  })

  const wrappedFn = useMemo(
    () =>
      throttle((...args: any[]) => {
        cleanFnRef.current?.()
        const newCleanFn = fnCoreRef.current?.(...args)
        cleanFnRef.current = newCleanFn
      }, options?.throttleOption),
    []
  )

  // @ts-expect-error froce
  return wrappedFn
}
