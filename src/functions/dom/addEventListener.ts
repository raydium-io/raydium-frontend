import { AnyFn } from '@/types/constants'

let eventId = 1

export interface EventListenerController {
  eventId: number
  abort(): void
}

//IDEA: maybe I should use weakMap here
// TODO: why not use native abort controller
const eventIdMap = new Map<number, { el: Element | undefined | null; eventName: string; cb: AnyFn }>()

// TODO: !!! move to domkit
export function addEventListener<El extends Element | undefined | null, K extends keyof GlobalEventHandlersEventMap>(
  el: El,
  eventName: K,
  fn: (payload: {
    ev: GlobalEventHandlersEventMap[K]
    el: El
    eventListenerController: EventListenerController
  }) => void,
  /** default is `{ passive: true }` */
  options?: AddEventListenerOptions
): EventListenerController {
  const defaultedOptions = { passive: true, ...options }

  const targetEventId = eventId++
  const controller = {
    eventId: targetEventId,
    abort() {
      removeEventListener(targetEventId)
    }
  }
  const newEventCallback = (ev: Event) => {
    fn({ el, ev: ev as GlobalEventHandlersEventMap[K], eventListenerController: controller })
  }
  el?.addEventListener(eventName as unknown as string, newEventCallback, defaultedOptions)
  eventIdMap.set(targetEventId, { el, eventName: eventName as unknown as string, cb: newEventCallback })
  return controller
}

function removeEventListener(id: number | undefined | null) {
  if (!id || !eventIdMap.has(id)) return
  const { el, eventName, cb } = eventIdMap.get(id)!
  el?.removeEventListener(eventName, cb)
  eventIdMap.delete(id)
}
