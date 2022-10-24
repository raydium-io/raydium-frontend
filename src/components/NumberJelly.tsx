import React, { useEffect, useMemo, useRef } from 'react'

import { twMerge } from 'tailwind-merge'
import { ZERO } from 'test-r-sdk'

import formatNumber, { FormatOptions } from '@/functions/format/formatNumber'
import { toHumanReadable } from '@/functions/format/toHumanReadable'
import { gt, lt } from '@/functions/numberish/compare'
import { add, clamp, div, mul, sub } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'
import { Numberish } from '@/types/constants'

interface NumberJellyProps extends FormatOptions {
  className?: string

  //TODO: number is not safe should can accept stringNumber
  /** you can also add it throw `children` */
  currentValue?: Numberish
  initValue?: Numberish

  formatter?: (n: string) => string

  /**@default 600 */
  totalDuration?: number // (ms)

  /**
   * this will not cause react rerender, it just set element's innerHTML. so free to set little number
   * @default 50
   */
  eachLoopDuration?: number // (ms)

  /**
   * if delta is too big, that not appropriate
   */
  maxDeltaPercent?: number // (0-1)

  /** you can also add it throw `currentValue` */
  children?: Numberish
}

/**
 * 1. format the nummber
 * 2. when input number change, it can have a transition effect
 */
export default function NumberJelly({
  className,
  currentValue,
  children,
  initValue,

  totalDuration = 600,
  eachLoopDuration = 50,
  maxDeltaPercent,

  groupSeparator = ',',
  groupSize = 3,
  fractionLength,
  formatter = (n) => formatNumber(n, { groupSeparator, groupSize, fractionLength })
}: NumberJellyProps) {
  const targetNumber = currentValue ?? children ?? ZERO
  const currentNumber = useRef<Numberish>(initValue ?? targetNumber)
  const domRef = useRef<HTMLDivElement>(null)

  const format = (n: string) => String(formatter(n))

  //#region ------------------- currentValue(prevData for targetNumber) is too big for targetNumber -------------------
  function clampByPercent(n: Numberish, deltaPercent: number, baseN: Numberish /** set as boundary */) {
    return clamp(mul(baseN, 1 - 1 * deltaPercent), n, mul(baseN, 1 + 1 * deltaPercent))
  }
  if (maxDeltaPercent != null) {
    const delta = sub(targetNumber, currentNumber.current)
    const deltaPercent = div(delta, targetNumber)
    const isTooBig = lt(deltaPercent, -maxDeltaPercent) || gt(deltaPercent, maxDeltaPercent) // or too small

    if (isTooBig) {
      currentNumber.current = clampByPercent(currentNumber.current, maxDeltaPercent, targetNumber)
    }
  }
  //#endregion

  useEffect(() => {
    const loopStep = div(sub(targetNumber, currentNumber.current), totalDuration / eachLoopDuration)
    const currentIsLess = lt(currentNumber.current, targetNumber)

    const timoutId = setInterval(() => {
      currentNumber.current = toString(add(loopStep, currentNumber.current)) // {@link toString} is used for let result collapse ( let result be 1001 not 1000 + 1, 1002 not 1000 + 2, ...)(later is the core of BN/Fraction)
      const hasFufilledTarget = (currentIsLess ? gt : lt)(currentNumber.current, currentValue)
      if (hasFufilledTarget) {
        if (domRef.current) domRef.current.innerHTML = format(toString(currentValue))
        clearInterval(timoutId)
      } else {
        const str = toString(currentNumber.current)
        const formatted = format(str)
        if (domRef.current) domRef.current.innerHTML = formatted
      }
    }, eachLoopDuration)
    return () => clearInterval(timoutId)
  }, [targetNumber, initValue])

  return (
    <div ref={domRef} className={twMerge('NumberJelly tabular-nums inline-block', className)}>
      {format(toString(currentNumber.current))}
    </div>
  )
}
