import { AnyFn, Delta2dTranslate, SpeedVector } from '@/types/constants'

let eventId = 1
const eventIdMap = new Map<number, { el: Element; eventName: string; fn: AnyFn }>()
/**
 * listen to element' pointermove（pointerDown + pointerMove + pointerUp）clean event automaticly
 * @param el 目标元素
 * @param eventListeners
 */
export function attachPointerMove(
  el: HTMLElement | undefined | null,
  eventListeners: {
    start?: (ev: { ev: PointerEvent; evStart: PointerEvent; evs: PointerEvent[] }) => void
    move?: (ev: {
      ev: PointerEvent
      evStart: PointerEvent
      evs: PointerEvent[]
      currentDeltaInPx: Delta2dTranslate
      totalDeltaInPx: Delta2dTranslate
    }) => void
    end?: (ev: {
      ev: PointerEvent
      evStart: PointerEvent
      evs: PointerEvent[]
      currentDeltaInPx: Delta2dTranslate
      totalDeltaInPx: Delta2dTranslate
      currentSpeed: SpeedVector
    }) => void
  }
) {
  if (!el) return
  const events: PointerEvent[] = []
  /**
   *
   * @param {Event} ev
   */
  function pointerDown(ev: PointerEvent) {
    if (!events.length) {
      events.push(ev)
      eventListeners.start?.({ ev, evStart: ev, evs: events })
      el?.addEventListener('pointermove', pointerMove, { passive: true })
      el?.addEventListener('pointerup', pointerUp, { passive: true })
      el?.setPointerCapture(ev.pointerId)
      ev.stopPropagation()
    }
  }
  function pointerMove(ev: PointerEvent) {
    if (events.length && ev.pointerId === events[events.length - 1].pointerId) {
      const deltaX = ev.clientX - events[events.length - 1].clientX
      const deltaY = ev.clientY - events[events.length - 1].clientY
      const evStart = events[0]
      const totalDeltaX = ev.clientX - evStart.clientX
      const totalDeltaY = ev.clientY - evStart.clientY
      events.push(ev)
      eventListeners.move?.({
        ev,
        evStart,
        evs: events,
        currentDeltaInPx: { dx: deltaX, dy: deltaY },
        totalDeltaInPx: { dx: totalDeltaX, dy: totalDeltaY }
      })
    }
  }
  function pointerUp(ev: PointerEvent) {
    if (events.length && ev.pointerId === events[events.length - 1].pointerId) {
      events.push(ev)
      const eventNumber = 4
      const nearPoint = events[events.length - eventNumber] ?? events[0]
      const deltaX = ev.clientX - nearPoint.clientX
      const deltaY = ev.clientY - nearPoint.clientY
      const deltaTime = ev.timeStamp - nearPoint.timeStamp
      const evStart = events[0]
      const totalDeltaX = ev.clientX - evStart.clientX
      const totalDeltaY = ev.clientY - events[0].clientY
      eventListeners.end?.({
        ev,
        evStart,
        evs: events,
        currentDeltaInPx: { dx: deltaX, dy: deltaY },
        currentSpeed: {
          x: deltaX / deltaTime || 0,
          y: deltaY / deltaTime || 0
        },
        totalDeltaInPx: { dx: totalDeltaX, dy: totalDeltaY }
      })
      events.splice(0, events.length)
      el?.removeEventListener('pointermove', pointerMove)
    }
  }
  el?.addEventListener('pointerdown', pointerDown)
  // record it to cancel by id
  eventIdMap.set(eventId++, { el, eventName: 'pointerdown', fn: pointerDown })
  return eventId
}

export function cancelPointerMove(id: number | undefined) {
  if (!id || !eventIdMap.has(id)) return
  const { el, eventName, fn } = eventIdMap.get(id)!
  el.removeEventListener(eventName, fn)
  eventIdMap.delete(id)
}
