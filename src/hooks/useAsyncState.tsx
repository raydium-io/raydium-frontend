import { useEffect, useRef } from 'react'

import { shrinkToValue } from '@/functions/shrinkToValue'
import { MayFunction, MayPromise } from '@/types/constants'

import useThenableSetState from './useThenableSetState'

type AsyncDispatch<Value> = MayFunction<MayPromise<Value>, [Value]>

/**
 *  !! haven't tested
 *
 * (async state have abort system )
 * @example
 * // state will first 1, then 2, then 5
 * const [asyncState, setAsyncState] = useAsyncState(Promise.resolve(2), 1)
 * useEffect(() => {
 *   globalThis.setTimeout(() => {
 *     setAsyncState(async (oldAsyncState) => await Promise.resolve(5))
 *   }, 1000)
 * }, [])
 */
export default function useAsyncState<V>(
  asyncGetValue: MayFunction<MayPromise<V>, [undefined]>
): [asyncState: V | undefined, setAsyncState: (asyncDispatch: AsyncDispatch<V>) => Promise<V>]
export default function useAsyncState<V, F>(
  asyncGetValue: MayFunction<MayPromise<V>, [defaultValue: F]>,
  defaultValue: MayFunction<F>
): [asyncState: V | F, setAsyncState: (asyncDispatch: AsyncDispatch<V>) => Promise<V>]

export default function useAsyncState(
  asyncGetValue: MayFunction<MayPromise<unknown>, [defaultValue: unknown]>,
  defaultValue?: MayFunction<unknown>
): [asyncState: unknown, setAsyncState: (asyncDispatch: AsyncDispatch<unknown>) => Promise<unknown>] {
  const [valueState, setValueState] = useThenableSetState<unknown>(defaultValue)

  const activeAsyncSetterNumber = useRef(0)
  const asyncSetterNumber = useRef(0)

  async function setAsyncState(asyncDispatch: AsyncDispatch<unknown>) {
    // update async setter number
    const actionNumber = asyncSetterNumber.current
    asyncSetterNumber.current += 1
    activeAsyncSetterNumber.current = actionNumber

    const syncValue = await shrinkToValue(asyncDispatch, [valueState])

    if (actionNumber == activeAsyncSetterNumber.current) {
      return setValueState(syncValue)
    } else {
      // there is a newer setAsyncState occur
      return undefined
    }
  }

  useEffect(() => {
    setAsyncState(asyncGetValue)
  }, [])

  return [valueState, setAsyncState]
}
