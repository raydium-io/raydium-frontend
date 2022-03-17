import { useEffect } from 'react'

import { isFunction } from '@/functions/judgers/dateType'

export default function useAsyncEffect<V>(asyncEffect: () => Promise<V>, dependenceList?: any[]): void
export default function useAsyncEffect<V>(
  asyncEffect: () => Promise<V>,
  cleanFunction: () => any,
  dependenceList?: any[]
): void

export default function useAsyncEffect<V>(asyncEffect: () => Promise<V>, param2?: any, param3?: any): void {
  const cleanFunction = isFunction(param2) ? param2 : undefined
  const dependenceList = isFunction(param2) ? param3 : param2
  useEffect(() => {
    asyncEffect()
    return cleanFunction
  }, dependenceList)
}
