import { useRef, useState } from 'react'

import { shrinkToValue } from '@/functions/shrinkToValue'
import { MayFunction, MayPromise } from '@/types/constants'
import useAsyncEffect from './useAsyncEffect'

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
  fallbackValue: MayFunction<F>,
  dependenceList?: any[]
): V | F {
  const [valueState, setValueState] = useState<V | F>(fallbackValue)
  const effectCallbackIndex = useRef(0)

  useAsyncEffect(async () => {
    const thisEffectFlagNumber = effectCallbackIndex.current
    // update next loop's flag
    effectCallbackIndex.current = thisEffectFlagNumber + 1
    const syncValue = await shrinkToValue(asyncGetValue)
    const effectFlagIsStillFresh = effectCallbackIndex.current - 1 === thisEffectFlagNumber // maybe a newer calculate result is coming
    if (effectFlagIsStillFresh && syncValue !== undefined) {
      setValueState(syncValue)
    }
  }, dependenceList ?? [])

  return valueState
}
