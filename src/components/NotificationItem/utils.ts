export interface TimeoutController {
  dead: boolean
  remainTime: number
  start: () => void
  pause: () => void
  resume: () => void
  abort: () => void
}

export interface SpawnTimeoutControllerOptions {
  onEnd: () => void
  totalDuration: number
}

export function spawnTimeoutControllers(options: SpawnTimeoutControllerOptions): TimeoutController {
  let dead = false
  let startTimestamp: number
  let remainTime = options.totalDuration
  let id: any
  const timeFunction = () => {
    options.onEnd()
    dead = true
  }
  function start() {
    startTimestamp = globalThis.performance.now()
    if (dead) return
    id = globalThis.setTimeout(timeFunction, remainTime)
  }
  function pause() {
    const endTimestamp = globalThis.performance.now()
    remainTime -= endTimestamp - startTimestamp
    globalThis.clearTimeout(id)
  }
  function abort() {
    globalThis.clearTimeout(id)
    dead = true
  }
  return {
    dead,
    remainTime,
    start,
    pause,
    resume: start,
    abort
  }
}
