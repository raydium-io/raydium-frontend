import { useCallback, useMemo, useRef, useState } from 'react'
/**
 * it too widely use that there should be a hook
 * @param enums
 */
export default function useEnums<T extends string[]>(
  ...initEnums: T
): [
  T[number],
  {
    untick: () => void
    tick: () => void
    set: (b: T[number]) => void
    getEnums: () => T
  }
] {
  const enums = useRef(initEnums)
  const [currentIndex, setcurrentIndex] = useState(0)
  const set = (targetEnum: T[number]) => {
    const idx = enums.current.findIndex((item) => item === targetEnum)
    if (idx === -1) return
    setcurrentIndex(idx)
  }
  const tick = useCallback(() => setcurrentIndex((currentIndex) => (currentIndex + 1) % enums.current.length), [])
  const untick = useCallback(
    () => setcurrentIndex((currentIndex) => (enums.current.length + (currentIndex - 1)) % enums.current.length),
    []
  )
  const getEnums = () => enums.current
  const controller = useMemo(
    () => ({
      tick,
      untick,
      set,
      getEnums
    }),
    [tick, untick, set, getEnums]
  )
  return [enums.current[currentIndex], controller]
}
