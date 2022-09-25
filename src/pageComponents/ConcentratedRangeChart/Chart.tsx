import { useEffect, useRef, useState, useCallback } from 'react'
import { Fraction } from 'test-r-sdk'
import { ChartPoint, ChartRangeInputOption } from './ConcentratedRangeInputChartBody'
import Icon from '@/components/Icon'
import { AreaChart, Area, XAxis, YAxis, ReferenceLine, ResponsiveContainer, ReferenceArea, Tooltip } from 'recharts'
import useDevice from '@/hooks/useDevice'
import {
  getPriceLabel,
  Range,
  ZOOM_INTERVAL,
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

interface Props {
  poolId?: string
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
  const { chartOptions, currentPrice, height, showCurrentPriceOnly, showZoom, hideRangeLine, hideXAxis } = props
  const points: HighlightPoint[] = chartOptions?.points || []
  const [defaultMin, defaultMax] = [
    chartOptions?.initMinBoundaryX as Fraction,
    chartOptions?.initMaxBoundaryX as Fraction
  ]
  const hasPoints = points.length > 0
  const { isMobile } = useDevice()
  const [displayList, setDisplayList] = useState(points)
  const [isMoving, setIsMoving] = useState(false)
  const [position, setPosition] = useState({
    [Range.Min]: Number(defaultMin?.toFixed(6)) || 10,
    [Range.Max]: Number(defaultMax?.toFixed(6)) || 80
  })
  const boundaryRef = useRef({ min: points[0]?.x || 0, max: points[points.length - 1]?.x || 100 })
  const moveRef = useRef('')
  const areaRef = useRef<number | undefined>()
  const maxYRef = useRef<number>(0)
  const xAxisRef = useRef<number[]>([])
  const [xAxisDomain, setXAxisDomain] = useState<string[] | number[]>(hasPoints ? DEFAULT_X_AXIS : [0, 100])

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
    if (val < 1) return val.toPrecision(4)
    if (val < 10) return val.toPrecision(1)
    return val.toFixed(0)
  }, [])

  useEffect(() => {
    if (!points.length) return
    const { precision, smoothCount } = getConfig(points[0].x, points.length)
    const displayList: HighlightPoint[] = []
    const pointMaxIndex = points.length - 1
    for (let i = 0; i < pointMaxIndex; i++) {
      const point = points[i]
      const nextPoint = points[i + 1]
      displayList.push(point)
      maxYRef.current = Math.max(maxYRef.current, point.y, nextPoint.y)
      // add more points to chart to smooth line
      if (!showCurrentPriceOnly || smoothCount > 0) {
        const gap = Number(((nextPoint.x - point.x) / smoothCount).toFixed(precision))
        for (let j = 1; j <= smoothCount; j++) {
          const y = j > Math.floor(smoothCount / 2) ? nextPoint.y : point.y
          displayList.push({ x: point.x + gap * j, y, z: y })
        }
      }
    }
    if (pointMaxIndex > 0) displayList.push(points[pointMaxIndex])

    boundaryRef.current = { min: points[0].x, max: points[points.length - 1].x }
    setDisplayList(displayList)
    setXAxisDomain(DEFAULT_X_AXIS)
  }, [points, showCurrentPriceOnly])

  useEffect(() => {
    setPosition({
      [Range.Min]: Number(defaultMin?.toFixed(6)),
      [Range.Max]: Number(defaultMax?.toFixed(6))
    })
  }, [defaultMin, defaultMax])

  useEffect(() => {
    if (isMoving) return
    setDisplayList((list) => {
      return [
        ...list.map((point) => ({
          x: point.x,
          y: point.y,
          z:
            toFixedNumber(point.x) >= toFixedNumber(position[Range.Min]) &&
            toFixedNumber(point.x) <= toFixedNumber(position[Range.Max])
              ? point.y
              : undefined
        }))
      ]
    })
  }, [isMoving, position])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.addEventListener('mouseup', handleMouseUp)
    isMobile && window.addEventListener('pointerup', handleMouseUp)
    return () => {
      window.removeEventListener('mouseup', handleMouseUp)
      isMobile && window.removeEventListener('pointerup', handleMouseUp)
    }
  }, [isMobile])

  const handleMove = useCallback((e: any) => {
    if (!moveRef.current || !e) return
    // move center area
    if (moveRef.current === 'area') {
      if (areaRef.current === undefined) {
        areaRef.current = e.activeLabel
        return
      }
      const diff = e.activeLabel - areaRef.current
      areaRef.current = e.activeLabel
      setPosition((pos) => {
        const [newLeft, newRight] = [pos[Range.Min] + diff, pos[Range.Max] + diff]
        return {
          [Range.Min]: newLeft <= boundaryRef.current.min ? pos[Range.Min] : newLeft,
          [Range.Max]: newRight >= boundaryRef.current.max ? pos[Range.Max] : newRight
        }
      })
      return
    }
    setPosition((pos) => {
      // when min line > max line
      if (moveRef.current === Range.Min && e.activeLabel >= pos[Range.Max]) {
        moveRef.current = Range.Max
        return { ...pos, right: e.activeLabel }
      }
      // when max line < min line
      if (moveRef.current === Range.Max && e.activeLabel <= pos[Range.Min]) {
        moveRef.current = Range.Min
        return { ...pos, left: e.activeLabel }
      }
      return { ...pos, [moveRef.current]: e.activeLabel }
    })
  }, [])

  const zoomCounterRef = useRef(0)
  const zoomReset = () => {
    setXAxisDomain(DEFAULT_X_AXIS)
    boundaryRef.current = { min: displayList[0].x, max: displayList[displayList.length - 1].x }
    zoomCounterRef.current = 0
  }
  const zoomIn = () => {
    const newRef = zoomCounterRef.current + ZOOM_INTERVAL
    if (newRef >= displayList.length - 1 - newRef) {
      return
    }
    zoomCounterRef.current = newRef
    const [min, max] = [displayList[newRef].x, displayList[displayList.length - 1 - newRef].x]
    boundaryRef.current = { min, max }
    setXAxisDomain([min, max])
    setPosition((pos) => {
      return {
        [Range.Min]: min > pos[Range.Min] ? min : pos[Range.Min],
        [Range.Max]: max < pos[Range.Max] ? max : pos[Range.Max]
      }
    })
  }
  const zoomOut = () => {
    zoomCounterRef.current = zoomCounterRef.current - ZOOM_INTERVAL
    if (zoomCounterRef.current < 0) {
      zoomCounterRef.current = 0
      return
    }
    const [min, max] = [
      displayList[zoomCounterRef.current].x,
      displayList[displayList.length - 1 - zoomCounterRef.current].x
    ]
    boundaryRef.current = { min, max }
    setXAxisDomain([min, max])
  }

  const getMouseEvent = (range: Range) => ({
    onPointerDown: handleMouseDown(range),
    onMouseDown: handleMouseDown(range)
  })

  const getReferenceProps = (range: Range) => {
    const tickGap = xAxisRef.current.length
      ? (xAxisRef.current[1] - xAxisRef.current[0]) / xAxisRef.current.length
      : points.length
      ? (points[points.length - 1].x - points[0].x) / 8 / 8
      : 0
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

  return (
    <>
      {showZoom && (
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
      )}
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
            <Tooltip wrapperStyle={{ display: 'none' }} isAnimationActive={false} cursor={false} active={false} />
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
                style={{ cursor: 'pointer' }}
                onPointerDown={
                  isMobile
                    ? () => {
                        setIsMoving(true)
                        areaRef.current = undefined
                        moveRef.current = 'area'
                      }
                    : undefined
                }
                onMouseDown={() => {
                  setIsMoving(true)
                  areaRef.current = undefined
                  moveRef.current = 'area'
                }}
                x1={position[Range.Min]}
                x2={position[Range.Max]}
                fill={HIGHLIGHT_COLOR}
                fillOpacity="0.3"
              />
            )}
            <ReferenceArea {...getReferenceProps(Range.Min)} />
            <ReferenceArea {...getReferenceProps(Range.Max)} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <PriceRangeInput decimals={6} minValue={position.min} maxValue={position.max} />
    </>
  )
}
