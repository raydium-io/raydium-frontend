import { useRef } from 'react'
import { useEffect, useState } from 'react'

/**
 * you can use returned count state and Array.slice to render items less fuzzy
 *
 * to avoid render too much data at same frame
 *
 * if new data's elements are already on the screen, no need to update another
 */
export default function useRenderLoopCounter(
  instreamData: any[],
  options?: {
    /** @default 50ms */
    eachDuration?: number

    /** @default 40 render 40 items each frame */
    step?: number
  }
) {
  const prevData = useRef<any[]>()
  const [currentItemCount, setCurrentItemCount] = useState(0)
  const prevEffectTimeoutId = useRef<NodeJS.Timeout>()
  useEffect(() => {
    if (instreamData.every((item) => prevData.current?.includes(item))) {
      // (elements are already on the screen, no need to update another)
      return
    } else {
      prevData.current = instreamData
      if (prevEffectTimeoutId.current) clearInterval(prevEffectTimeoutId.current)
      setCurrentItemCount(0)
      const maxCount = instreamData.length
      const timeId = setInterval(() => {
        setCurrentItemCount((n) => {
          if (n >= maxCount) {
            clearInterval(timeId)
            return maxCount
          } else {
            return n + (options?.step ?? 20)
          }
        })
      }, options?.eachDuration ?? 50)
      prevEffectTimeoutId.current = timeId
    }
  }, [instreamData])
  return { currentItemCount }
}
