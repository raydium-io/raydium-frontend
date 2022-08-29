import { addEventListener } from '../addEventListener'

type Delta2D = {
  dx: number
  dy: number
}
export type HandleMouseWheelOnWheel<El extends Element> = (utilities: {
  el: El
  ev: WheelEvent
  totalDelta: Delta2D
}) => void

export function handleMouseWheel<El extends Element>(
  el: El,
  options: {
    endAfterNoneChange?: number
    onWheel?: HandleMouseWheelOnWheel<El>
    onWheelEnd?: (utilities: { el: El; ev: WheelEvent; totalDelta: Delta2D }) => void
  }
) {
  const eventsQueue: { ev: WheelEvent }[] = []
  const dd = addEventListener(
    el,
    'wheel',
    ({ ev }) => {
      eventsQueue.push({ ev })
      ev.preventDefault()
      options.onWheel?.({ el, ev, totalDelta: { dx: 0, dy: 9 /* TODO: temp */ } })
    },
    { passive: false }
  )

  return dd
}
