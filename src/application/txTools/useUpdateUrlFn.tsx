import { throttle } from '@/functions/debounce'
import { useRouter } from 'next/router'
import { useCallback } from 'react'

export default function useUpdateUrlFn() {
  const { replace } = useRouter()
  const throttledUpdateUrl = useCallback(
    throttle(
      (pathname: string, query: Record<string, any>) => {
        replace({ pathname, query }, undefined, { shallow: true })
      },
      { delay: 100 }
    ),
    []
  )
  return throttledUpdateUrl
}
