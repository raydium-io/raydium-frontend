const createCurrentTimestamp = () => new Date().getTime()

export type ThrottleOptions = {
  delay?: number
  invokeImmediatelyInInitual?: boolean
}

/**
 *
 * @requires {@link createCurrentTimestamp `createCurrentTimestamp()`}
 */
export function throttle<F extends (...args: any[]) => void>(fn: F, options?: ThrottleOptions): F {
  const middleParams = [] as Parameters<F>[]
  let currentTimoutId: any | null = null
  let prevDurationTimestamp: number | null = null
  let remainDelayTime = options?.delay ?? 400

  const invokeFn = () => {
    fn(...middleParams[middleParams.length - 1])
    middleParams.length = 0 // clear middleParams
    currentTimoutId = null // clear Timeout Id
    remainDelayTime = options?.delay ?? 400 // reset remain time
  }
  // @ts-expect-error force
  return (...args: Parameters<F>) => {
    middleParams.push(args)

    const currentTimestamp = createCurrentTimestamp()

    if (currentTimoutId) {
      clearTimeout(currentTimoutId)
      remainDelayTime -= prevDurationTimestamp ? currentTimestamp - prevDurationTimestamp : 0
    }

    if (!prevDurationTimestamp && options?.invokeImmediatelyInInitual) {
      // first invoke
      invokeFn()
    } else if (remainDelayTime <= 0) {
      invokeFn()
    } else {
      currentTimoutId = setTimeout(invokeFn, remainDelayTime)
    }

    prevDurationTimestamp = currentTimestamp
  }
}

export type DebounceOptions = {
  delay?: number
}

export function debounce<F extends (...args: any[]) => void>(fn: F, options?: DebounceOptions): F {
  let cachedTimoutId: number

  // @ts-expect-error force
  return (...args: Parameters<F>) => {
    if (cachedTimoutId) window.clearTimeout(cachedTimoutId)
    const timeoutId = window.setTimeout(() => fn(...args), options?.delay ?? 400)
    cachedTimoutId = timeoutId
  }
}
