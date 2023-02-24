import { inClient } from '@/functions/judgers/isSSR'
import { add, minus, mul } from '@/functions/numberish/operations'
import parseNumberInfo from '@/functions/numberish/parseNumberInfo'
import toFraction from '@/functions/numberish/toFraction'
import { toString } from '@/functions/numberish/toString'
import { useEvent } from '@/hooks/useEvent'
import { useRecordedEffect } from '@/hooks/useRecordedEffect'
import { Numberish } from '@/types/constants'
import { useEffect, useRef } from 'react'

export function RollingNumber<T extends Numberish>({
  n,
  format,
  decimals = 6,
  duration = 500,
  stepCount = duration / (16.7 * 2)
}: {
  n: T | undefined
  format: (n: Numberish) => string | number
  decimals?: number
  stepCount?: number
  duration?: number
}) {
  const divDomRef = useRef<HTMLDivElement>(null)
  const getContentText = useEvent((n: Numberish, format?: (n: Numberish) => string | number) =>
    format ? format(n) : String(n)
  )
  const setContentTextToDom = useEvent((v: string | number) => {
    if (!divDomRef.current) return
    divDomRef.current.textContent = String(v)
  })

  useRecordedEffect(
    ([prevN]) => {
      if (!divDomRef.current) return
      if (!inClient) return
      if (!prevN || !n) return
      // only max of deciaml is considered
      const decimalCount = decimals ?? parseNumberInfo(n).dec?.length ?? 0
      const { abort } = updateTextNode({
        stepCount,
        duration,
        element: divDomRef.current,
        getText(pasedTime) {
          const currentN = add(prevN, mul(pasedTime / duration, minus(n, prevN)))
          return String(getContentText(toString(currentN, { decimalLength: decimalCount }), format))
        }
      })
      return abort
    },
    [n]
  )

  useEffect(() => {
    if (!divDomRef.current) return
    if (!n) return
    if (!format) return
    setContentTextToDom(format(toFraction(n)))
  }, [format])

  return <div ref={divDomRef}>{n && getContentText(toFraction(n), format)}</div>
}
function updateTextNode({
  stepCount,
  duration,
  element,
  getText
}: {
  stepCount: number
  duration: number
  element: HTMLElement
  getText: (pasedTime: number) => string
}): { abort(): void } {
  let start: DOMHighResTimeStamp | undefined
  let previousTimeStamp: DOMHighResTimeStamp | undefined
  let aborted = false
  let rAFId: number | undefined

  function step(timestamp: DOMHighResTimeStamp) {
    if (previousTimeStamp) {
      // check how much time between effect,
      // if too small ,
      // just defer to next frame
      const currentStepDurationTime = timestamp - previousTimeStamp
      const between = duration / stepCount
      if (currentStepDurationTime < between && !aborted) {
        rAFId = window.requestAnimationFrame(step)
        return
      }
    }

    if (start === undefined) {
      start = timestamp
    }

    const elapsed = timestamp - start

    if (previousTimeStamp !== timestamp) {
      element.textContent = getText(elapsed)
    }

    if (elapsed <= duration) {
      previousTimeStamp = timestamp
      if (!aborted) {
        rAFId = window.requestAnimationFrame(step)
      }
    } else {
      rAFId = undefined
      element.textContent = getText(duration)
    }
  }

  window.requestAnimationFrame(step)

  return {
    abort() {
      rAFId && window.cancelAnimationFrame(rAFId)
      aborted = true
    }
  }
}
