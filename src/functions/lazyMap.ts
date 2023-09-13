/* eslint-disable no-console */
import { AnyFn } from '@/types/constants'

import { addItem, filterInplace } from './arrayMethods'
import { groupItems } from './groupItems'
import { isNumber } from './judgers/dateType'

const invokedRecord = new Map<string, (LazyMapSettings<any, any> & { idleId: number })[]>()

// priority queue for pending tasks
const loopTaskPriorityQueue: LoopTaskPriorityQueue = []
// queue for storing tasks' completly finished-subtasks results
const loopTaskFinishedQueue: LoopTaskFinishedQueue = []
// array for storing waiting-result tasks' interval ids
const loopTaskWaitingIntervalIds: LoopTaskWaitingIntervalIds = []
// buffer for storing todo-subtasks
const todoSubtaskingList: TodoSubtasks = {}
// buffer for storing finished-subtasks
const finishedSubtaskingList: FinishedSubtasks = {}

type TodoSubtasks = {
  [key: string]: {
    taskName: string
    subTasks: any[]
  }
}

type FinishedSubtasks = {
  [key: string]: {
    taskName: string
    result: any[]
  }
}

// save lazymap task name and their corresponding result
type LoopTaskFinishedQueue = {
  taskName: string
  result: any[]
}[]

// save lazymap task name and their corresponding waiting-result interval id
type LoopTaskWaitingIntervalIds = {
  taskName: string
  id: NodeJS.Timer
  priority: 0 | 1
}[]

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

type LoopTaskPriorityQueue = {
  loopTaskName: string
  priority: number
}[]

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

    // console.info(
    //   '[lazymap] START WAITING: ',
    //   setting.loopTaskName,
    //   'CURRENT WAITING QUEUE:',
    //   loopTaskWaitingIntervalIds.slice(),
    //   'CURRENT FINISHED QUEUE: ',
    //   loopTaskFinishedQueue.slice(),
    //   'CURRENT TODO LIST:',
    //   { ...toDoSubtaskingList },
    //   'CURRENT FINISHED LIST: ',
    //   { ...finishedSubtaskingList },
    //   'PPPPPPP:',
    //   setting.options?.priority
    // )
    // start waiting for result
    resolve(Promise.resolve(waitTask(setting.loopTaskName, setting.options?.priority)))

    // fire idle callback to pick task by priority and load into subtask todo list
    const idleId = requestIdleCallback(async () => {
      // console.info('[lazymap] CURRENT PRIORITY QUEUE: ', loopTaskPriorityQueue.slice())
      // get task from priority queue w/ priority weighting
      const task = getTask()
      // console.info('[lazymap] PUSHING SUBTASK is: ', task?.loopTaskName)
      if (!task) {
        resolve([])
        return
      }
      await lazyMapCoreMap(task)
      // console.info('[lazymap] FINISHED TASK ', task?.loopTaskName, ' , PUSH to FINISHED QUEUE')
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

const subTaskIdleIds: number[] = []

function cancelUnresolvedIdles(taskName: string) {
  // clean subtask todo list
  if (todoSubtaskingList[taskName]) todoSubtaskingList[taskName].subTasks = []
  // clean subtask finished list
  if (finishedSubtaskingList[taskName]) finishedSubtaskingList[taskName].result = []
  // clean task result
  const finishedIdx = loopTaskFinishedQueue.findIndex((item) => item.taskName === taskName)
  if (finishedIdx >= 0) loopTaskFinishedQueue.splice(finishedIdx, 1)
  // cancel the outdated subtask idle
  // console.log('[lazymap] subtask BEFORE cancel: ', subTaskIdleIds.slice())
  subTaskIdleIds?.forEach((id) => cancelIdleCallback(id))
  subTaskIdleIds.length = 0
  // console.log('[lazymap] subtask AFTER cancel: ', subTaskIdleIds.slice())
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
    loopTaskFinishedQueue.push({ taskName: loopTaskName, result: wholeResult })
  } else {
    if (source.length === 0) return

    await loadTasks(
      source.map((item, index) => () => loopFn(item, index, source)),
      loopTaskName,
      options
    )
  }
}

function addTask(loopTaskName: string, priority = 0) {
  // remove old one (if exist)
  if (loopTaskPriorityQueue.length > 0) {
    // console.log('[array] before filter:', loopTaskPriorityQueue.slice(), 'loopTaskName:', loopTaskName)
    filterInplace(loopTaskPriorityQueue, (item, idx, loopTaskPriorityQueue) => {
      return item.loopTaskName !== loopTaskName
    })
    // console.log('[array] after filter:', loopTaskPriorityQueue.slice())
  }

  // add new one
  loopTaskPriorityQueue.push({ loopTaskName, priority })

  // new task name, create todo list and finished list buffer
  if (!todoSubtaskingList[loopTaskName]) {
    todoSubtaskingList[loopTaskName] = {
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
  if (!loopTaskPriorityQueue.length) return undefined
  // prioritize order (if more than one task )
  loopTaskPriorityQueue.length > 1 && loopTaskPriorityQueue.sort((a, b) => b.priority - a.priority)

  return invokedRecord.get(loopTaskPriorityQueue.shift()!.loopTaskName)?.at(-1)
}

async function waitTask(loopTaskName: string, priority: 0 | 1 = 0, waitInterval = 300): Promise<any[]> {
  return new Promise((resolve) => {
    // the task has already in the waiting line, no need to generate another interval for waiting lazymap result
    const waitingId = loopTaskWaitingIntervalIds.findIndex((id) => id.taskName === loopTaskName)
    if (waitingId >= 0) {
      // the task has already in the waiting line, no need to generate another interval for waiting lazymap result, but update priority
      loopTaskWaitingIntervalIds[waitingId] = { ...loopTaskWaitingIntervalIds[waitingId], priority: priority }
      return
    }

    const intervalId = globalThis.setInterval(() => {
      const targetTaskIdx = loopTaskFinishedQueue.findIndex((task) => task.taskName === loopTaskName)
      // the task has no result yet (still pending or processing), wait another round
      if (targetTaskIdx < 0) return

      // the task has result in loopTaskFinishedQueue, clear interval, resolve the result
      clearInterval(intervalId)
      loopTaskWaitingIntervalIds.splice(
        loopTaskWaitingIntervalIds.findIndex((waiting) => waiting.id === intervalId),
        1
      )
      // console.log(`[lazymap] TASK <${loopTaskName}>, INTERVAL ID: ${intervalId} FINISHED, CLEAR INTERVAL ID`)
      resolve(loopTaskFinishedQueue.splice(targetTaskIdx, 1)[0].result)
    }, waitInterval)
    loopTaskWaitingIntervalIds.push({ taskName: loopTaskName, id: intervalId, priority })
  })
}

async function loadTasks<F extends () => any>(
  tasks: F[],
  loopTaskName: LazyMapSettings<any, any>['loopTaskName'],
  options?: LazyMapSettings<any, any>['options']
) {
  // console.log('[lazymap] in "loadTasks" loading subtasks: ', loopTaskName)
  todoSubtaskingList[loopTaskName] = {
    taskName: loopTaskName,
    subTasks: tasks
  }
  if (subTaskIdleIds.length === 0) startLazyMapConsumer()
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

function getLatestPrioritizedTask(): LoopTaskWaitingIntervalIds[number] | undefined {
  let targetTask: LoopTaskWaitingIntervalIds[number] | undefined = undefined
  // no pending task
  if (loopTaskWaitingIntervalIds.length === 0) return undefined
  // sorting waiting task, make it prioritized
  loopTaskWaitingIntervalIds.sort((a, b) => b.priority - a.priority)

  for (const waitingId of loopTaskWaitingIntervalIds) {
    if (todoSubtaskingList[waitingId.taskName].subTasks.length === 0) continue
    targetTask = waitingId
    break
  }

  return targetTask
}

function processSubtasks() {
  const batchSize = 80 // a testing number, not tuning

  const testLeastRemainTime = 1 // (ms) // force task cost time
  const id = requestIdleCallback((deadline) => {
    const targetTask = getLatestPrioritizedTask()
    if (
      targetTask === undefined ||
      !todoSubtaskingList[targetTask.taskName] ||
      todoSubtaskingList[targetTask.taskName].subTasks.length === 0
    ) {
      // might be no pending task or subtask might haven't been loading yet
      startLazyMapConsumer(300)
      return
    }
    // console.log(
    //   '[lazymap] lazyMapConsumer fire, BEFORE,  toDoSubtaskingList:',
    //   toDoSubtaskingList[targetTask.taskName].subTasks.slice().length,
    //   'finishedSubtaskingList:',
    //   finishedSubtaskingList[targetTask.taskName].result.slice().length,
    //   'target:',
    //   targetTask.taskName,
    //   'current waiting interval:',
    //   loopTaskWaitingIntervalIds.slice()
    // )

    const todoSubtask = todoSubtaskingList[targetTask.taskName].subTasks
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
      todoSubtaskingList[targetTask.taskName].subTasks.splice(0, currentTaskIndex)
    } else {
      // push subtask result buffer to task finisehd result
      loopTaskFinishedQueue.push({
        taskName: targetTask.taskName,
        result: finishedSubtaskingList[targetTask.taskName].result
      })
      // empty subtask todo buffer
      todoSubtaskingList[targetTask.taskName].subTasks = []
      // empty subtask result buffer
      finishedSubtaskingList[targetTask.taskName].result = []
    }

    // console.log(
    //   '[lazymap] lazyMapConsumer fire, AFTER, toDoSubtaskingList:',
    //   toDoSubtaskingList[targetTask.taskName].subTasks.slice().length,
    //   'finishedSubtaskingList:',
    //   finishedSubtaskingList[targetTask.taskName].result.slice().length
    // )

    // start another round (shorter)
    startLazyMapConsumer(20)
  })

  subTaskIdleIds.push(id)
}
