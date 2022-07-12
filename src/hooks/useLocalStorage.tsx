import { useCallback, useImperativeHandle } from 'react'

import { getLocalItem, setLocalItem } from '@/functions/dom/jStorage'
import { MayFunction } from '@/types/constants'

import useXState from './useXState'
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect '

/** auto json stringify and json parse */
export default function useLocalStorageItem<T>(
  key: string,
  options?: {
    defaultValue?: T
    validateFn?: (value: T | undefined) => boolean
  }
): [state: T | undefined, setState: (value: MayFunction<T, [old: T | undefined]>) => void] {
  const [xStoredValue, setXStoredValue] = useXState<T | undefined>(`${key}`, options?.defaultValue)
  useIsomorphicLayoutEffect(() => {
    const storedValue = getLocalItem(key)
    if (storedValue && (options?.validateFn?.(storedValue) ?? true)) {
      setXStoredValue(storedValue)
    }
  }, [])
  const setValue = useCallback((value: MayFunction<T, [old: T | undefined]>) => {
    setXStoredValue(value)
    if (value) setLocalItem(key, value)
  }, [])

  return [xStoredValue, setValue]
}
