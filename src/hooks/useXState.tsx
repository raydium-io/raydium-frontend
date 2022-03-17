import create from 'zustand'

import { shrinkToValue } from '@/functions/shrinkToValue'
import { MayFunction } from '@/types/constants'

const cache = new Map<string, any>()

/**
 * it's interface is like build-in {@link useState()}.
 * but use subscribe/invoke system and ES6 map to have global state
 *
 * @requires zustand
 */
export default function useXState<T = undefined>(
  /** unique key in this app */
  key: string,
  defaultState?: MayFunction<T>
): [state: T, setState: (newState: MayFunction<T, [oldState: T]>) => void] {
  const useHooks = cache.has(key)
    ? cache.get(key)
    : (() => {
        const rawHooks = create<any>((set) => ({
          state: defaultState != null ? shrinkToValue(defaultState) : undefined,
          setState: (newState: MayFunction<T, [oldState: T]>) =>
            set((old) => ({ state: shrinkToValue(newState, [(old as any).state]) }))
        }))
        cache.set(key, rawHooks)
        return rawHooks
      })()
  const { state, setState } = useHooks()
  return [state, setState]
}

// TODO this convenient method is for debugging quickly
// export function getAllXState
