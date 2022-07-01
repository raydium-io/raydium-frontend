import { addItem } from './arrayMethods'

const invokedRecord = new Map<string, (LazyMapSettings<any, any> & { idleId: number })[]>()

type LazyMapSettings<T, U> = {
  source: T[]
  sourceKey: string
  loopFn: (item: T, index: number, source: T[]) => U
  onListChange: (list: U[]) => void
}

/**
 * like Array's map(), but each loop will check if new task is pushed in todo queue
 * inspired by `window.requestIdleCallback()`
 * @param settings.source arr
 * @param settings.sourceKey flag for todo queue
 * @param settings.loopFn like js: array::map
 */
export function lazyMap<T, U>(setting: LazyMapSettings<T, U>) {
  const canUseRequestIdleCallback = Boolean(window.requestIdleCallback) // Safari no't support `window.requestIdleCallback()`, so have to check first
  if (canUseRequestIdleCallback) {
    const idleId = window.requestIdleCallback(() => {
      // console.time(`lazy map (${setting.sourceKey})`)
      const result = setting.source.map(setting.loopFn)
      setting.onListChange(result)
      // console.timeEnd(`lazy map (${setting.sourceKey})`)
    })

    // cancel the last idle callback, and record new setting
    const currentKeySettings = invokedRecord.get(setting.sourceKey) ?? []
    const lastIdleId = currentKeySettings[currentKeySettings.length - 1]?.idleId
    if (lastIdleId) window.cancelIdleCallback(lastIdleId)
    invokedRecord.set(setting.sourceKey, addItem(invokedRecord.get(setting.sourceKey) ?? [], { ...setting, idleId }))
  } else {
    // Safari no't support `window.requestIdleCallback()`
    const result = setting.source.map(setting.loopFn)
    setting.onListChange(result)
  }
}
