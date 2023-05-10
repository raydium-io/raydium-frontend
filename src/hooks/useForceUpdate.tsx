import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDocumentVisibility } from './useDocumentVisibility'

/** refresh this component every 1000ms (by default) */
export function useForceUpdate({
  loop = 1000,
  disable,
  disableWhenDocumentInvisiable = true
}: {
  loop?: number
  disable?: boolean
  /** default don't when document is invisiable */
  disableWhenDocumentInvisiable?: boolean
} = {}): [updateCount: number, forceUpdate: () => void] {
  const { documentVisible } = useDocumentVisibility()
  const [forceUpdateCount, setForceUpdateCount] = useState(0)
  const forceUpdate = useCallback(() => setForceUpdateCount((n) => n + 1), [])
  const cacheTimer = useRef<NodeJS.Timer>()
  const canLooplyForceUpdate = useMemo(
    () => (disableWhenDocumentInvisiable ? documentVisible : true) && !disable,
    [disable, disableWhenDocumentInvisiable, documentVisible]
  )

  // interval
  useEffect(() => {
    if (!loop) return
    if (canLooplyForceUpdate) {
      const id = globalThis.setInterval(() => {
        forceUpdate()
      }, loop)
      cacheTimer.current = id
      return () => globalThis.clearInterval(id)
    } else {
      globalThis.clearInterval(cacheTimer.current)
    }
  }, [canLooplyForceUpdate])

  return [forceUpdateCount, forceUpdate]
}
