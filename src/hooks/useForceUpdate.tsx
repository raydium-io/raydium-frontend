import { useCallback, useEffect, useState } from 'react'

/** refresh this component every 1000ms (by default) */
export function useForceUpdate({ loop }: { loop?: number } = {}): [updateCount: number, forceUpdate: () => void] {
  const [forceUpdateCount, setForceUpdateCount] = useState(0)

  const forceUpdate = useCallback(() => setForceUpdateCount((n) => n + 1), [])

  // interval
  useEffect(() => {
    if (!loop) return
    const id = globalThis.setInterval(forceUpdate, loop)
    return () => globalThis.clearInterval(id)
  }, [])

  return [forceUpdateCount, forceUpdate]
}
