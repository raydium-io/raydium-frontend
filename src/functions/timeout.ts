import { AnyFn } from '@/types/constants'

/** like build-in setTimeout, but have richer option */
export function setInterval(fn: AnyFn, options: { intervalTime: number; loopCount?: number /* default: infinite */ }) {
  let currentLoopCount = 0
  if (currentLoopCount < (options.loopCount ?? Infinity)) {
    const timeId = globalThis.setInterval(() => {
      fn()
      currentLoopCount += 1
      if (currentLoopCount >= (options.loopCount ?? Infinity)) {
        globalThis.clearInterval(timeId)
      }
    }, options.intervalTime)
  }
}
