import { useCallback, useImperativeHandle } from 'react'

import { getLocalItem, setLocalItem } from '@/functions/dom/jStorage'
import { MayFunction } from '@/types/constants'

import useXState from './useXState'
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect '

/** auto json stringify and json parse */
export default function useLocalStorageItem<T, E = T>(
  key: string,
  options?: {
    defaultValue?: T
    emptyValue?: E
    validateFn?: (value: T | undefined) => boolean
  }
): [state: T | E | undefined, setState: (value: MayFunction<T, [old: T | undefined]>) => void] {
  const { defaultValue, emptyValue = defaultValue, validateFn } = options ?? {}
  const [xStoredValue, setXStoredValue] = useXState<T | undefined>(`${key}`, defaultValue)
  useIsomorphicLayoutEffect(() => {
    const storedValue = getLocalItem(key)
    if (validateFn?.(storedValue) ?? true) {
      setXStoredValue(storedValue ?? emptyValue)
    }
  }, [])
  const setValue = useCallback((value: MayFunction<T, [old: T | undefined]>) => {
    setXStoredValue(value)
    if (value) setLocalItem(key, value)
  }, [])

  return [xStoredValue, setValue]
}
