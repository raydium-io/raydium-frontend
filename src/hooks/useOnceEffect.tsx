import { useEffect, useRef } from 'react'

/**
 * like useEffect
 * but will only run one time (whether run will depende on params:runed)
 */
export default function useOnceEffect(
  effectFn: (utils: { runed: () => void }) => ((...params: any) => void) | void,
  dependenceList: any[]
) {
  const hasInited = useRef(false)
  const runed = () => (hasInited.current = true)
  useEffect(() => {
    if (!hasInited.current) {
      return effectFn({ runed })
    }
  }, dependenceList)
}
