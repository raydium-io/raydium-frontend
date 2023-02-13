/* eslint-disable no-console */
import { AnyFn } from '@/types/constants'
import { resolve } from 'path'
import { addItem } from './arrayMethods'
import { groupItems } from './groupItems'
import { isNumber } from './judgers/dateType'

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
     * if don't set , it will auto-cacl in Chrome/Edge/Firefox, and 8 in Safari
     */
    oneGroupTasksSize?: number
  }
}

// for whole task
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
      lazyMapCoreMapCancelIdleCallback()
      const result = await lazyMapCoreMap(setting)
      resolve(result)
    })

    // re-invoke will auto cancel the last idle callback, and record new setting
    const lastIdleId = invokedRecord.get(setting.sourceKey)?.at(-1)?.idleId
    if (lastIdleId) cancelIdleCallback(lastIdleId)

    invokedRecord.set(setting.sourceKey, addItem(invokedRecord.get(setting.sourceKey) ?? [], { ...setting, idleId }))
  })
}

const subTaskIdleIds = [] as number[]

function lazyMapCoreMapCancelIdleCallback() {
  subTaskIdleIds.forEach((id) => cancelIdleCallback(id))
  subTaskIdleIds.length = 0
}

// for sub task
async function lazyMapCoreMap<T, U>({
  source,
  options,
  loopFn,
  method: coreMethod
}: LazyMapSettings<T, U>): Promise<U[]> {
  const needFallbackToOldWay =
    isNumber(options?.oneGroupTasksSize) || !canUseIdleCallback() || coreMethod === 'hurrier-settimeout'

  if (needFallbackToOldWay) {
    const wholeResult: U[] = []
    // old way
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
  } else {
    const wholeResult: U[] = []
    const c = await loadTasks(
      source.map((item, index) => () => loopFn(item, index, source)),
      subTaskIdleIds,
      wholeResult
    )
    console.log('cTask: ', c.length)
    console.log('wholeResult: ', wholeResult)
    return wholeResult
    // new way
    // // new way
    // for (const [index, taskInputItem] of source.entries()) {
    //   await new Promise((resolve) => {
    //     const beginNextTask = () => resolve(undefined)
    //     const subTaskIdleId = requestIdleCallback(({timeRemaining}) => {
    //       console.log('run', index)
    //         const taskResult = loopFn(taskInputItem, index, source)
    //         wholeResult.push(taskResult)
    //       beginNextTask()
    //     }) // forcely use microtask
    //     subTaskIdleIds.push(subTaskIdleId)
    //   })
    // }
  }
}

async function loadTasks<F extends () => U, U>(
  tasks: F[],
  subTaskIdleIds: number[],
  wholeResult: U[],
  taskIndex = 0
): Promise<U[]> {
  let currentTaskIndex = taskIndex
  const results = await new Promise<U[]>((resolve) => {
    const subTaskIdleId = requestIdleCallback((deadline) => {
      const haveTask = currentTaskIndex < tasks.length
      while (deadline.timeRemaining() > 2 && haveTask) {
        const haveTask = currentTaskIndex < tasks.length
        console.log('tasks.length: ', tasks.length)
        console.log('currentTaskIndex: ', currentTaskIndex)
        console.log('haveTask: ', haveTask)
        if (haveTask) {
          console.log('run index: ', currentTaskIndex)
          const taskResult = tasks[currentTaskIndex]()
          console.log('taskResult: ', taskResult)
          wholeResult.push(taskResult)
          currentTaskIndex += 1
        } else {
          console.log('resolve', wholeResult.length)
          resolve(wholeResult)
        }
      }
      const stillHaveTask = currentTaskIndex < tasks.length
      console.log('stillHaveTask: ', stillHaveTask)
      console.log(
        'wholeResult999: ',
        // @ts-expect-error Temp for DEV
        wholeResult.map((i) => i.name)
      )
      if (stillHaveTask) {
        loadTasks(tasks, subTaskIdleIds, wholeResult, currentTaskIndex)
      } else {
        console.log('resolvewholeResultsss: ', wholeResult.length)
        resolve(wholeResult)
      }
    })
    console.log('subTaskIdleId22: ', subTaskIdleId)
    subTaskIdleIds.push(subTaskIdleId)
  })
  console.log('results: ', results)
  return results
}

function canUseIdleCallback(): boolean {
  return Boolean(window.requestIdleCallback)
}

function requestCallback(fn: AnyFn, methods: LazyMapSettings<any, any>['method']): number {
  return methods === 'hurrier-settimeout' ? window.setTimeout?.(fn) : requestIdleCallback(fn)
}

export function requestIdleCallback(fn: IdleRequestCallback): number {
  return window.requestIdleCallback ? window.requestIdleCallback?.(fn) : window.setTimeout?.(fn) // Safari no't support `window.requestIdleCallback()`, so have to check first
}

export function cancelIdleCallback(handleId: number): void {
  return window.cancelIdleCallback ? window.cancelIdleCallback?.(handleId) : window.clearTimeout(handleId)
}
