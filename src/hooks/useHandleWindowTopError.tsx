import { useEffect } from 'react'

import useNotification from '@/application/notification/useNotification'

export default function useHandleWindowTopError() {
  const { log } = useNotification.getState()
  useEffect(() => {
    const handleError = (event: ErrorEvent): void => {
      log({ type: 'error', title: String(event.error) })
      console.error(event)
      event.preventDefault()
      event.stopPropagation()
    }
    const handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
      log({ type: 'error', title: String(event.reason) })
      console.error(event)
      event.preventDefault()
      event.stopPropagation()
    }
    globalThis.addEventListener?.('error', handleError)
    globalThis.addEventListener?.('unhandledrejection', handleUnhandledRejection)
    return () => {
      globalThis.removeEventListener?.('error', handleError)
      globalThis.removeEventListener?.('unhandledrejection', handleUnhandledRejection)
    }
  }, [])
}
