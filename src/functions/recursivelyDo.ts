import { MayFunction } from '@/types/generics'
import { shrinkToValue } from './shrinkToValue'

export function recursivelyDo<T>(
  assert: (payloads: { currentLoopCount: number /*  from zero */; prevPayload: T | undefined }) => T,
  {
    maxLoopCount = 4,
    stopWhen,
    currentLoopCount = 0,
    retrySpeed = 'normal',
    retryCD = ({ currentLoopCount }) => (retrySpeed === 'slow' ? 1000 : 500) * 2 ** currentLoopCount,

    prevPayload
  }: {
    maxLoopCount?: number
    stopWhen?: (currentPayload: T, prevPayload: T | undefined) => boolean
    /** usually set by computer */
    currentLoopCount?: number
    /** used when retryCD is not defined */
    retrySpeed?: 'normal' | 'slow'
    retryCD?: MayFunction<number, [payloads: { currentLoopCount: number /*  from zero */ }]> /* ms */

    /**! only added by computer */
    prevPayload?: T
  } = {}
) {
  const currPayload = assert({ currentLoopCount, prevPayload })
  const shouldStop = stopWhen?.(currPayload, prevPayload) ?? false
  if (shouldStop || maxLoopCount < currentLoopCount) {
    return
  } else {
    setTimeout(() => {
      recursivelyDo(assert, {
        maxLoopCount,
        retryCD,
        currentLoopCount: currentLoopCount + 1,
        retrySpeed,
        stopWhen,
        prevPayload
      })
    }, shrinkToValue(retryCD, [{ currentLoopCount: currentLoopCount }]))
  }
}
