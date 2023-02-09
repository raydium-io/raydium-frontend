import { AnyFn } from '@/types/constants'
import { addItem } from './arrayMethods'
import { groupItems } from './groupItems'

const invokedRecord = new Map<string, (LazyMapSettings<any, any> & { idleId: number })[]>()

type LazyMapSettings<T, U> = {
  sourceKey: string // for action key for cacheMap to identify
  source: T[]
  loopFn: (item: T, index: number, source: readonly T[]) => U
  /**
   * @default 'lazier-idleCallback'
   */
  method?: 'hurrier-settimeout' | 'lazier-idleCallback'
  options?: {
    /**
     * the larger the more important .
     * default is 0
     * @todo imply it !!!
     **/
    // priority?: 0 | 1
    /**
     * default is 8
     */
    oneGroupTasksSize?: number
  }
}

/**
 * like Array's map(), but each loop will check if new task is pushed in todo queue
 * inspired by `window.requestIdleCallback()`
 * @param settings.source arr
 * @param settings.sourceKey flag for todo queue
 * @param settings.loopFn like js: array::map
 * @param settings.options like js: array::map
 */
export function lazyMap<T, U>(setting: LazyMapSettings<T, U>): Promise<U[]> {
  return new Promise((resolve) => {
    const idleId = requestIdleCallback(async () => {
      const result = await lazyMapCoreMap(setting)
      resolve(result)
    })

    // re-invoke will auto cancel the last idle callback, and record new setting
    const lastIdleId = invokedRecord.get(setting.sourceKey)?.at(-1)?.idleId
    if (lastIdleId) cancelIdleCallback(lastIdleId)

    invokedRecord.set(setting.sourceKey, addItem(invokedRecord.get(setting.sourceKey) ?? [], { ...setting, idleId }))
  })
}

export function requestIdleCallback(fn: AnyFn): number {
  return window.requestIdleCallback ? window.requestIdleCallback?.(fn) : window.setTimeout?.(fn) // Safari no't support `window.requestIdleCallback()`, so have to check first
}

export function cancelIdleCallback(handleId: number): void {
  return window.cancelIdleCallback ? window.cancelIdleCallback?.(handleId) : window.clearTimeout(handleId)
}

function requestCallback(fn: AnyFn, methods: LazyMapSettings<any, any>['method']): number {
  return methods === 'hurrier-settimeout' ? window.setTimeout?.(fn) : requestIdleCallback(fn)
}

function cancelCallback(handleId: number, methods: LazyMapSettings<any, any>['method']): void {
  return methods === 'hurrier-settimeout' ? window.clearTimeout(handleId) : cancelIdleCallback(handleId)
}

async function lazyMapCoreMap<T, U>({
  source,
  options,
  loopFn,
  method: coreMethod
}: LazyMapSettings<T, U>): Promise<U[]> {
  const wholeResult: U[] = []
  for (const blockList of groupItems(source, options?.oneGroupTasksSize ?? 8)) {
    await new Promise((resolve) => {
      const invokeTasks = () => {
        const newResultList = blockList.map(loopFn)
        wholeResult.push(...newResultList)
        resolve(undefined)
      }
      requestCallback(invokeTasks, coreMethod ?? 'lazier-idleCallback')
    }) // forcely use microtask
  }
  return wholeResult
}
