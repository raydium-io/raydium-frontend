/**
 * like Array's map(), but each loop will check if new task is pushed in todo queue
 * inspired by `window.requestIdleCallback()`
 * @param settings.source arr
 * @param settings.sourceKey flag for todo queue
 * @param settings.loopFn like js: array::map
 */
export function lazyMap<T, U>(settings: {
  source: T[]
  sourceKey: string
  loopFn: (item: T, index: number, source: T[]) => U
  onListChange: (list: U[]) => void
}) {
  window.requestIdleCallback(() => {
    const result = settings.source.map(settings.loopFn)
    settings.onListChange(result)
  })
}
