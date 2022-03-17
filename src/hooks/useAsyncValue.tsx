import { useRef, useState } from 'react'

import { shrinkToValue } from '@/functions/shrinkToValue'
import { MayFunction, MayPromise } from '@/types/constants'

/**
 *
 * (async state have abort system )
 * @example
 * //  async function will cause React component update after it's end
 * const value = useAsynceValue(async () => await Promise.resolve(3))
 * return <div>{value}</div> //it will render nothing first, then will render 3.
 *
 *
 * const value = useAsynceValue(async () => await Promise.resolve(3), 5)
 * return <div>{value}</div> //it will render 5 first, then will render 3.
 */
export default function useAsyncValue<V, F = never>(
  asyncGetValue: MayFunction<MayPromise<V>>,
  fallbackValue?: undefined
): V | undefined
export default function useAsyncValue<V, F = never>(
  asyncGetValue: MayFunction<MayPromise<V>>,
  fallbackValue: MayFunction<F>
): V | F
export default function useAsyncValue<V, F = never>(
  asyncGetValue: MayFunction<MayPromise<V>>,
  fallbackValue?: MayFunction<F>
): V | F | undefined {
  const [valueState, setValueState] = useState(fallbackValue)
  const activeAsyncSetterNumber = useRef(0)
  const asyncSetterNumber = useRef(0)
  ;(async () => {
    // update async setter number
    const actionNumber = asyncSetterNumber.current
    asyncSetterNumber.current += 1
    activeAsyncSetterNumber.current = actionNumber

    const syncValue = await shrinkToValue(asyncGetValue)

    if (actionNumber == activeAsyncSetterNumber.current) {
      //@ts-expect-error force
      return setValueState(syncValue)
    } else {
      // it means: there should be a newer setAsyncState
      return undefined
    }
  })()
  return valueState
}
