export function spawnTimeoutControllers(options: { callback: () => void; totalDuration: number }) {
  let dead = false
  let startTimestamp: number
  let remainTime = options.totalDuration
  let id: any
  const timeFunction = () => {
    options.callback()
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
  function resume() {
    start()
  }
  function cancel() {
    globalThis.clearTimeout(id)
    dead = true
  }
  return {
    dead,
    remainTime,
    start,
    pause,
    resume,
    cancel
  }
}
