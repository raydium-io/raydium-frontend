import { useForceUpdate } from './useForceUpdate'
import { mergeFunction } from '@/functions/merge'
import useCallbackRef, { UseCallbackRefOptions } from './useCallbackRef'

export function useForceUpdatedRef<T = unknown>(options?: UseCallbackRefOptions<T>) {
  const [, forceUpdate] = useForceUpdate()
  const ref = useCallbackRef<T>({
    ...options,
    onAttach: mergeFunction(forceUpdate, options?.onAttach)
  })
  return ref
}
