import { useEffect, useRef, useState, useCallback, useMemo, useImperativeHandle, forwardRef, ReactNode } from 'react'
import { Fraction } from '@raydium-io/raydium-sdk'
import { AreaChart, Area, XAxis, YAxis, ReferenceLine, ResponsiveContainer, ReferenceArea, Tooltip } from 'recharts'
import Icon from '@/components/Icon'
import { getPlatformInfo } from '@/functions/dom/getPlatformInfo'
import { PriceBoundaryReturn } from '@/application/concentrated/getNearistDataPoint'
import {
  ChartPoint,
  ChartRangeInputOption,
  Range,
  DEFAULT_X_AXIS,
  HIGHLIGHT_COLOR,
  unitColor,
  ZOOM_INTERVAL,
  AREA_CONFIG,
  boundaryColor,
  getStrokeFill,
  toFixedNumber,
  getConfig,
  getLabel
} from './chartUtil'
import PriceRangeInput from './PriceRangeInput'
import { useEvent } from '@/hooks/useEvent'
import { formatDecimal } from '@/functions/numberish/formatDecimal'

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
  showCurrentPriceOnly?: boolean
  showZoom?: boolean
  hideRangeLine?: boolean
  hideRangeInput?: boolean
  hideCurrentPriceLabel?: boolean
  hideXAxis?: boolean
  height?: number
  title?: ReactNode
  onPositionChange?: (props: { min: number; max: number; side?: Range; userInput?: boolean }) => PriceBoundaryReturn
  onInDecrease?: (props: { p: number; isMin: boolean; isIncrease: boolean }) => Fraction | undefined
  onAdjustMin?: (props: { min: number; max: number }) => { price: number; tick: number }
}

export default forwardRef(function Chart(props: Props, ref) {
  const {
    poolFocusKey,
    chartOptions,
    currentPrice,
    priceLabel,
    decimals,
    height,
    onPositionChange,
    onInDecrease,
    onAdjustMin,
    title,
    showCurrentPriceOnly,
    hideCurrentPriceLabel,
    hideRangeLine,
    hideRangeInput,
    showZoom,
    hideXAxis
  } = props
  const points: HighlightPoint[] = useMemo(() => Object.assign([], chartOptions?.points || []), [chartOptions?.points])
  const [defaultMin, defaultMax] = [
    chartOptions?.initMinBoundaryX as Fraction,
    chartOptions?.initMaxBoundaryX as Fraction
  ]
  const poolIdRef = useRef<string | undefined>()
  const hasPoints = points.length > 0
  const { isMobile } = getPlatformInfo() || {}
  const [displayList, setDisplayList] = useState<HighlightPoint[]>(points)
  const [isMoving, setIsMoving] = useState(false)
  const [position, setPosition] = useState<PositionState>({
    [Range.Min]: Number(defaultMin?.toFixed(decimals)) || 0,
    [Range.Max]: Number(defaultMax?.toFixed(decimals)) || 100
  })
  const [xAxis, setXAxis] = useState<number[]>([])
  const boundaryRef = useRef({ min: 0, max: 100 })
  const smoothCountRef = useRef(0)
  const zoomRef = useRef(0)
  const moveRef = useRef('')
  const areaRef = useRef<number | undefined>()
  const xAxisRef = useRef<number[]>([])
  const blurRef = useRef<number | undefined>()
  const blurTimerRef = useRef<number | undefined>()
  const tickGap = points.length ? (points[points.length - 1].x - points[0].x) / 8 / 8 : 0
  const [xAxisDomain, setXAxisDomain] = useState<string[] | number[]>(hasPoints ? DEFAULT_X_AXIS : [0, 100])

  boundaryRef.current = xAxisDomain.length
    ? { min: Number(xAxisDomain[0]) || 0, max: Number(xAxisDomain[xAxisDomain.length - 1]) || 100 }
    : boundaryRef.current

  const updatePosition = useCallback(
    (nextStateOrCbk: PositionState | ((prePos: PositionState) => PositionState)) => {
      const getSafeMin = (val) => Math.max(boundaryRef.current.min, val)
      if (typeof nextStateOrCbk === 'function') {
        setPosition((prePos) => {
          const newPos = nextStateOrCbk(prePos)
          return {
            [Range.Min]: formatDecimal({ val: getSafeMin(newPos[Range.Min]), decimals }),
            [Range.Max]: formatDecimal({ val: newPos[Range.Max], decimals })
          }
        })
        return
      }

      setPosition({
        [Range.Min]: formatDecimal({ val: getSafeMin(nextStateOrCbk[Range.Min]), decimals }),
        [Range.Max]: formatDecimal({ val: nextStateOrCbk[Range.Max], decimals })
      })
    },
    [decimals, points]
  )

  useEffect(() => {
    setDisplayList([])
    boundaryRef.current = { min: 0, max: 100 }
    if (poolIdRef.current !== poolFocusKey || showCurrentPriceOnly) {
      zoomRef.current = 0
      setXAxisDomain(DEFAULT_X_AXIS)
      setPosition({ [Range.Min]: 0, [Range.Max]: 0 })
    }

    const [defaultMinNum, defaultMaxNum] = [
      defaultMin ? Number(defaultMin.toFixed(8)) : undefined,
      defaultMax ? Number(defaultMax.toFixed(8)) : undefined
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
    if (defaultMinNum && defaultMinNum <= Number(points[0].x.toFixed(decimals)) + gap) {
      points.unshift({ x: defaultMinNum - gap, y: 0 })
    }
    if (defaultMaxNum && defaultMaxNum >= Number(points[points.length - 1].x.toFixed(decimals)) - gap) {
      points.push({ x: defaultMaxNum + gap * 2, y: 0 })
    }

    const pointMaxIndex = points.length - 1
    let [foundDefaultMin, foundDefaultMax] = [false, false]
    let maxY = points[0].y
    for (let i = 0; i < pointMaxIndex; i++) {
      const [prePoint, point, nextPoint] = [points[i - 1], points[i], points[i + 1]]
      const pointXNum = formatDecimal({ val: point.x, decimals })
      if (defaultMinNum && pointXNum > defaultMinNum && !foundDefaultMin) {
        const insertIdx = displayList.findIndex((p) => p.x > defaultMinNum)
        displayList.splice(insertIdx === -1 ? displayList.length : insertIdx, 0, {
          ...(prePoint || point),
          x: defaultMinNum
        })
        foundDefaultMin = true
      }
      if (defaultMaxNum && pointXNum > defaultMaxNum && !foundDefaultMax) {
        const insertIdx = displayList.findIndex((p) => p.x > defaultMaxNum)
        displayList.splice(insertIdx === -1 ? displayList.length : insertIdx, 0, {
          ...(prePoint || point),
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
        const gap = formatDecimal({ val: (nextPoint.x - point.x) / smoothCount, decimals })
        for (let j = 1; j <= smoothCount; j++) {
          const y = toFixedNumber(point.y, decimals)
          displayList.push({ x: formatDecimal({ val: point.x + gap * j, decimals }), y })
        }
      }
    }
    if (pointMaxIndex > 0) displayList.push(points[pointMaxIndex])
    if (displayList[0].x + gap * 2 > (defaultMinNum || 0)) displayList.unshift({ x: displayList[0].x * 0.9, y: 0 })
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
  }, [points, defaultMin, defaultMax, decimals, showCurrentPriceOnly, poolFocusKey])

  useEffect(() => {
    if (
      (!defaultMin && !defaultMax) ||
      (hasPoints && !showCurrentPriceOnly && poolIdRef.current && poolIdRef.current === poolFocusKey)
    )
      return
    poolIdRef.current = hasPoints ? poolFocusKey : undefined
    updatePosition({
      [Range.Min]: Number(defaultMin.toFixed(10)),
      [Range.Max]: Number(defaultMax.toFixed(10))
    })
  }, [defaultMin, defaultMax, updatePosition, hasPoints, showCurrentPriceOnly, poolFocusKey, showCurrentPriceOnly])

  useEffect(() => {
    setXAxis(xAxisRef.current)
  }, [position, xAxisDomain])

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

    const initDecimals = val < 1 ? 2 : 1

    let tick = Number(val.toFixed(initDecimals)).toString()
    for (let i = initDecimals; i < 5 && labels.indexOf(tick) !== -1; i++) {
      tick = Number(val.toFixed(i)).toString()
    }
    labels.push(tick)
    return tick
  }

  let timer: number | undefined = undefined

  const debounceUpdate = useCallback(
    ({ side, ...pos }: { min: number; max: number; side: Range | string }) => {
      timer && clearTimeout(timer)
      timer = window.setTimeout(() => {
        const res = onPositionChange?.(pos)
        if (!res) return
        if (side === 'area')
          updatePosition({ min: Number(res.priceLower.toFixed(9)), max: Number(res.priceUpper.toFixed(9)) })
        if (side === Range.Min)
          updatePosition((pos) => ({
            ...pos,
            [Range.Min]: Number(res.priceLower.toFixed(9))
          }))
        if (side === Range.Max)
          updatePosition((pos) => ({
            ...pos,
            [Range.Max]: Number(res.priceUpper.toFixed(9))
          }))
      }, 100)
    },
    [onPositionChange]
  )
  const handleMove = useCallback(
    (e: any) => {
      if (!moveRef.current || !e) return
      // move center area
      const activeLabel = e.activeLabel
      if (!activeLabel) return
      if (moveRef.current === 'area') {
        if (areaRef.current === undefined) {
          areaRef.current = activeLabel
          return
        }
        const diff = activeLabel - areaRef.current
        areaRef.current = activeLabel
        const isDefault = typeof xAxisDomain[0] === 'string'
        const [xMin, xMax] = isDefault ? [boundaryRef.current.min, boundaryRef.current.max] : xAxisDomain
        updatePosition((pos) => {
          const [newLeft, newRight] = [pos[Range.Min] + diff, pos[Range.Max] + diff]
          const newPos = {
            [Range.Min]:
              (newLeft <= xMin && newLeft < pos[Range.Min]) || newLeft >= pos[Range.Max] ? pos[Range.Min] : newLeft,
            [Range.Max]:
              (newRight >= xMax && newRight > pos[Range.Max]) || newRight <= pos[Range.Min] ? pos[Range.Max] : newRight
          }
          debounceUpdate({ ...newPos, side: moveRef.current })
          return newPos
        })
        return
      }
      updatePosition((pos) => {
        // when min line > max line
        if (moveRef.current === Range.Min && e.activeLabel >= pos[Range.Max]) {
          moveRef.current = Range.Max
          return { ...pos, [Range.Max]: activeLabel }
        }
        // when max line < min line
        if (moveRef.current === Range.Max && e.activeLabel <= pos[Range.Min]) {
          moveRef.current = Range.Min
          return { ...pos, [Range.Min]: activeLabel }
        }
        debounceUpdate({ ...pos, [moveRef.current]: activeLabel, side: moveRef.current })
        return { ...pos, [moveRef.current]: activeLabel }
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
              ? formatDecimal({ val: res.priceLower.toFixed(8), decimals })
              : formatDecimal({ val: res.priceUpper.toFixed(8), decimals })
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
            ? formatDecimal({ val: newPos.toFixed(10), decimals })
            : formatDecimal({ val: Number(val) + tickGap, decimals })
          if (hasPoints && !isMin && posNum >= toFixedNumber(prePos[Range.Max], decimals))
            setDisplayList((list) => [...list, { x: posNum + tickGap, y: 0, extend: true }])
          resultPosNum = posNum
          return { ...prePos, [side]: posNum }
        })
        return resultPosNum
      }
      setPosition((prePos) => {
        const newPos = onInDecrease?.({ p: Number(val), isMin, isIncrease: false })
        const posNum = newPos
          ? formatDecimal({ val: newPos.toFixed(10), decimals })
          : formatDecimal({ val: Number(val) + tickGap, decimals })
        resultPosNum = posNum
        return { ...prePos, [side]: posNum }
      })
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
    zoomRef.current = 0
    setDisplayList((list) => list.filter((p) => !p.extend))
    setXAxisDomain(DEFAULT_X_AXIS)
    boundaryRef.current = {
      min: hasPoints ? displayList[0].x : 10,
      max: hasPoints ? displayList[displayList.length - 1].x : 100
    }
  }
  const setupXAxis = ({ min, max }: { min: number; max: number }) => {
    boundaryRef.current = { min, max }
    extendDisplay({ min, max })
    setXAxisDomain([min, max])
  }
  const zoomIn = () => {
    if (!hasPoints) return
    const center = Number(currentPrice!.toFixed(decimals))
    const min = center - (ZOOM_INTERVAL - zoomRef.current) * tickGap
    const max = center + (ZOOM_INTERVAL - zoomRef.current) * tickGap
    if (min >= max) return
    zoomRef.current = zoomRef.current + 1
    setupXAxis({ min, max })
  }
  const zoomOut = () => {
    if (!hasPoints) return
    zoomRef.current = zoomRef.current - 1
    const center = Number(currentPrice?.toFixed(decimals)) || (position[Range.Max] + position[Range.Min]) / 2
    const [min, max] = [
      Math.min(center - (ZOOM_INTERVAL - zoomRef.current) * tickGap, (xAxis[0] || 0) + zoomRef.current * tickGap),
      Math.max(
        center + (ZOOM_INTERVAL - zoomRef.current) * tickGap,
        (xAxis[xAxis.length - 1] || displayList[displayList.length - 1].x) - zoomRef.current * tickGap
      )
    ]
    setupXAxis({ min, max })
  }

  useImperativeHandle(
    ref,
    () => ({
      getPosition: () => position
    }),
    [position]
  )

  return (
    <>
      <div className="flex justify-between text-base leading-[22px] text-secondary-title mb-2">
        {title}
        {showZoom && (
          <div className="flex gap-2 select-none">
            <Icon
              onClick={zoomReset}
              className="saturate-50 brightness-125 cursor-pointer"
              iconSrc="/icons/chart-add-white-space.svg"
            />
            <Icon
              className="text-[#abc4ff] saturate-50 brightness-125 cursor-pointer"
              onClick={zoomIn}
              heroIconName="zoom-in"
              canLongClick
            />
            <Icon
              onClick={zoomOut}
              className="text-[#abc4ff] saturate-50 brightness-125 cursor-pointer"
              heroIconName="zoom-out"
              canLongClick
            />
          </div>
        )}
      </div>
      <div className="text-[#ABC4FF] text-sm text-center">
        {hideCurrentPriceLabel ? undefined : `Current Price: ${currentPrice?.toSignificant(4)} ${priceLabel || ''}`}
      </div>
      <div className="w-full select-none" style={{ height: `${height || 140}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            style={{ userSelect: 'none' }}
            width={500}
            height={400}
            margin={{ top: 10 }}
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
            <YAxis allowDataOverflow domain={['dataMin', 'dataMax']} type="number" hide={true} />
            {!hideRangeLine && position[Range.Min] && (
              <ReferenceLine
                {...getMouseEvent(Range.Min)}
                stroke={boundaryColor}
                className="cursor-grab"
                isFront={true}
                x={position[Range.Min]}
                strokeWidth={4}
                label={getLabel({ side: Range.Min, ...getMouseEvent(Range.Min) })}
              />
            )}
            {!hideRangeLine && position[Range.Max] && (
              <ReferenceLine
                {...getMouseEvent(Range.Max)}
                stroke={boundaryColor}
                className="cursor-grab"
                isFront={true}
                x={position[Range.Max]}
                strokeWidth={4}
                label={getLabel({ side: Range.Max, ...getMouseEvent(Range.Max) })}
              />
            )}
            {currentPrice && (
              <ReferenceLine
                isFront={true}
                x={currentPrice?.toSignificant(4)}
                stroke="#FFF"
                strokeDasharray="4"
                strokeWidth={2}
              />
            )}
            {hasPoints && !showCurrentPriceOnly && (
              <ReferenceArea
                style={{ cursor: hideRangeLine ? 'default' : 'pointer' }}
                onPointerDown={isMobile && !hideRangeLine ? handleAreaMouseDown : undefined}
                onMouseDown={!hideRangeLine ? handleAreaMouseDown : undefined}
                x1={Math.max(position[Range.Min], displayList[0]?.x || 0, xAxis[0] || 0)}
                x2={Math.min(
                  position[Range.Max],
                  displayList[displayList.length - 1]?.x || Number.MAX_SAFE_INTEGER,
                  xAxis[xAxis.length - 1] || Number.MAX_SAFE_INTEGER
                )}
                fill={HIGHLIGHT_COLOR}
                fillOpacity="0.3"
              />
            )}
            {!hideRangeLine && <ReferenceArea {...getReferenceProps(Range.Min)} />}
            {!hideRangeLine && <ReferenceArea {...getReferenceProps(Range.Max)} />}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {!hideRangeInput && (
        <PriceRangeInput
          decimals={Math.max(8, decimals)}
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
