import { useCallback } from 'react'

import { getLocalItem, setLocalItem } from '@/functions/dom/jStorage'
import { MayFunction } from '@/types/constants'

import useXState from './useXState'

/** auto json stringify and json parse */
export default function useLocalStorageItem<T>(
  key: string
): [state: T | undefined, setState: (value: MayFunction<T, [old: T | undefined]>) => void] {
  const [xStoredValue, setXStoredValue] = useXState<T | undefined>(
    `(localStorage)${key}`,
    () => getLocalItem(key) as any
  )
  const setValue = useCallback((value: MayFunction<T, [old: T | undefined]>) => {
    setXStoredValue(value)
    if (value) setLocalItem(key, value)
  }, [])

  return [xStoredValue, setValue]
}
