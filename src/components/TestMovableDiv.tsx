import { attachPointerMove } from '@/functions/dom/gesture/pointerMove'
import { useRef, useEffect } from 'react'
import { twMerge } from 'tailwind-merge'

export function TestMovableDiv({ className }: { className?: string }) {
  const testRectRef2 = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!testRectRef2.current) return
    let now: number
    const { cancel } = attachPointerMove(testRectRef2.current, {
      move: ({ totalDelta }) => {
        const callbackNow = window.performance.now()
        // eslint-disable-next-line no-console
        now && console.info('time', callbackNow - now)
        now = callbackNow
        testRectRef2.current?.style.setProperty('background-color', `crimson`)
        testRectRef2.current?.style.setProperty('transform', `translate3d(${totalDelta.dx}px, ${totalDelta.dy}px, 0px)`)
      }
    })
    return cancel
  }, [])
  return (
    <div
      className={twMerge('m-8 w-12 h-12 bg-blue-100 cursor-grab cube will-change-transform touch-none', className)}
      ref={testRectRef2}
    ></div>
  )
}
