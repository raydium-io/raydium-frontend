import { useEffect } from 'react'

import { inServer } from '@/functions/judgers/isSSR'
import useToggle from '@/hooks/useToggle'

export function useDocumentVisibility(): { documentVisible: boolean } {
  const [visible, { on, off }] = useToggle(true)
  useEffect(() => {
    if (inServer) return
    const handleVisibilityChange = () => {
      const visibilityState = document.visibilityState
      if (visibilityState === 'visible') {
        on()
      }
      if (visibilityState === 'hidden') {
        off()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true })
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])
  return { documentVisible: visible }
}
