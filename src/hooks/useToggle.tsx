import { shrinkToValue } from '@/functions/shrinkToValue'
import { Dispatch, RefObject, SetStateAction, useCallback, useMemo, useRef, useState } from 'react'

type MayFunc<T, Params extends any[] = any[]> = T | ((...params: Params) => T)
export interface ToggleSyncFunction {
  on(): void
  off(): void
  toggle(): void
  set(b: boolean): void
}
type ToggleController = {
  delayOn(): void
  delayOff(): void
  delayToggle(): void
  delaySet(): void
  cancelDelayAction(): void
  on(): void
  off(): void
  toggle(): void
  set(b: boolean): void
}

export type UseToggleReturn = [boolean, ToggleController]
export type UseToggleRefReturn = [RefObject<boolean>, ToggleController]

/**
 * it too widely use that there should be a hook
 * @param initValue
 */
export default function useToggle(
  initValue: MayFunc<boolean> = false,
  options: {
    /**only affact delay-* and canelDelayAction */
    delay?: number
    /* usually it is for debug */
    onOff?(): void
    /* usually it is for debug */
    onOn?(): void
    /* usually it is for debug */
    onToggle?(): void
  } = {}
): UseToggleReturn {
  const opts = { delay: 800, ...options }
  const [isOn, _setIsOn] = useState(initValue)
  const [delayActionId, setDelayActionId] = useState<number | NodeJS.Timeout>(0)
  const setIsOn = (...params: any[]) => {
    //@ts-expect-error temp
    _setIsOn(...params)
  }
  const cancelDelayAction = useCallback(() => {
    // @ts-expect-error clearTimeout is not type-safe between browser and nodejs
    globalThis.clearTimeout(delayActionId)
  }, [delayActionId])
  const on = useCallback(() => {
    cancelDelayAction()
    setIsOn(true)
    opts.onOn?.()
  }, [cancelDelayAction])
  const off = useCallback(() => {
    cancelDelayAction()
    setIsOn(false)
    opts.onOff?.()
  }, [cancelDelayAction])
  const toggle = useCallback(() => {
    cancelDelayAction()
    setIsOn((b: any) => {
      if (b) opts.onOff?.()
      if (!b) opts.onOn?.()
      return !b
    })
    opts.onToggle?.()
  }, [cancelDelayAction])

  const delayOn = useCallback(() => {
    cancelDelayAction()
    const actionId = globalThis.setTimeout(on, opts.delay)
    setDelayActionId(actionId)
  }, [cancelDelayAction])
  const delayOff = useCallback(() => {
    cancelDelayAction()
    const actionId = globalThis.setTimeout(off, opts.delay)
    setDelayActionId(actionId)
  }, [cancelDelayAction])
  const delayToggle = useCallback(() => {
    cancelDelayAction()
    const actionId = globalThis.setTimeout(toggle, opts.delay)
    setDelayActionId(actionId)
  }, [cancelDelayAction])
  const delaySet = useCallback(() => {
    cancelDelayAction()
    const actionId = globalThis.setTimeout(setIsOn, opts.delay)
    setDelayActionId(actionId)
  }, [cancelDelayAction])

  const controller = useMemo(
    () => ({
      cancelDelayAction,
      delayOn,
      delayOff,
      delayToggle,
      delaySet,

      on,
      off,
      toggle,
      set: setIsOn
    }),
    [off, on, toggle, setIsOn]
  )
  return [isOn, controller]
}
/**
 * it too widely use that there should be a hook
 * @param initValue
 */
export function useToggleRef(
  initValue: MayFunc<boolean> = false,
  options: {
    /**only affact delay-* and canelDelayAction */
    delay?: number
    /* usually it is for debug */
    onOff?(): void
    /* usually it is for debug */
    onOn?(): void
    /* usually it is for debug */
    onToggle?(): void
  } = {}
): UseToggleRefReturn {
  const opts = { delay: 800, ...options }
  const isOn = useRef(shrinkToValue(initValue))
  const delayActionId = useRef<number | NodeJS.Timeout>(0)
  const setDelayActionId = (id: number | NodeJS.Timeout) => (delayActionId.current = id)
  const setIsOn = (status: MayFunc<boolean>) => {
    isOn.current = shrinkToValue(status)
  }
  const cancelDelayAction = useCallback(() => {
    // @ts-expect-error clearTimeout is not type-safe between browser and nodejs
    globalThis.clearTimeout(delayActionId.current)
  }, [delayActionId])
  const on = useCallback(() => {
    cancelDelayAction()
    setIsOn(true)
    opts.onOn?.()
  }, [cancelDelayAction])
  const off = useCallback(() => {
    cancelDelayAction()
    setIsOn(false)
    opts.onOff?.()
  }, [cancelDelayAction])
  const toggle = useCallback(() => {
    cancelDelayAction()
    setIsOn((b: any) => {
      if (b) opts.onOff?.()
      if (!b) opts.onOn?.()
      return !b
    })
    opts.onToggle?.()
  }, [cancelDelayAction])

  const delayOn = useCallback(() => {
    cancelDelayAction()
    const actionId = globalThis.setTimeout(on, opts.delay)
    setDelayActionId(actionId)
  }, [cancelDelayAction])
  const delayOff = useCallback(() => {
    cancelDelayAction()
    const actionId = globalThis.setTimeout(off, opts.delay)
    setDelayActionId(actionId)
  }, [cancelDelayAction])
  const delayToggle = useCallback(() => {
    cancelDelayAction()
    const actionId = globalThis.setTimeout(toggle, opts.delay)
    setDelayActionId(actionId)
  }, [cancelDelayAction])
  const delaySet = useCallback(() => {
    cancelDelayAction()
    const actionId = globalThis.setTimeout(setIsOn, opts.delay)
    setDelayActionId(actionId)
  }, [cancelDelayAction])

  const controller = useMemo(
    () => ({
      cancelDelayAction,
      delayOn,
      delayOff,
      delayToggle,
      delaySet,

      on,
      off,
      toggle,
      set: setIsOn
    }),
    [off, on, toggle, setIsOn]
  )
  return [isOn, controller]
}

export function createToggleController<T extends Dispatch<SetStateAction<any>>>(setState: T) {
  return {
    on: () => setState(true),
    off: () => setState(false),
    toggle: () => setState((b: any) => !b),
    set: (newState: any) => setState(newState)
  }
}
