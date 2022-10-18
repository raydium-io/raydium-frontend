import { useRecordedEffect } from '@/hooks/useRecordedEffect'
import { isNullish } from '@/functions/judgers/nil'
import { isArray, isEmtyObject } from '@/functions/judgers/dateType'
import { areShallowEqual } from '@/functions/judgers/areEqual'

/** can't judege which is newer is firstTime, U counld set conflictMasterSide, ('auto' will respect larger one) */
export default function useTwoStateSyncer<T>({
  disabled,
  state1,
  onState2Changed,
  state2,
  onState1Changed,
  conflictMasterSide = 'state1'
}: {
  disabled?: boolean
  state1: T | undefined
  onState2Changed?: (pairValue: T | undefined) => void
  state2: T | undefined
  onState1Changed?: (pairValue: T | undefined) => void
  conflictMasterSide?: 'state1' | 'state2'
}) {
  useRecordedEffect(
    ([prevState1, prevState2]) => {
      if (disabled) return
      if (areShallowEqual(state1, state2)) return

      const canInitlySync =
        isNullish(prevState1) && isNullish(prevState2) && (!isEmtyValue(state1) || !isEmtyValue(state2))
      const state2HasChanged = state1 === prevState1 && !isEmtyValue(state2) && state2 !== prevState2
      const state1HasChanged = state2 === prevState2 && !isEmtyValue(state1) && state1 !== prevState1
      const bothHasChanged = state1 !== prevState1 && state2 !== prevState2

      const shouldUpdateState1 =
        state2HasChanged ||
        (bothHasChanged && conflictMasterSide === 'state2') ||
        (canInitlySync && conflictMasterSide === 'state2')
      const shouldUpdateState2 =
        state1HasChanged ||
        (bothHasChanged && conflictMasterSide === 'state1') ||
        (canInitlySync && conflictMasterSide === 'state1')

      shouldUpdateState1 && onState2Changed?.(state2)
      shouldUpdateState2 && onState1Changed?.(state1)
    },
    [state1, state2]
  )
}

function isEmtyValue(obj: any): boolean {
  return isEmtyObject(obj) || isArray(obj) || isNullish(obj)
}
