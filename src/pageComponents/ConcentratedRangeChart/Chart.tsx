import { useEffect, useRef, useState, useCallback, useMemo, useImperativeHandle, forwardRef } from 'react'
import { Fraction } from 'test-r-sdk'
import { ChartPoint, ChartRangeInputOption } from './ConcentratedRangeInputChartBody'
import { AreaChart, Area, XAxis, YAxis, ReferenceLine, ResponsiveContainer, ReferenceArea, Tooltip } from 'recharts'
import useDevice from '@/hooks/useDevice'
import { PriceBoundaryReturn } from '@/application/concentrated/getNearistDataPoint'
import {
  getPriceLabel,
  Range,
  DEFAULT_X_AXIS,
  HIGHLIGHT_COLOR,
  strokeFillProp,
  toFixedNumber,
  getConfig,
  getLabel
} from './chartUtil'
import PriceRangeInput from './PriceRangeInput'

interface HighlightPoint extends ChartPoint {
  z?: number // for highlight select range
  extend?: boolean
}

interface PositionState {
  [Range.Min]: number
  [Range.Max]: number
}

interface Props {
  decimals: number
  className?: string
  chartOptions?: ChartRangeInputOption
  currentPrice?: Fraction
  showCurrentPriceOnly?: boolean
  showZoom?: boolean
  hideRangeLine?: boolean
  hideXAxis?: boolean
  height?: number
  onPositionChange: (props: { min: number; max: number; side: Range; userInput?: boolean }) => PriceBoundaryReturn
  onInDecrease: (props: { p: number; isMin: boolean; isIncrease: boolean }) => Fraction | undefined
}

export default forwardRef(function Chart(props: Props, ref) {
  const {
    chartOptions,
    currentPrice,
    decimals,
    height,
    onPositionChange,
    onInDecrease,
    showCurrentPriceOnly,
    hideRangeLine,
    hideXAxis
  } = props
  const points: HighlightPoint[] = useMemo(() => Object.assign([], chartOptions?.points || []), [chartOptions?.points])
  const [defaultMin, defaultMax] = [
    chartOptions?.initMinBoundaryX as Fraction,
    chartOptions?.initMaxBoundaryX as Fraction
  ]
  const hasPoints = points.length > 0
  const { isMobile } = useDevice()
  const [displayList, setDisplayList] = useState<HighlightPoint[]>(points)
  const [rendered, setRendered] = useState(false)
  const [isMoving, setIsMoving] = useState(false)
  const [position, setPosition] = useState<PositionState>({
    [Range.Min]: Number(defaultMin?.toFixed(decimals)) || 0,
    [Range.Max]: Number(defaultMax?.toFixed(decimals)) || 100
  })

  const boundaryRef = useRef({ min: 0, max: 100 })
  const smoothCountRef = useRef(0)
  const moveRef = useRef('')
  const areaRef = useRef<number | undefined>()
  const xAxisRef = useRef<number[]>([])
  const [xAxisDomain, setXAxisDomain] = useState<string[] | number[]>(hasPoints ? DEFAULT_X_AXIS : [0, 100])
  const tickGap = xAxisRef.current.length
    ? (xAxisRef.current[1] - xAxisRef.current[0]) / xAxisRef.current.length
    : points.length
    ? (points[points.length - 1].x - points[0].x) / 8 / 8
    : 0
  boundaryRef.current = { min: points[0]?.x || 0, max: points[points.length - 1]?.x || 100 }

  const updatePosition = useCallback(
    (nextStateOrCbk: PositionState | ((prePos: PositionState) => PositionState)) => {
      const getSafeMin = (val) => Math.max(boundaryRef.current.min, val)
      if (typeof nextStateOrCbk === 'function') {
        setPosition((prePos) => {
          const newPos = nextStateOrCbk(prePos)
          return {
            [Range.Min]: toFixedNumber(getSafeMin(newPos[Range.Min]), decimals),
            [Range.Max]: toFixedNumber(newPos[Range.Max], decimals)
          }
        })
        return
      }
      setPosition({
        [Range.Min]: toFixedNumber(getSafeMin(nextStateOrCbk[Range.Min]), decimals),
        [Range.Max]: toFixedNumber(nextStateOrCbk[Range.Max], decimals)
      })
    },
    [decimals, points]
  )

  useEffect(() => {
    setDisplayList([])
    setXAxisDomain(DEFAULT_X_AXIS)
    setRendered(false)
    setPosition({ [Range.Min]: 0, [Range.Max]: 0 })
    if (!points.length) return
    const { smoothCount } = getConfig(points[0].x, points.length)
    smoothCountRef.current = smoothCount
    const displayList: HighlightPoint[] = []
    const [defaultMinNum, defaultMaxNum] = [
      defaultMin ? Number(defaultMin.toFixed(decimals)) : undefined,
      defaultMax ? Number(defaultMax.toFixed(decimals)) : undefined
    ]

    if (defaultMinNum && defaultMinNum <= Number(points[0].x.toFixed(decimals)))
      points.unshift({ x: defaultMinNum - (points[1].x - points[0].x) / 2, y: 0, z: undefined })
    if (defaultMaxNum && defaultMaxNum >= Number(points[points.length - 1].x.toFixed(decimals)))
      points.push({ x: defaultMaxNum + (points[1].x - points[0].x) / 2, y: 0, z: undefined })

    const pointMaxIndex = points.length - 1
    for (let i = 0; i < pointMaxIndex; i++) {
      const point = points[i]
      const nextPoint = points[i + 1]
      displayList.push({ ...point })
      // add more points to chart to smooth line
      if (!showCurrentPriceOnly || smoothCount > 0) {
        const gap = toFixedNumber((nextPoint.x - point.x) / smoothCount, decimals)
        for (let j = 1; j <= smoothCount; j++) {
          const y = toFixedNumber(j > Math.floor(smoothCount / 2) ? nextPoint.y : point.y, decimals)
          displayList.push({ x: toFixedNumber(point.x + gap * j, decimals), y })
        }
      }
    }
    if (pointMaxIndex > 0) displayList.push(points[pointMaxIndex])

    setDisplayList(displayList)
    setXAxisDomain(DEFAULT_X_AXIS)
    setRendered(true)
  }, [points, defaultMin, defaultMax, decimals, showCurrentPriceOnly])

  useEffect(() => {
    if (!defaultMin && !defaultMax) return
    updatePosition({
      [Range.Min]: Number(defaultMin?.toFixed(10) || 0),
      [Range.Max]: Number(defaultMax?.toFixed(10) || 100)
    })

    return () => {
      if (defaultMin && defaultMax) setRendered(false)
    }
  }, [defaultMin, defaultMax, updatePosition])

  const lastMoveRef = useRef('')
  useEffect(() => {
    if (isMoving || !rendered) return
    setDisplayList((list) => [
      ...list.map((point) => ({
        extend: point.extend,
        x: point.x,
        y: point.y,
        z:
          toFixedNumber(point.x) >= toFixedNumber(position[Range.Min]) &&
          toFixedNumber(point.x) <= toFixedNumber(position[Range.Max])
            ? point.y
            : undefined
      }))
    ])
    // draw hightLightPoints

    return () => {
      lastMoveRef.current = moveRef.current
    }
  }, [rendered, isMoving, position, decimals, onPositionChange])

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
    moveRef.current = side
    setIsMoving(true)
  }

  const formatTicks = useCallback((val: number) => {
    if (!xAxisRef.current.length || val < xAxisRef.current[xAxisRef.current.length - 1]) {
      xAxisRef.current = [val]
    } else {
      xAxisRef.current.push(val)
    }
    if (val < 1) return val.toFixed(4)
    if (val < 10) return val.toFixed(1)

    return val.toFixed(1)
  }, [])

  let timer: number | undefined = undefined

  const debounceUpdate = ({ side, ...pos }: { min: number; max: number; side: Range | string }) => {
    timer && clearTimeout(timer)
    timer = window.setTimeout(() => {
      const res = onPositionChange(pos)
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
  }
  const handleMove = useCallback(
    (e: any) => {
      if (!moveRef.current || !e) return
      // move center area
      const activeLabel = e.activeLabel
      if (moveRef.current === 'area') {
        if (areaRef.current === undefined) {
          areaRef.current = activeLabel
          return
        }
        const diff = activeLabel - areaRef.current
        areaRef.current = activeLabel
        updatePosition((pos) => {
          const [newLeft, newRight] = [pos[Range.Min] + diff, pos[Range.Max] + diff]
          const newPos = {
            [Range.Min]: newLeft <= boundaryRef.current.min ? pos[Range.Min] : newLeft,
            [Range.Max]: newRight >= boundaryRef.current.max ? pos[Range.Max] : newRight
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
    [updatePosition, onPositionChange]
  )

  const getMouseEvent = (range: Range) => ({
    onPointerDown: handleMouseDown(range),
    onMouseDown: handleMouseDown(range)
  })

  const getReferenceProps = (range: Range) => {
    const [x1, x2] = [
      position[range] - (range === Range.Min ? 1.5 * tickGap : tickGap / 1.5),
      position[range] + (range === Range.Max ? 1.5 * tickGap : tickGap / 1.5)
    ]
    return position[range]
      ? {
          ...getMouseEvent(range),
          x1: range === Range.Min && x1 < xAxisRef.current[0] ? xAxisRef.current[0] : x1,
          x2:
            range === Range.Max && x2 > xAxisRef.current[xAxisRef.current.length - 1]
              ? displayList[displayList.length - 1].x
              : x2,
          style: { cursor: 'grab' },
          fill: 'transparent',
          isFront: true
        }
      : null
  }

  const handlePriceChange = useCallback(
    ({ val, side }: { val?: number | string; side: Range }) => {
      const newVal = parseFloat(String(val!))

      setPosition((p) => {
        onPositionChange({ ...p, [side]: newVal, side, userInput: true })
        return { ...p, [side]: newVal }
      })
      setDisplayList((list) => {
        const filteredList = list.filter((p) => !p.extend)
        if (side === Range.Max) {
          if (newVal > filteredList[filteredList.length - 1].x) {
            for (let i = 1; ; i++) {
              const newX = filteredList[filteredList.length - 1].x + tickGap * i
              filteredList.push({ x: newX, y: 0, z: 0, extend: true })
              if (newX > newVal) break
            }
          }
        }
        return filteredList
      })
    },
    [tickGap, points, onPositionChange]
  )

  const handleInDecrease = useCallback(
    (props: { val?: number | string; side: Range; isIncrease: boolean }): string => {
      const { val = '', side, isIncrease } = props
      const isMin = side === Range.Min
      let resultPos = val
      if (isIncrease) {
        setPosition((prePos) => {
          const newPos = onInDecrease({ p: Number(val), isMin, isIncrease: true })
          const posNum = newPos ? parseFloat(newPos.toFixed(decimals)) : toFixedNumber(Number(val) + tickGap, decimals)
          resultPos = posNum
          if (!isMin && posNum >= toFixedNumber(prePos[Range.Max], decimals))
            setDisplayList((list) => [...list, { x: posNum + tickGap, y: 0, extend: true }])
          return { ...prePos, [side]: posNum }
        })
        return String(resultPos)
      }
      setPosition((prePos) => {
        const newPos = onInDecrease({ p: Number(val), isMin, isIncrease: false })
        const posNum = newPos ? parseFloat(newPos.toFixed(decimals)) : toFixedNumber(Number(val) + tickGap, decimals)
        if (isMin && posNum <= toFixedNumber(points[0].x, decimals))
          return { ...prePos, [Range.Min]: toFixedNumber(points[0].x, decimals) } // when min < points[0].x
        if (!isMin && posNum <= prePos[Range.Min]) return prePos // when max > max points
        resultPos = posNum
        return { ...prePos, [side]: posNum }
      })
      return String(resultPos)
    },
    [points, tickGap, decimals]
  )

  useImperativeHandle(
    ref,
    () => ({
      getPosition: () => position
    }),
    [position]
  )

  return (
    <>
      <div className="w-full select-none" style={{ height: `${height || 140}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            style={{ userSelect: 'none' }}
            width={500}
            height={400}
            margin={{
              top: 20
            }}
            defaultShowTooltip={false}
            data={displayList || []}
            onMouseMove={handleMove}
            onMouseUp={handleMouseUp}
          >
            <Area
              {...strokeFillProp}
              animateNewValues={false}
              style={{ cursor: isMoving ? 'grab' : 'default' }}
              legendType="none"
              tooltipType="none"
              activeDot={false}
              dot={false}
              type="step"
              dataKey="y"
              fillOpacity={0.2}
              strokeOpacity={0.2}
            />
            <Area
              {...strokeFillProp}
              fill="#abc4ff"
              stroke="#abc4ff"
              style={{ cursor: isMoving ? 'grab' : 'default' }}
              type="step"
              dataKey="z"
            />
            {!hideRangeLine && (
              <Tooltip wrapperStyle={{ display: 'none' }} isAnimationActive={false} cursor={false} active={false} />
            )}
            <XAxis
              style={{ userSelect: 'none', fontSize: '10px' }}
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
                {...strokeFillProp}
                {...getMouseEvent(Range.Min)}
                className="cursor-grab"
                isFront={true}
                x={position[Range.Min]}
                strokeWidth={4}
                label={getLabel({ side: Range.Min, ...getMouseEvent(Range.Min) })}
              />
            )}

            {!hideRangeLine && position[Range.Max] && (
              <ReferenceLine
                {...strokeFillProp}
                {...getMouseEvent(Range.Max)}
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
                label={getPriceLabel(currentPrice?.toSignificant(4))}
              />
            )}
            {hasPoints && (
              <ReferenceArea
                style={{ cursor: hideRangeLine ? 'default' : 'pointer' }}
                onPointerDown={
                  isMobile && !hideRangeLine
                    ? () => {
                        setIsMoving(true)
                        areaRef.current = undefined
                        moveRef.current = 'area'
                      }
                    : undefined
                }
                onMouseDown={
                  !hideRangeLine
                    ? () => {
                        setIsMoving(true)
                        areaRef.current = undefined
                        moveRef.current = 'area'
                      }
                    : undefined
                }
                x1={position[Range.Min]}
                x2={Math.min(position[Range.Max], xAxisRef.current[xAxisRef.current.length - 1])}
                fill={HIGHLIGHT_COLOR}
                fillOpacity="0.3"
              />
            )}
            <ReferenceArea {...getReferenceProps(Range.Min)} />
            <ReferenceArea {...getReferenceProps(Range.Max)} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <PriceRangeInput
        decimals={decimals}
        minValue={position.min}
        maxValue={position.max}
        onPriceChange={handlePriceChange}
        onInDecrease={handleInDecrease}
      />
    </>
  )
})
