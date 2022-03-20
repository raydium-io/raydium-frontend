import { useRef } from 'react'

/**just for debug. may not use this  */
export default function useDebugWatchMayCauseRerenderValue<T>(
  watchedValue: T,
  valueIsDifferent?: (prev: T, next: T) => void
) {
  const prev = useRef(watchedValue)
  if (prev.current !== watchedValue) {
    valueIsDifferent?.(prev.current, watchedValue)
    prev.current = watchedValue
  }
}
