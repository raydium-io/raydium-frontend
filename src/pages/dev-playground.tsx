import Button from '@/components/Button'
import PageLayout from '@/components/PageLayout'
import toUsdVolume from '@/functions/format/toUsdVolume'
import { inClient } from '@/functions/judgers/isSSR'
import { add, div, minus, mul } from '@/functions/numberish/operations'
import parseNumberInfo from '@/functions/numberish/parseNumberInfo'
import toFraction from '@/functions/numberish/toFraction'
import { toString } from '@/functions/numberish/toString'
import { useEvent } from '@/hooks/useEvent'
import { useRecordedEffect } from '@/hooks/useRecordedEffect'
import useToggle from '@/hooks/useToggle'
import { Numberish } from '@/types/constants'
import { Fraction } from '@raydium-io/raydium-sdk'
import { useEffect, useRef, useState } from 'react'
import { VirtualBox } from '../components/VirtualBox'

/**
 * temporary create-market page
 */
export default function CreateMarketPage() {
  return (
    <PageLayout mobileBarTitle="Dev Playground" metaTitle="Dev Playground - Raydium">
      <div className="title text-2xl mobile:text-lg font-semibold justify-self-start text-white mb-4">Playground</div>
      <VirtualBoxExample />
      <NExample />
    </PageLayout>
  )
}

function VirtualBoxExample() {
  const [vitualHidden, { toggle }] = useToggle()
  const [innerHeight, setInnerHeight] = useState(96)

  return (
    <div>
      <Button className="my-4" onClick={toggle}>
        {vitualHidden ? 'hidden' : 'shown'}
      </Button>
      <Button
        className="my-4"
        onClick={() => {
          setInnerHeight((n) => n + 8)
        }}
      >
        height: {innerHeight}
      </Button>
      <VirtualBox observeWidth show={!vitualHidden} className="border-2 border-[#abc4ff] box-content">
        {(detectRef) => (
          <div
            ref={detectRef}
            className="h-24 w-48 bg-dark-blue grid place-content-center"
            style={{ height: innerHeight }}
          >
            hello world
          </div>
        )}
      </VirtualBox>
    </div>
  )
}

function NExample() {
  const strings = ['133444.444', '28.121233', '22']
  const [currentIndex, setCurrentIndex] = useState(0)
  return (
    <div>
      <Button
        className="my-4"
        onClick={() => {
          setCurrentIndex((idx) => (idx + 1) % strings.length)
        }}
      >
        change n
      </Button>
      <N n={strings[currentIndex]} format={(n) => toString(n)} />
    </div>
  )
}

function N<T extends Numberish>({
  n,
  format,
  duration = 500,
  stepCount = duration / 48
}: {
  n: T
  format: (n: Numberish) => string | number
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
      if (!prevN) return
      // only max of deciaml is considered
      const decimalCount = Math.max(parseNumberInfo(n).dec?.length ?? 0, parseNumberInfo(prevN).dec?.length ?? 0)
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
    if (!format) return
    setContentTextToDom(format(toFraction(n)))
  }, [format])

  return <div ref={divDomRef}>{getContentText(toFraction(n), format)}</div>
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
