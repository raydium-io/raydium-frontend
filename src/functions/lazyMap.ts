/* eslint-disable no-console */
import { AnyFn } from '@/types/constants'

import { addItem } from './arrayMethods'
import { groupItems } from './groupItems'
import { isNumber } from './judgers/dateType'

const invokedRecord = new Map<string, (LazyMapSettings<any, any> & { idleId: number })[]>()

// priority queue for lazymap pending tasks
let invokedPriorityQueue: LazyMapPriority[] = []
// queue for storing lazymap finished tasks' results
const finishedQueue: FinishedQueueType[] = []
// array for storing lazymap waiting-result interval ids
const waitingIntervalIds: WaitingIntervalIds[] = []

const toDoSubtaskingList: toDoSubtaskingType = {}
const finishedSubtaskingList: finishedSubtaskingType = {}

type toDoSubtaskingType = {
  [key: string]: {
    taskName: string
    subTasks: any[]
  }
}

type finishedSubtaskingType = {
  [key: string]: {
    taskName: string
    result: any[]
  }
}

// save lazymap task name and their corresponding result
type FinishedQueueType = {
  taskName: string
  result: any[]
}

// save lazymap task name and their corresponding waiting-result interval id
type WaitingIntervalIds = {
  taskName: string
  id: NodeJS.Timer
  priority: 0 | 1
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
      finishedQueue.slice(),
      'CURRENT TODO LIST:',
      { ...toDoSubtaskingList },
      'CURRENT FINISHED LIST: ',
      { ...finishedSubtaskingList },
      'PPPPPPP:',
      setting.options?.priority
    )
    // start waiting for result
    resolve(Promise.resolve(waitTask(setting.loopTaskName, setting.options?.priority)))

    // fire idle callback to pick task by priority and load into subtask todo list
    const idleId = requestIdleCallback(async () => {
      console.info('[lazymap] CURRENT PRIORITY QUEUE: ', invokedPriorityQueue.slice())
      // get task from priority queue w/ priority weighting
      const task = getTask()
      console.info('[lazymap] PUSHING SUBTASK is: ', task?.loopTaskName)
      if (!task) {
        resolve([])
        return
      }
      await lazyMapCoreMap(task)
      // console.info('[lazymap] FINISHED TASK ', task?.loopTaskName, ' , PUSH to FINISHED QUEUE')

      // replace task result w/ the latest one
      // finishedQueue = finishedQueue.filter((finished) => finished.taskName !== task.loopTaskName)
      // finishedQueue.push({ taskName: task.loopTaskName, result })
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

function cancelUnresolvedIdles(taskName: string) {
  // clean subtask todo list
  if (toDoSubtaskingList[taskName]) toDoSubtaskingList[taskName].subTasks = []
  // clean subtask finished list
  if (finishedSubtaskingList[taskName]) finishedSubtaskingList[taskName].result = []
  // clean task result
  const finishedIdx = finishedQueue.findIndex((item) => item.taskName === taskName)
  if (finishedIdx >= 0) {
    finishedQueue.splice(finishedIdx, 1)
  }

  subTaskIdleIds[taskName]?.forEach((id) => cancelIdleCallback(id))
  subTaskIdleIds[taskName] = []
}

// for sub task
async function lazyMapCoreMap<T, U>({
  source,
  loopTaskName,
  options,
  loopFn,
  method: coreMethod
}: LazyMapSettings<T, U>) {
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
    finishedQueue.push({ taskName: loopTaskName, result: wholeResult })
  } else {
    if (source.length === 0) return

    // eslint-disable-next-line
    console.time(`[lazymap] lazy loading ${loopTaskName}`)
    await loadTasks(
      source.map((item, index) => () => loopFn(item, index, source)),
      loopTaskName,
      options
    )
    // console.timeEnd(`lazy load ${loopTaskName}`)
    // return taskResults
  }
}

function addTask(loopTaskName: string, priority = 0) {
  // remove old one (if exist)
  if (invokedPriorityQueue.length > 0) {
    invokedPriorityQueue = invokedPriorityQueue.filter((item) => item.loopTaskName !== loopTaskName)
  }

  // add new one
  invokedPriorityQueue.push({ loopTaskName, priority })

  // new task name, create todo list and finished list buffer
  if (!toDoSubtaskingList[loopTaskName]) {
    toDoSubtaskingList[loopTaskName] = {
      taskName: loopTaskName,
      subTasks: []
    }
    finishedSubtaskingList[loopTaskName] = {
      taskName: loopTaskName,
      result: []
    }
  }
}

function getTask(): (LazyMapSettings<any, any> & { idleId: number }) | undefined {
  if (!invokedPriorityQueue.length) return undefined
  // prioritize order (if more than one task )
  invokedPriorityQueue.length > 1 && invokedPriorityQueue.sort((a, b) => b.priority - a.priority)

  return invokedRecord.get(invokedPriorityQueue.shift()!.loopTaskName)?.at(-1)
}

async function waitTask(loopTaskName: string, priority: 0 | 1 = 0, waitInterval = 300): Promise<any[]> {
  return new Promise((resolve) => {
    // eslint-disable-next-line
    console.log('[!!!!!!!!] priority:', priority)
    // the task has already in the waiting line, no need to generate another interval for waiting lazymap result
    const waitingId = waitingIntervalIds.findIndex((id) => id.taskName === loopTaskName)
    if (waitingId >= 0) {
      // the task has already in the waiting line, no need to generate another interval for waiting lazymap result, but update priority
      waitingIntervalIds[waitingId] = { ...waitingIntervalIds[waitingId], priority: priority }
      return
    }

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
    waitingIntervalIds.push({ taskName: loopTaskName, id: intervalId, priority })
  })
}

async function loadTasks<F extends () => any>(
  tasks: F[],
  loopTaskName: LazyMapSettings<any, any>['loopTaskName'],
  options?: LazyMapSettings<any, any>['options']
) {
  console.log('[lazymap] in "loadTasks" loading subtasks: ', loopTaskName)
  toDoSubtaskingList[loopTaskName] = {
    taskName: loopTaskName,
    subTasks: tasks
  }
  // eslint-disable-next-line
  console.log(
    '[lazymap] toDoSubtaskingList: ',
    toDoSubtaskingList,
    'subtask idle: ',
    subTaskIdleIds,
    'waiting:',
    waitingIntervalIds.slice()
  )

  if (
    Object.values(subTaskIdleIds).reduce((a, c) => {
      return a + c.length
    }, 0) === 0
  ) {
    startLazyMapConsumer()
  }

  // const testLeastRemainTime = 1 // (ms) // force task cost time
  // const fragmentResults = await new Promise<ReturnType<F>[]>((resolve) => {
  // const wholeResult: ReturnType<F>[] = []
  //
  // const subTaskIdleId = requestIdleCallback(
  //   (deadline) => {
  //     let currentTaskIndex = 0
  //     while (deadline.timeRemaining() > testLeastRemainTime) {
  //       if (currentTaskIndex < tasks.length) {
  //         const taskResult = tasks[currentTaskIndex]()
  //         wholeResult.push(taskResult)
  //         currentTaskIndex += 1
  //       } else {
  //         resolve(wholeResult)
  //       }
  //     }
  //     const stillHaveTask = currentTaskIndex < tasks.length
  //     if (stillHaveTask) {
  //       const restTasks = tasks.slice(currentTaskIndex)
  //       loadTasks(restTasks, loopTaskName, options).then((restResult) =>
  //         resolve(wholeResult.concat(restResult as ReturnType<F>[]))
  //       )
  //     } else {
  //       resolve(wholeResult)
  //     }
  //   },
  //   { timeout: options?.idleTimeout ?? 1000 }
  // )
  // if (!subTaskIdleIds[loopTaskName]) {
  //   subTaskIdleIds[loopTaskName] = []
  // }
  // subTaskIdleIds[loopTaskName].push(subTaskIdleId)
  // })

  // return fragmentResults
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

export function startLazyMapConsumer(delay = 300) {
  window.setTimeout(processSubtasks, delay)
}

function processSubtasks() {
  // no pending task, start another round (longer)
  if (waitingIntervalIds.length === 0) {
    startLazyMapConsumer(300)
    return
  }
  const batchSize = 80 // a testing number, not tuning

  // sorting waiting task, get a proper
  waitingIntervalIds.sort((a, b) => {
    return b.priority - a.priority
  })
  let targetTask: WaitingIntervalIds | undefined = undefined
  for (const waitingId of waitingIntervalIds) {
    if (toDoSubtaskingList[waitingId.taskName].subTasks.length === 0) continue
    targetTask = waitingId
    break
  }
  if (targetTask === undefined) {
    // startLazyMapConsumer(300)
    return
  }
  const testLeastRemainTime = 1 // (ms) // force task cost time
  const id = requestIdleCallback((deadline) => {
    if (targetTask === undefined) {
      // startLazyMapConsumer(300)
      return
    }
    // eslint-disable-next-line
    console.log(
      '[lazymap] lazyMapConsumer fire, BEFORE,  toDoSubtaskingList:',
      toDoSubtaskingList[targetTask.taskName].subTasks.slice().length,
      'finishedSubtaskingList:',
      finishedSubtaskingList[targetTask.taskName].result.slice().length,
      'target:',
      targetTask.taskName,
      'current waiting interval:',
      waitingIntervalIds.slice()
    )

    // if (waitingIntervalIds.length === 0) {
    //   cancelIdleCallback(id)
    //   startLazyMapConsumer(300)
    // }

    if (!toDoSubtaskingList[targetTask.taskName] || toDoSubtaskingList[targetTask.taskName].subTasks.length === 0) {
      // eslint-disable-next-line
      console.log('[lazymap] no subtask can be processed')
      // subtask might haven't been loading yet
      startLazyMapConsumer(300)
      return
    }
    const todoSubtask = toDoSubtaskingList[targetTask.taskName].subTasks
    let currentTaskIndex = 0
    while (deadline.timeRemaining() > testLeastRemainTime && currentTaskIndex < batchSize) {
      if (currentTaskIndex < todoSubtask.length) {
        const taskResult = todoSubtask[currentTaskIndex]()
        finishedSubtaskingList[targetTask.taskName].result.push(taskResult)
        currentTaskIndex += 1
      } else {
        break
      }
    }
    const stillHaveTask = currentTaskIndex < todoSubtask.length
    if (stillHaveTask) {
      // remove the finished subtask in todo list
      toDoSubtaskingList[targetTask.taskName].subTasks.splice(0, currentTaskIndex)
    } else {
      // push subtask result buffer to task finisehd result
      finishedQueue.push({ taskName: targetTask.taskName, result: finishedSubtaskingList[targetTask.taskName].result })
      // empty subtask todo buffer
      toDoSubtaskingList[targetTask.taskName].subTasks = []
      // empty subtask result buffer
      finishedSubtaskingList[targetTask.taskName].result = []
    }

    console.log(
      '[lazymap] lazyMapConsumer fire, AFTER, toDoSubtaskingList:',
      toDoSubtaskingList[targetTask.taskName].subTasks.slice().length,
      'finishedSubtaskingList:',
      finishedSubtaskingList[targetTask.taskName].result.slice().length
    )

    // start another round (shorter)
    startLazyMapConsumer(20)
  })

  subTaskIdleIds[targetTask.taskName].push(id)
}
