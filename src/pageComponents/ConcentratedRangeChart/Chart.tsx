import { PriceBoundaryReturn } from '@/application/concentrated/getNearistDataPoint'
import { TimeBasis } from '@/application/concentrated/useConcentrated'
import Icon from '@/components/Icon'
import { getPlatformInfo } from '@/functions/dom/getPlatformInfo'
import { formatDecimal as _formatDecimal } from '@/functions/numberish/formatDecimal'
import { shakeZero } from '@/functions/numberish/shakeZero'
import { mul } from '@/functions/numberish/operations'
import { getFirstNonZeroDecimal } from '@/functions/numberish/handleZero'
import { useEvent } from '@/hooks/useEvent'
import { forwardRef, ReactNode, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Area, AreaChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Fraction } from '@raydium-io/raydium-sdk'
import {
  AREA_CONFIG,
  boundaryColor,
  ChartPoint,
  ChartRangeInputOption,
  DEFAULT_X_AXIS,
  getConfig,
  getLabel,
  getStrokeFill,
  HIGHLIGHT_COLOR,
  Range,
  toFixedNumber,
  unitColor,
  parseFirstDigit
} from './chartUtil'
import PriceRangeInput from './PriceRangeInput'
import Decimal from 'decimal.js'

const maxDecimals = 15
interface HighlightPoint extends ChartPoint {
  position?: number
  extend?: boolean
}

interface PositionState {
  [Range.Min]: number
  [Range.Max]: number
}

interface Props {
  poolFocusKey?: string
  decimals: number
  className?: string
  chartOptions?: ChartRangeInputOption
  currentPrice?: Fraction
  priceLabel?: string
  priceMin?: number
  priceMax?: number
  showCurrentPriceOnly?: boolean
  showZoom?: boolean
  hideRangeLine?: boolean
  hideRangeInput?: boolean
  hideXAxis?: boolean
  height?: number
  title?: ReactNode
  timeBasis: TimeBasis
  onPositionChange?: (props: { min: number; max: number; side?: Range; userInput?: boolean }) => PriceBoundaryReturn
  onInDecrease?: (props: { p: number; isMin: boolean; isIncrease: boolean }) => Fraction | undefined
  onAdjustMin?: (props: { min: number; max: number }) => { price: number; tick: number }
}

export default forwardRef(function Chart(props: Props, ref) {
  const {
    poolFocusKey,
    chartOptions,
    currentPrice,
    priceMin,
    priceMax,
    priceLabel,
    timeBasis,
    // decimals: decimalOrg,
    decimals,
    height,
    onPositionChange,
    onInDecrease,
    onAdjustMin,
    title,
    showCurrentPriceOnly,
    hideRangeLine,
    hideRangeInput,
    showZoom,
    hideXAxis
  } = props
  const points: HighlightPoint[] = useMemo(() => Object.assign([], chartOptions?.points || []), [chartOptions?.points])
  const [defaultMin, defaultMax] = useMemo(
    () => [chartOptions?.initMinBoundaryX as Fraction, chartOptions?.initMaxBoundaryX as Fraction],
    [chartOptions, currentPrice]
  )
  const poolIdRef = useRef<string | undefined>()
  const hasPoints = points.length > 0
  const maxLength = Math.max(decimals, getFirstNonZeroDecimal(currentPrice?.toFixed(maxDecimals) || '') + 2, 8)
  const formatDecimal = useCallback(
    ({ val }: { val: string | number }) => {
      const firstDigit = getFirstNonZeroDecimal(new Decimal(val).toFixed(maxDecimals) || '')
      const maxLength = decimals > firstDigit ? decimals + 2 : maxDecimals
      return _formatDecimal({ val, maxLength })
    },
    [decimals]
  )
  const { isMobile } = getPlatformInfo() || {}
  const [displayList, setDisplayList] = useState<HighlightPoint[]>(points)
  const [rate, setRate] = useState(0.2)
  const [isMoving, setIsMoving] = useState(false)
  const [position, setPosition] = useState<PositionState>({
    [Range.Min]: Number(defaultMin?.toFixed(decimals)) || 0,
    [Range.Max]: Number(defaultMax?.toFixed(decimals)) || 100
  })
  const [xAxis, setXAxis] = useState<number[]>([])
  const boundaryRef = useRef({ min: 0, max: 100 })
  const smoothCountRef = useRef(0)
  const moveRef = useRef('')
  const areaRef = useRef<number | undefined>()
  const xAxisRef = useRef<number[]>([])
  const blurRef = useRef<number | undefined>()
  const blurTimerRef = useRef<number | undefined>()
  const updateRef = useRef<() => void | undefined>()
  const chartRef = useRef<any>()
  const autoZoomQueueRef = useRef<undefined | (() => void)>()
  const xAxisDomainRef = useRef<number[]>([0, 100])
  const xAxisResetRef = useRef<number[]>([0, 100])
  const tickGap = points.length ? (points[points.length - 1].x - points[0].x) / 8 / 8 : 0
  const [xAxisDomain, setXAxisDomain] = useState<string[] | number[]>(hasPoints ? DEFAULT_X_AXIS : [0, 100])
  const currentPriceNum = currentPrice?.toFixed(maxLength)
  const enableRates = [0.01, 0.05, 0.1, 0.2, 0.5]

  boundaryRef.current = xAxisDomain.length
    ? { min: Number(xAxisDomain[0]) || 0, max: Number(xAxisDomain[xAxisDomain.length - 1]) || 100 }
    : boundaryRef.current

  const updatePosition = useCallback(
    (nextStateOrCbk: (PositionState & { skipCheck?: boolean }) | ((prePos: PositionState) => PositionState)) => {
      const getSafeMin = (val) => Math.max(boundaryRef.current.min, val, 0)
      if (typeof nextStateOrCbk === 'function') {
        setPosition((prePos) => {
          const newPos = nextStateOrCbk(prePos)
          return {
            [Range.Min]: formatDecimal({ val: getSafeMin(newPos[Range.Min]) }),
            [Range.Max]: formatDecimal({ val: newPos[Range.Max] })
          }
        })
        return
      }

      setPosition({
        [Range.Min]: formatDecimal({
          val: nextStateOrCbk.skipCheck ? nextStateOrCbk[Range.Min] : getSafeMin(nextStateOrCbk[Range.Min])
        }),
        [Range.Max]: formatDecimal({ val: nextStateOrCbk[Range.Max] })
      })
    },
    [decimals, points]
  )

  useEffect(() => {
    setRate(chartOptions?.isStable ? 0.01 : 0.2)
  }, [chartOptions?.isStable, poolFocusKey])

  useEffect(() => {
    setDisplayList([])
    boundaryRef.current = { min: 0, max: 100 }
    if (poolIdRef.current !== poolFocusKey || showCurrentPriceOnly) {
      setXAxisDomain(DEFAULT_X_AXIS)
      setPosition({ [Range.Min]: 0, [Range.Max]: 0 })
    }
    const rate = chartOptions?.isStable ? [0.98, 1.02] : [0.7, 1.3]
    const [defaultMinNum, defaultMaxNum] = [
      defaultMin ? Number(defaultMin.toFixed(Math.max(8, decimals))) : undefined,
      defaultMax ? Number(defaultMax.toFixed(Math.max(8, decimals))) : undefined
    ]
    if (!points.length) {
      if (defaultMinNum === undefined || defaultMaxNum === undefined) return
      points.push({ x: defaultMinNum, y: 0 }, { x: defaultMaxNum, y: 0 })
    }

    const { smoothCount } = getConfig(points[0].x, points.length)
    smoothCountRef.current = smoothCount
    const displayList: HighlightPoint[] = []

    const isInPositionRange = (x: number) =>
      !!(defaultMinNum && x >= defaultMinNum && defaultMaxNum && x <= defaultMaxNum)

    const gap = Math.abs(points[1].x - points[0].x)
    // if chart points not include position point, we auto add them to point list
    if (defaultMinNum && defaultMinNum <= Number(points[0].x.toFixed(Math.max(8, decimals))) + gap)
      points.unshift({ x: Math.max(defaultMinNum - gap, 0), y: 0 })
    if (defaultMaxNum && defaultMaxNum >= Number(points[points.length - 1].x.toFixed(Math.max(8, decimals))) - gap)
      points.push({ x: defaultMaxNum + gap * 2, y: 0 })

    if (currentPriceNum !== undefined) {
      xAxisResetRef.current = [
        parseFloat(currentPriceNum) * rate[0],
        defaultMaxNum && defaultMaxNum > parseFloat(currentPriceNum) * rate[1]
          ? defaultMaxNum * 1.2
          : parseFloat(currentPriceNum) * rate[1]
      ]
      if (poolIdRef.current !== poolFocusKey) {
        xAxisDomainRef.current = [...xAxisResetRef.current]
        setXAxisDomain(xAxisDomainRef.current)
      }
      const axisRate = chartOptions?.isStable ? [0.98, 1.02] : [0.95, 1.05]
      const [min, max] = [
        Math.min(
          priceMin ?? Number(currentPriceNum),
          Number(currentPriceNum),
          defaultMinNum ?? Number(currentPriceNum)
        ),
        Math.max(priceMax ?? Number(currentPriceNum), Number(currentPriceNum), defaultMaxNum ?? Number(currentPriceNum))
      ]
      if (showCurrentPriceOnly) setXAxisDomain([min * axisRate[0], max * axisRate[1]])
      if (xAxisDomainRef.current[0] <= points[0].x) points.unshift({ x: xAxisDomainRef.current[0], y: 0 })
      if (points[points.length - 1].x <= xAxisDomainRef.current[1]) points.push({ x: xAxisDomainRef.current[1], y: 0 })
    }

    const pointMaxIndex = points.length - 1
    let [foundDefaultMin, foundDefaultMax] = [false, false]
    let maxY = points[0].y
    for (let i = 0; i < pointMaxIndex; i++) {
      const [prePoint, point, nextPoint] = [points[i - 1], points[i], points[i + 1]]
      const pointXNum = formatDecimal({ val: point.x })
      if (defaultMinNum && pointXNum > defaultMinNum && !foundDefaultMin) {
        const insertIdx = displayList.findIndex((p) => p.x > defaultMinNum)
        displayList.splice(insertIdx === -1 ? displayList.length : insertIdx, 0, {
          ...(chartOptions?.baseIn ? prePoint || point : point),
          x: defaultMinNum
        })
        foundDefaultMin = true
      }
      if (defaultMaxNum && pointXNum > defaultMaxNum && !foundDefaultMax) {
        const insertIdx = displayList.findIndex((p) => p.x > defaultMaxNum)
        displayList.splice(insertIdx === -1 ? displayList.length : insertIdx, 0, {
          ...(chartOptions?.baseIn ? prePoint || point : point),
          x: defaultMaxNum
        })
        foundDefaultMax = true
      }
      displayList.push({ ...point })

      foundDefaultMin = foundDefaultMin || pointXNum === defaultMinNum
      foundDefaultMax = foundDefaultMax || pointXNum === defaultMaxNum
      maxY = Math.max(maxY, point.y)
      // add more points to chart to smooth line
      if (smoothCount > 0) {
        const gap = (nextPoint.x - point.x) / smoothCount
        for (let j = 1; j <= smoothCount; j++) {
          const y = chartOptions?.baseIn
            ? toFixedNumber(point.y, decimals)
            : toFixedNumber(nextPoint ? nextPoint.y : point.y, decimals)
          displayList.push({ x: _formatDecimal({ val: point.x + gap * j, maxLength: maxLength + 2 }), y })
        }
      }
    }
    if (pointMaxIndex > 0) displayList.push(points[pointMaxIndex])
    if (displayList[0].x + gap * 3 > (defaultMinNum || 0)) displayList.unshift({ x: displayList[0].x * 0.8, y: 0 })
    if (defaultMaxNum && displayList[displayList.length - 1].x - gap > defaultMaxNum)
      displayList.push({ x: displayList[displayList.length - 1].x * 1.05, y: 0 })

    setDisplayList(
      showCurrentPriceOnly
        ? displayList.map((p) => ({
            ...p,
            position: isInPositionRange(toFixedNumber(p.x, decimals)) ? maxY : undefined
          }))
        : displayList
    )
  }, [points, defaultMin, defaultMax, decimals, maxLength, showCurrentPriceOnly, poolFocusKey, currentPriceNum, chartOptions?.isStable, chartOptions?.baseIn])

  useEffect(() => {
    if (
      (!defaultMin && !defaultMax) ||
      (hasPoints && !showCurrentPriceOnly && poolIdRef.current && poolIdRef.current === poolFocusKey)
    )
      return
    poolIdRef.current = hasPoints ? poolFocusKey : undefined
    updatePosition({
      [Range.Min]: Number(defaultMin.toFixed(maxLength)),
      [Range.Max]: Number(defaultMax.toFixed(maxLength))
    })
  }, [defaultMin, defaultMax, updatePosition, hasPoints, showCurrentPriceOnly, poolFocusKey, showCurrentPriceOnly, maxLength])

  useEffect(() => {
    setXAxis(xAxisRef.current)
  }, [position, xAxisDomain])

  useEffect(() => {
    if (!showCurrentPriceOnly || !chartOptions?.isStable) return
    setupXAxis({ min: Number(defaultMin?.toFixed(15)) * 0.995, max: Number(defaultMax?.toFixed(15)) * 1.005 })
  }, [points, showCurrentPriceOnly, defaultMin, defaultMax, chartOptions?.isStable])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.addEventListener('mouseup', handleMouseUp)
    isMobile && window.addEventListener('pointerup', handleMouseUp)
    return () => {
      window.removeEventListener('mouseup', handleMouseUp)
      isMobile && window.removeEventListener('pointerup', handleMouseUp)
    }
  }, [isMobile])

  const handleMouseUp = useCallback(() => {
    if (!moveRef.current) return
    setIsMoving(false)
    moveRef.current = ''
    autoZoomQueueRef.current?.()
    updateRef.current?.()
  }, [])
  const handleMouseDown = (side: Range) => () => {
    if (moveRef.current) return
    moveRef.current = side
    setIsMoving(true)
  }

  let labels: string[] = []
  const formatTicks = (val: number) => {
    if (!xAxisRef.current.length || val < xAxisRef.current[xAxisRef.current.length - 1]) {
      xAxisRef.current = [val]
      labels = []
    } else {
      xAxisRef.current.push(val)
    }

    const gap = points[1]?.x - points[0]?.x
    const gapPrecision = parseFirstDigit(gap) || parseFirstDigit(val)
    const initDecimals = chartOptions?.isStable
      ? getFirstNonZeroDecimal(val.toFixed(15)) + 1
      : gapPrecision > 3
      ? gapPrecision
      : 1

    let tick = shakeZero(val.toFixed(initDecimals))
    for (let i = initDecimals; i < 10 && labels.indexOf(tick) !== -1; i++) {
      tick = shakeZero(val.toFixed(i))
    }
    labels.push(tick)
    return tick
  }

  let timer: number | undefined = undefined

  const autoZoom = useEvent(({ val, side, queue }: { val: number; side: Range | string; queue?: boolean }) => {
    if (queue) {
      autoZoomQueueRef.current = () => {
        autoZoom({ val, side })
        autoZoomQueueRef.current = undefined
      }
      return
    }
    const isMin = side === Range.Min
    const diff = Math.abs(val - Number(currentPriceNum || 0)) / Number(currentPriceNum || 1) / 5
    const [minMultiplier, maxMultiplier] = [1 - diff, 1 + diff]
    xAxisDomainRef.current[isMin ? 0 : 1] = val * (isMin ? minMultiplier : maxMultiplier)
    setXAxisDomain(xAxisDomainRef.current)
    extendDisplay({ min: xAxisDomainRef.current[0], max: xAxisDomainRef.current[1] })
  })

  const debounceUpdate = useCallback(
    ({
      side,
      zoomArea,
      queue,
      ...pos
    }: {
      min: number
      max: number
      side: Range | string
      zoomArea?: boolean
      queue?: boolean
    }) => {
      timer && clearTimeout(timer)
      const updateFunc = () => {
        const res = onPositionChange?.(pos)
        if (!res) return
        const [newMin, newMax] = [
          Number(res.priceLower.toFixed(maxDecimals)),
          Number(res.priceUpper.toFixed(maxDecimals))
        ]
        if (side === 'area') {
          if (zoomArea) {
            autoZoom({ val: newMin, side: Range.Min })
            autoZoom({ val: newMax, side: Range.Max })
          }
          updatePosition({
            min: newMin,
            max: newMax,
            skipCheck: !!zoomArea
          })
        }
        if (side === Range.Min) {
          updatePosition((pos) => ({
            ...pos,
            [Range.Min]: newMin
          }))
          autoZoom({ val: newMin, side: Range.Min, queue: !!moveRef.current })
        }
        if (side === Range.Max) {
          updatePosition((pos) => ({
            ...pos,
            [Range.Max]: newMax
          }))
          autoZoom({ val: newMax, side: Range.Max, queue: !!moveRef.current })
        }
      }
      if (queue) {
        updateRef.current = () => {
          updateFunc()
          updateRef.current = undefined
        }
        return
      }
      timer = window.setTimeout(updateFunc, 100)
    },
    [onPositionChange, autoZoom]
  )
  const handleMove = useCallback(
    (e: any) => {
      if (!moveRef.current || !e) return
      // move center area
      const activeLabel = e.activeLabel
      if (!activeLabel) return
      const side = moveRef.current
      setRate(0)
      if (moveRef.current === 'area') {
        if (areaRef.current === undefined) {
          areaRef.current = activeLabel
          return
        }

        const diff = activeLabel - areaRef.current
        areaRef.current = activeLabel
        const isDefault = typeof xAxisDomain[0] === 'string'
        const [xMin, xMax] = isDefault ? [boundaryRef.current.min, boundaryRef.current.max] : (xAxisDomain as number[])
        updatePosition((pos) => {
          const [newLeft, newRight] = [pos[Range.Min] + diff, pos[Range.Max] + diff]
          const newPos = {
            [Range.Min]:
              (newLeft <= xMin && newLeft < pos[Range.Min]) || newLeft >= pos[Range.Max] ? pos[Range.Min] : newLeft,
            [Range.Max]:
              (newRight >= xMax && newRight > pos[Range.Max]) || newRight <= pos[Range.Min] ? pos[Range.Max] : newRight
          }
          debounceUpdate({ ...newPos, side, queue: true })
          return newPos
        })
        return
      }
      updatePosition((pos) => {
        const val = Math.max(activeLabel, 0)
        // when min line > max line
        if (moveRef.current === Range.Min && val >= pos[Range.Max]) {
          moveRef.current = Range.Max
          debounceUpdate({ ...pos, [moveRef.current]: val, side: Range.Max, queue: true })
          return { ...pos, [Range.Max]: val }
        }
        // when max line < min line
        if (moveRef.current === Range.Max && val <= pos[Range.Min]) {
          moveRef.current = Range.Min
          debounceUpdate({ ...pos, [moveRef.current]: val, side: Range.Min, queue: true })
          return { ...pos, [Range.Min]: val }
        }
        debounceUpdate({ ...pos, [moveRef.current]: val, side, queue: true })
        return { ...pos, [moveRef.current]: val }
      })
    },
    [updatePosition, onPositionChange, xAxisDomain]
  )

  const getMouseEvent = (range: Range) => ({
    onPointerDown: handleMouseDown(range),
    onMouseDown: handleMouseDown(range)
  })

  const getReferenceProps = (range: Range) => {
    const isMin = range === Range.Min
    const [x1, x2] = [
      position[range] - (isMin ? 1.5 * tickGap : tickGap / 1.5),
      position[range] + (!isMin ? 1.5 * tickGap : tickGap / 1.5)
    ]
    return position[range]
      ? {
          ...getMouseEvent(range),
          x1: Math.max(x1, isMin ? xAxis[0] : position[Range.Max]),
          x2: Math.min(x2, isMin ? position[Range.Min] : xAxis[xAxis.length - 1]),
          style: { cursor: 'grab' },
          fill: 'transparent',
          isFront: true
        }
      : null
  }

  const handleAreaMouseDown = useCallback(() => {
    setIsMoving(true)
    areaRef.current = undefined
    moveRef.current = 'area'
  }, [])

  const handlePriceChange = useCallback(
    ({ val, side }: { val?: number | string; side: Range }) => {
      const newVal = parseFloat(String(val!))
      const isMin = side === Range.Min
      setPosition((p) => {
        setTimeout(() => {
          const res = onPositionChange?.({ ...p, [side]: newVal, side, userInput: true })
          blurRef.current = res
            ? isMin
              ? formatDecimal({ val: res.priceLower.toFixed(maxDecimals) })
              : formatDecimal({ val: res.priceUpper.toFixed(maxDecimals) })
            : undefined
        }, 100)
        return { ...p, [side]: newVal }
      })
      if (!points.length) return
      setDisplayList((list) => {
        const filteredList = list.filter((p) => !p.extend)
        if (!isMin) {
          if (newVal > filteredList[filteredList.length - 1].x) {
            for (let i = 1; ; i++) {
              const newX = filteredList[filteredList.length - 1].x + tickGap * i
              filteredList.push({ x: newX, y: 0, extend: true })
              if (newX > newVal) break
            }
          }
        }
        return filteredList
      })
    },
    [tickGap, points, debounceUpdate, decimals]
  )

  const checkMinMax = useEvent((pos?: Partial<{ min: number; max: number }>) => {
    setPosition((p) => {
      const newP = pos ? { ...p, ...pos } : p
      if (newP[Range.Max] <= newP[Range.Min] && onAdjustMin) return { ...newP, [Range.Min]: onAdjustMin(newP).price }
      return newP
    })
  })

  const handleBlurInput = useCallback(
    (side: Range) => {
      if (blurRef.current === undefined) {
        blurTimerRef.current = window.setTimeout(() => {
          checkMinMax()
        }, 200)
        return
      }
      const newVal = blurRef.current
      blurTimerRef.current = window.setTimeout(() => {
        setRate(0)
        autoZoom({ val: newVal, side })
        checkMinMax({ [side]: newVal })
      }, 200)
      blurRef.current = undefined
    },
    [updatePosition, onAdjustMin]
  )

  const handleInDecrease = useCallback(
    (props: { val?: number | string; side: Range; isIncrease: boolean }): number => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
      const { val = '', side, isIncrease } = props
      const isMin = side === Range.Min
      let resultPosNum = Number(val)

      if (isIncrease) {
        setPosition((prePos) => {
          const newPos = onInDecrease?.({ p: Number(val), isMin, isIncrease: true })
          const posNum = newPos
            ? formatDecimal({ val: newPos.toFixed(maxDecimals) })
            : formatDecimal({ val: Number(val) + tickGap })
          if (hasPoints && !isMin && posNum >= toFixedNumber(prePos[Range.Max], decimals))
            setDisplayList((list) => [...list, { x: posNum + tickGap, y: 0, extend: true }])
          resultPosNum = posNum
          return { ...prePos, [side]: posNum }
        })
        autoZoom({ val: resultPosNum, side })
        setRate(0)
        return resultPosNum
      }
      setPosition((prePos) => {
        const newPos = onInDecrease?.({ p: Number(val), isMin, isIncrease: false })
        const posNum = newPos
          ? formatDecimal({ val: newPos.toFixed(maxDecimals) })
          : formatDecimal({ val: Number(val) + tickGap })
        resultPosNum = posNum
        return { ...prePos, [side]: posNum }
      })
      autoZoom({ val: resultPosNum, side })
      setRate(0)
      return resultPosNum
    },
    [points, hasPoints, tickGap, decimals]
  )

  const extendDisplay = ({ min, max }: { min: number; max: number }) => {
    setDisplayList((list) => {
      const newList = list.filter((p) => !p.extend)
      const lastPoint = newList[newList.length - 1].x
      if (min < newList[0].x) {
        for (let i = 0; min <= newList[0].x; i++) newList.unshift({ x: newList[0].x - i * tickGap, y: 0, extend: true })
      }
      if (max > lastPoint) {
        for (let i = 1; newList[newList.length - 1].x <= max; i++)
          newList.push({ x: lastPoint + i * tickGap, y: 0, extend: true })
      }
      return newList
    })
  }

  const zoomReset = () => {
    setDisplayList((list) => list.filter((p) => !p.extend))
    setXAxisDomain(xAxisResetRef.current)
    xAxisDomainRef.current = [...xAxisResetRef.current]
    boundaryRef.current = {
      min: hasPoints ? displayList[0].x : 10,
      max: hasPoints ? displayList[displayList.length - 1].x : 100
    }
  }
  const setupXAxis = ({ min, max }: { min: number; max: number }) => {
    boundaryRef.current = { min, max }
    extendDisplay({ min, max })
    setXAxisDomain([min, max])
    xAxisDomainRef.current = [min, max]
  }
  const zoomIn = () => {
    if (!hasPoints) return
    const tickGap = (xAxisDomainRef.current[1] - xAxisDomainRef.current[0]) / 8
    const min = xAxisDomainRef.current[0] + tickGap
    const max = xAxisDomainRef.current[xAxisDomainRef.current.length - 1] - tickGap

    if (min >= max) return
    setupXAxis({ min, max })
  }
  const zoomOut = () => {
    if (!hasPoints) return
    const tickGap = (xAxisDomainRef.current[1] - xAxisDomainRef.current[0]) / 8
    const min = xAxisDomainRef.current[0] - tickGap
    const max = xAxisDomainRef.current[xAxisDomainRef.current.length - 1] + tickGap
    setupXAxis({ min, max })
  }

  const onClickPercent = (percent: number) => {
    setRate(percent)
    debounceUpdate({
      side: 'area',
      min: Number(mul(currentPrice, 1 - percent)?.toFixed(maxLength) || 0),
      max: Number(mul(currentPrice, 1 + percent)?.toFixed(maxLength) || 0),
      zoomArea: true
    })
  }

  useImperativeHandle(
    ref,
    () => ({
      getPosition: () => position
    }),
    [position]
  )

  const chartControlStyle = {
    width: 28,
    height: 28,
    background: `linear-gradient(126.6deg, rgba(57, 208, 216, 0.2) 28.69%, rgba(57, 208, 216, 0) 100%)`,
    backdropFilter: `blur(2px)`,
    borderRadius: 38,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  }

  let yAxisMax = 0
  displayList.forEach((p) => {
    if (p.x >= Number(xAxisDomain[0]) && p.x <= Number(xAxisDomain[1])) {
      yAxisMax = Math.max(yAxisMax, p.y)
    }
  })

  return (
    <>
      <div className="flex justify-between text-base leading-[22px] text-secondary-title mb-2">
        {title}
        {showZoom && (
          <div className="flex gap-2 select-none">
            <div style={chartControlStyle}>
              <Icon
                size="sm"
                onClick={zoomReset}
                className="saturate-50 brightness-125 cursor-pointer"
                iconSrc="/icons/add-space.svg"
              />
            </div>
            <div style={chartControlStyle}>
              <Icon
                size="sm"
                onClick={zoomOut}
                className="text-[#abc4ff] saturate-50 brightness-125 cursor-pointer"
                iconSrc="/icons/zoom-out.svg"
                canLongClick
              />
            </div>
            <div style={chartControlStyle}>
              <Icon
                size="sm"
                className="text-[#abc4ff] saturate-50 brightness-125 cursor-pointer"
                onClick={zoomIn}
                iconSrc="/icons/zoom-in.svg"
                canLongClick
              />
            </div>
          </div>
        )}
      </div>
      <div>
        <div className="flex items-center text-xs text-[#ABC4FF]">
          <span className="inline-block w-[8px] h-[2px] bg-white mr-2" />
          <span className="opacity-50 mr-2">Current Price</span>{' '}
          {shakeZero(currentPrice?.toFixed(Math.max(decimals, maxLength)) || 0)}
          <span className="ml-1">{priceLabel}</span>
        </div>
        <div className="flex items-center text-xs text-[#ABC4FF]">
          <span className="inline-block w-[8px] h-[2px] bg-[#39D0D8] mr-2" />
          <span className="opacity-50 mr-2">{timeBasis} Price Range</span> [
          {shakeZero(priceMin?.toFixed(Math.max(decimals, maxLength)) || 0)},{' '}
          {shakeZero(priceMax?.toFixed(Math.max(decimals, maxLength)) || 0)}]
        </div>
      </div>
      <div className="w-full select-none" style={{ height: `${height || 140}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            style={{ userSelect: 'none' }}
            ref={chartRef}
            width={500}
            height={400}
            margin={{ top: 15 }}
            defaultShowTooltip={false}
            data={displayList || []}
            onMouseDown={isMobile ? handleMouseDown(Range.Min) : undefined}
            onMouseMove={handleMove}
            onMouseUp={handleMouseUp}
          >
            <Area
              {...AREA_CONFIG}
              {...getStrokeFill('#abc4ff')}
              fillOpacity={0.9}
              style={{ cursor: isMoving ? 'grab' : 'default' }}
              type="step"
              dataKey="y"
            />
            <Area {...AREA_CONFIG} {...getStrokeFill(HIGHLIGHT_COLOR)} fillOpacity="0.3" dataKey="position" />
            {!hideRangeLine && (
              <Tooltip wrapperStyle={{ display: 'none' }} isAnimationActive={false} cursor={false} active={false} />
            )}
            <XAxis
              style={{ userSelect: 'none', fontSize: '10px', fill: unitColor }}
              type="number"
              tickCount={7}
              tickFormatter={formatTicks}
              domain={xAxisDomain}
              interval="preserveStartEnd"
              allowDataOverflow={true}
              hide={hideXAxis}
              tickLine={false}
              dataKey="x"
            />
            <YAxis allowDataOverflow domain={['dataMin', yAxisMax]} type="number" hide={true} />
            {!hideRangeLine && !isNaN(position[Range.Min]) && (
              <ReferenceLine
                {...getMouseEvent(Range.Min)}
                stroke={boundaryColor}
                className="cursor-grab"
                isFront={true}
                x={position[Range.Min]}
                strokeWidth={4}
                label={getLabel({
                  side: Range.Min,
                  ...getMouseEvent(Range.Min),
                  chartWidth: chartRef.current?.props.width,
                  percent: currentPriceNum
                    ? ((position[Range.Min] - parseFloat(currentPriceNum)) / parseFloat(currentPriceNum)) * 100
                    : undefined
                })}
              />
            )}
            {!hideRangeLine && !isNaN(position[Range.Max]) && (
              <ReferenceLine
                {...getMouseEvent(Range.Max)}
                stroke={boundaryColor}
                className="cursor-grab"
                isFront={true}
                x={position[Range.Max]}
                strokeWidth={4}
                label={getLabel({
                  side: Range.Max,
                  ...getMouseEvent(Range.Max),
                  chartWidth: chartRef.current?.props.width,
                  percent: currentPriceNum
                    ? ((position[Range.Max] - parseFloat(currentPriceNum)) / parseFloat(currentPriceNum)) * 100
                    : undefined
                })}
              />
            )}
            {currentPrice && (
              <ReferenceLine
                isFront={true}
                x={currentPrice?.toSignificant(decimals)}
                stroke="#FFF"
                strokeDasharray="4"
                strokeWidth={2}
              />
            )}
            {priceMin && (
              <ReferenceLine isFront={true} x={priceMin} stroke="#39D0D8" strokeDasharray="4" strokeWidth={2} />
            )}
            {priceMax && (
              <ReferenceLine isFront={true} x={priceMax} stroke="#39D0D8" strokeDasharray="4" strokeWidth={2} />
            )}
            {hasPoints && !showCurrentPriceOnly && (
              <ReferenceArea
                style={{ cursor: hideRangeLine ? 'default' : 'pointer' }}
                onPointerDown={isMobile && !hideRangeLine ? handleAreaMouseDown : undefined}
                onMouseDown={!hideRangeLine ? handleAreaMouseDown : undefined}
                x1={Math.max(position[Range.Min], xAxis[0] || 0)}
                x2={Math.min(position[Range.Max], xAxis[xAxis.length - 1] || Number.MAX_SAFE_INTEGER)}
                fill={HIGHLIGHT_COLOR}
                fillOpacity="0.3"
              />
            )}
            {!hideRangeLine && <ReferenceArea {...getReferenceProps(Range.Min)} />}
            {!hideRangeLine && <ReferenceArea {...getReferenceProps(Range.Max)} />}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {showCurrentPriceOnly ? null : (
        <div className="flex justify-between flex-wrap gap-2">
          {enableRates.map((r) => (
            <div
              key={r}
              className={`whitespace-nowrap mb-3 text-xs text-center border flex-1 ${
                r === rate ? 'border-[#ABC4FF] bg-[#141041]' : 'border-[#36427D] opacity-50'
              } rounded-lg py-1 px-2 cursor-pointer`}
              onClick={() => onClickPercent(r)}
            >
              ± {r * 100}%
            </div>
          ))}
        </div>
      )}
      {!hideRangeInput && (
        <PriceRangeInput
          decimals={Math.max(8, decimals + 2)}
          minValue={position.min}
          maxValue={position.max}
          onBlur={handleBlurInput}
          onPriceChange={handlePriceChange}
          onInDecrease={handleInDecrease}
        />
      )}
    </>
  )
})
