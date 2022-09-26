import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Fraction } from 'test-r-sdk'
import { ChartPoint, ChartRangeInputOption } from './ConcentratedRangeInputChartBody'
import { AreaChart, Area, XAxis, YAxis, ReferenceLine, ResponsiveContainer, ReferenceArea, Tooltip } from 'recharts'
import useDevice from '@/hooks/useDevice'
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
  onPositionChange?: (props: { min: number; max: number }) => void
}

export default function Chart(props: Props) {
  const {
    chartOptions,
    currentPrice,
    decimals,
    height,
    onPositionChange,
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
  const maxYRef = useRef<number>(0)
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

  const extendPoints = (newMaxPoint: number) => {
    setDisplayList((list) => [...list, { x: newMaxPoint + tickGap, y: 0, z: 0 }])
  }

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
      maxYRef.current = Math.max(maxYRef.current, point.y, nextPoint.y)
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
      [Range.Min]: Number(defaultMin?.toFixed(decimals) || 0),
      [Range.Max]: Number(defaultMax?.toFixed(decimals) || 100)
    })

    return () => {
      if (defaultMin && defaultMax) setRendered(false)
    }
  }, [defaultMin, defaultMax, decimals, updatePosition])

  useEffect(() => {
    if (isMoving) return
    if (rendered) onPositionChange?.(position)
    // draw hightLightPoints
    setDisplayList((list) => [
      ...list.map((point) => ({
        x: point.x,
        y: point.y,
        z:
          toFixedNumber(point.x) >= toFixedNumber(position[Range.Min]) &&
          toFixedNumber(point.x) <= toFixedNumber(position[Range.Max])
            ? point.y
            : undefined
      }))
    ])
  }, [rendered, isMoving, position, onPositionChange])

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
          return {
            [Range.Min]: newLeft <= boundaryRef.current.min ? pos[Range.Min] : newLeft,
            [Range.Max]: newRight >= boundaryRef.current.max ? pos[Range.Max] : newRight
          }
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
        return { ...pos, [moveRef.current]: activeLabel }
      })
    },
    [updatePosition]
  )

  // const zoomCounterRef = useRef(0)
  // const zoomReset = () => {
  //   setXAxisDomain(DEFAULT_X_AXIS)
  //   boundaryRef.current = { min: displayList[0].x, max: displayList[displayList.length - 1].x }
  //   zoomCounterRef.current = 0
  // }
  // const zoomIn = () => {
  //   const newRef = zoomCounterRef.current + ZOOM_INTERVAL
  //   if (newRef >= displayList.length - 1 - newRef) {
  //     return
  //   }
  //   zoomCounterRef.current = newRef
  //   const [min, max] = [displayList[newRef].x, displayList[displayList.length - 1 - newRef].x]
  //   boundaryRef.current = { min, max }
  //   setXAxisDomain([min, max])
  //   updatePosition((pos) => {
  //     return {
  //       [Range.Min]: min > pos[Range.Min] ? min : pos[Range.Min],
  //       [Range.Max]: max < pos[Range.Max] ? max : pos[Range.Max]
  //     }
  //   })
  // }
  // const zoomOut = () => {
  //   zoomCounterRef.current = zoomCounterRef.current - ZOOM_INTERVAL
  //   if (zoomCounterRef.current < 0) {
  //     zoomCounterRef.current = 0
  //     return
  //   }
  //   const [min, max] = [
  //     displayList[zoomCounterRef.current].x,
  //     displayList[displayList.length - 1 - zoomCounterRef.current].x
  //   ]
  //   boundaryRef.current = { min, max }
  //   setXAxisDomain([min, max])
  // }

  const getMouseEvent = (range: Range) => ({
    onPointerDown: handleMouseDown(range),
    onMouseDown: handleMouseDown(range)
  })

  const getReferenceProps = (range: Range) => {
    // const tickGap = xAxisRef.current.length
    //   ? (xAxisRef.current[1] - xAxisRef.current[0]) / xAxisRef.current.length
    //   : points.length
    //   ? (points[points.length - 1].x - points[0].x) / 8 / 8
    //   : 0
    return position[range]
      ? {
          ...getMouseEvent(range),
          x1: position[range] - (range === Range.Min ? 1.6 * tickGap : tickGap / 1.5),
          x2: position[range] + (range === Range.Max ? 1.6 * tickGap : tickGap / 1.5),
          y1: 0,
          y2: maxYRef.current,
          style: { cursor: 'grab' },
          fill: 'transparent',
          isFront: true
        }
      : null
  }

  const handlePriceChange = useCallback(
    ({ val, side }: { val?: number | string; side: Range }) => {
      setPosition((p) => ({ ...p, [side]: parseFloat(String(val!)) }))
    },
    [tickGap]
  )

  const handleInDecrease = useCallback(
    (props: { val?: number | string; side: Range; isIncrease: boolean }): string => {
      const { val = '', side, isIncrease } = props
      const isMin = side === Range.Min
      let resultPos = val
      if (isIncrease) {
        setPosition((prePos) => {
          const newPos = toFixedNumber(
            points.find((p) => !val || toFixedNumber(p.x, decimals) > toFixedNumber(Number(val), decimals))?.x ||
              toFixedNumber(Number(val) + tickGap, decimals),
            decimals
          )
          if (!val || (isMin && newPos >= toFixedNumber(prePos[Range.Max], decimals))) return prePos // when min > max
          resultPos = newPos
          setDisplayList((list) => [...list, { x: newPos + tickGap, y: 0, z: 0 }])
          return { ...prePos, [side]: newPos }
        })
        return String(resultPos)
      }
      setPosition((prePos) => {
        const newPos = toFixedNumber(
          [...points].reverse().find((p) => {
            return toFixedNumber(p.x, decimals) < toFixedNumber(Number(val), decimals)
          })?.x || 0,
          decimals
        )

        if (isMin && newPos <= toFixedNumber(points[0].x, decimals))
          return { ...prePos, [Range.Min]: toFixedNumber(points[0].x, decimals) } // when min < points[0].x
        if (!isMin && newPos <= prePos[Range.Min]) return prePos // when max > max points
        resultPos = newPos
        return { ...prePos, [side]: newPos }
      })
      return String(resultPos)
    },
    [points, tickGap, decimals]
  )

  return (
    <>
      {/* {showZoom && (
        <div className="flex select-none">
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
      )} */}
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
              type="monotone"
              dataKey="y"
              fillOpacity={0.2}
              strokeOpacity={0.2}
            />
            <Area
              {...strokeFillProp}
              fill="#abc4ff"
              stroke="#abc4ff"
              style={{ cursor: isMoving ? 'grab' : 'default' }}
              type="monotone"
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
}
