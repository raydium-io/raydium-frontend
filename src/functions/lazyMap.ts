/* eslint-disable no-console */
import { AnyFn } from '@/types/constants'

import { addItem } from './arrayMethods'
import { groupItems } from './groupItems'
import { isNumber } from './judgers/dateType'

const invokedRecord = new Map<string, (LazyMapSettings<any, any> & { idleId: number })[]>()

// priority queue for lazymap pending tasks
let invokedPriorityQueue: LazyMapPriority[] = []
// queue for storing lazymap finished tasks' results
let finishedQueue: FinishedQueueType[] = []
// array for storing lazymap waiting-result interval ids
const waitingIntervalIds: WaitingIntervalIdArray[] = []

// save lazymap task name and their corresponding result
type FinishedQueueType = {
  taskName: string
  result: any[]
}

// save lazymap task name and their corresponding waiting-result interval id
type WaitingIntervalIdArray = {
  taskName: string
  id: NodeJS.Timer
}

type LazyMapSettings<T, U> = {
  source: T[]
  loopTaskName: string // for action key for cacheMap to identify
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
    priority?: 0 | 1
    /**
     * if don't set , it will auto-cacl in Chrome/Edge/Firefox, and 8 in Safari
     */
    oneGroupTasksSize?: number
    idleTimeout?: number
  }
}

type LazyMapPriority = {
  loopTaskName: string
  priority: number
}

// TODO: remove debug console log, if stable

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
    // add new incoming task to priority queue
    addTask(setting.loopTaskName, setting.options?.priority)
    // cancel all unresolved subtask
    cancelUnresolvedIdles(setting.loopTaskName)

    console.info(
      '[lazymap] START WAITING: ',
      setting.loopTaskName,
      'CURRENT WAITING QUEUE:',
      waitingIntervalIds.slice(),
      'CURRENT FINISHED QUEUE: ',
      finishedQueue.slice()
    )
    // start waiting for result
    resolve(Promise.resolve(waitTask(setting.loopTaskName)))

    // fire idle callback to handle lazyMapCoreMap
    const idleId = requestIdleCallback(async () => {
      console.info('[lazymap] CURRENT PRIORIT QUEUE: ', invokedPriorityQueue.slice())
      // get task from priority queue w/ priority weighting
      const task = getTask()
      console.info('[lazymap] PROCESSING TASK is: ', task?.loopTaskName)
      if (!task) {
        resolve([])
        return
      }
      const result = await lazyMapCoreMap(task)
      console.info('[lazymap] FINISHED TASK ', task?.loopTaskName, ' , PUSH to FINISHED QUEUE')

      // replace task result w/ the latest one
      finishedQueue = finishedQueue.filter((finished) => finished.taskName !== task.loopTaskName)
      finishedQueue.push({ taskName: task.loopTaskName, result })
    })

    // re-invoke will auto cancel the last idle callback, and record new setting
    const lastIdleId = invokedRecord.get(setting.loopTaskName)?.at(-1)?.idleId
    if (lastIdleId) cancelIdleCallback(lastIdleId)

    invokedRecord.set(
      setting.loopTaskName,
      addItem(invokedRecord.get(setting.loopTaskName) ?? [], { ...setting, idleId })
    )
  })
}

const subTaskIdleIds: Record<string /* task name */, number[]> = {}

function cancelUnresolvedIdles(loopTaskName: string) {
  subTaskIdleIds[loopTaskName]?.forEach((id) => cancelIdleCallback(id))
  subTaskIdleIds[loopTaskName] = []
}

// for sub task
async function lazyMapCoreMap<T, U>({
  source,
  loopTaskName,
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
    if (source.length === 0) return []
    console.time(`lazy load ${loopTaskName}`)
    const taskResults = await loadTasks(
      source.map((item, index) => () => loopFn(item, index, source)),
      loopTaskName,
      options
    )
    console.timeEnd(`lazy load ${loopTaskName}`)
    return taskResults
  }
}

function addTask(loopTaskName: string, priority = 0) {
  // remove old one (if exist)
  if (invokedPriorityQueue.length > 0) {
    invokedPriorityQueue = invokedPriorityQueue.filter((item) => item.loopTaskName !== loopTaskName)
  }

  // add new one
  invokedPriorityQueue.push({ loopTaskName, priority })
}

function getTask(): (LazyMapSettings<any, any> & { idleId: number }) | undefined {
  if (!invokedPriorityQueue.length) return undefined
  // prioritize order (if more than one task )
  invokedPriorityQueue.length > 1 && invokedPriorityQueue.sort((a, b) => b.priority - a.priority)

  return invokedRecord.get(invokedPriorityQueue.shift()!.loopTaskName)?.at(-1)
}

async function waitTask(loopTaskName: string, waitInterval = 300): Promise<any[]> {
  return new Promise((resolve) => {
    // the task has already in the waiting line, no need to generate another interval for waiting lazymap result
    if (waitingIntervalIds.find((id) => id.taskName === loopTaskName)) return

    const intervalId = globalThis.setInterval(() => {
      const targetTaskIdx = finishedQueue.findIndex((task) => task.taskName === loopTaskName)
      // the task has no result yet (still pending or processing), wait another round
      if (targetTaskIdx < 0) return

      // the task has result in finishedQueue, clear interval, resolve the result
      clearInterval(intervalId)
      waitingIntervalIds.splice(
        waitingIntervalIds.findIndex((waiting) => waiting.id === intervalId),
        1
      )
      // console.log(`[lazymap] TASK <${loopTaskName}>, INTERVAL ID: ${intervalId} FINISHED, CLEAR INTERVAL ID`)
      resolve(finishedQueue.splice(targetTaskIdx, 1)[0].result)
    }, waitInterval)
    waitingIntervalIds.push({ taskName: loopTaskName, id: intervalId })
  })
}

async function loadTasks<F extends () => any>(
  tasks: F[],
  loopTaskName: LazyMapSettings<any, any>['loopTaskName'],
  options?: LazyMapSettings<any, any>['options']
): Promise<ReturnType<F>[]> {
  const testLeastRemainTime = 1 // (ms) // force task cost time
  const fragmentResults = await new Promise<ReturnType<F>[]>((resolve) => {
    const wholeResult: ReturnType<F>[] = []
    const subTaskIdleId = requestIdleCallback(
      (deadline) => {
        let currentTaskIndex = 0
        while (deadline.timeRemaining() > testLeastRemainTime) {
          if (currentTaskIndex < tasks.length) {
            const taskResult = tasks[currentTaskIndex]()
            wholeResult.push(taskResult)
            currentTaskIndex += 1
          } else {
            resolve(wholeResult)
          }
        }
        const stillHaveTask = currentTaskIndex < tasks.length
        if (stillHaveTask) {
          const restTasks = tasks.slice(currentTaskIndex)
          loadTasks(restTasks, loopTaskName, options).then((restResult) =>
            resolve(wholeResult.concat(restResult as ReturnType<F>[]))
          )
        } else {
          resolve(wholeResult)
        }
      },
      { timeout: options?.idleTimeout ?? 1000 }
    )
    if (!subTaskIdleIds[loopTaskName]) {
      subTaskIdleIds[loopTaskName] = []
    }
    subTaskIdleIds[loopTaskName].push(subTaskIdleId)
  })

  return fragmentResults
}

function canUseIdleCallback(): boolean {
  return Boolean(window.requestIdleCallback)
}

function requestCallback(fn: AnyFn, methods: LazyMapSettings<any, any>['method']): number {
  return methods === 'hurrier-settimeout' ? window.setTimeout?.(fn) : requestIdleCallback(fn)
}

export function requestIdleCallback(fn: IdleRequestCallback, options?: IdleRequestOptions): number {
  return window.requestIdleCallback ? window.requestIdleCallback?.(fn, options) : window.setTimeout?.(fn) // Safari no't support `window.requestIdleCallback()`, so have to check first
}

export function cancelIdleCallback(handleId: number): void {
  return window.cancelIdleCallback ? window.cancelIdleCallback?.(handleId) : window.clearTimeout(handleId)
}
