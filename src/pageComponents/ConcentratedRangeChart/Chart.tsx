import { useEffect, useRef, useState, useCallback } from 'react'
import { Fraction } from 'test-r-sdk'
import { ChartPoint, ChartRangeInputOption } from './ConcentratedRangeInputChartBody'
import Icon from '@/components/Icon'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
  Label,
  ReferenceArea,
  Tooltip
} from 'recharts'
import useDevice from '@/hooks/useDevice'
import {
  getPriceLabel,
  Range,
  smoothCount,
  ZOOM_INTERVAL,
  DEFAULT_X_AXIS,
  strokeFillProp,
  toFixedNumber,
  getLabel
} from './chartUtil'

interface HighlightPoint extends ChartPoint {
  z?: number // for highlight select range
}

export default function Chart({
  poolId,
  className,
  chartOptions,
  currentPrice,
  showCurrentPriceOnly,
  hideRangeLine,
  hideXAxis
}: {
  poolId?: string
  className?: string
  chartOptions?: ChartRangeInputOption
  currentPrice?: Fraction
  showCurrentPriceOnly?: boolean
  hideRangeLine?: boolean
  hideXAxis?: boolean
}) {
  const points: HighlightPoint[] = chartOptions?.points || []
  const hasPoints = points.length > 0
  const { isMobile } = useDevice()
  const [displayList, setDisplayList] = useState(points)
  const [isMoving, setIsMoving] = useState(false)
  const [isHover, setIsHover] = useState(false)
  const [position, setPosition] = useState({
    [Range.Min]: points[1]?.x || 10,
    [Range.Max]: points[points.length - 2]?.x || 80
  })
  const boundaryRef = useRef({ min: points[0]?.x || 0, max: points[points.length - 1]?.x || 100 })
  const moveRef = useRef('')
  const areaRef = useRef<number | undefined>()
  const maxYRef = useRef<number>(0)
  const xAxisRef = useRef<number[]>([])
  const tickGap = (xAxisRef.current[1] - xAxisRef.current[0]) / xAxisRef.current.length
  const [xAxisDomain, setXAxisDomain] = useState<string[] | number[]>(hasPoints ? DEFAULT_X_AXIS : [0, 100])

  const handleMouseEnter = useCallback(() => setIsHover(true), [])
  const handleMouseLeave = useCallback(() => setIsHover(false), [])
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
    if (val < 1) val.toFixed(2)
    if (val < 10) val.toFixed(1)
    return val.toFixed(0)
  }, [])

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

  useEffect(() => {
    if (!points.length) return
    const displayList: HighlightPoint[] = []
    const pointMaxIndex = points.length - 1
    for (let i = 0; i < pointMaxIndex; i++) {
      const point = points[i]
      const nextPoint = points[i + 1]
      displayList.push(point)
      maxYRef.current = Math.max(maxYRef.current, point.y, nextPoint.y)
      // add more points to chart to smooth line
      if (!showCurrentPriceOnly || points.length < 1000) {
        const gap = Number(((nextPoint.x - point.x) / smoothCount).toFixed(2))
        for (let j = 1; j <= smoothCount; j++) {
          const y = j > Math.floor(smoothCount / 2) ? nextPoint.y : point.y
          displayList.push({ x: point.x + gap * j, y, z: y })
        }
      }
    }
    if (pointMaxIndex > 0) displayList.push(points[pointMaxIndex])

    boundaryRef.current = { min: points[0].x, max: points[points.length - 1].x }
    setDisplayList(displayList)
    // set default reference line
    setPosition({
      [Range.Min]: points[1].x,
      [Range.Max]: points[pointMaxIndex - 1].x
    })
    setXAxisDomain(DEFAULT_X_AXIS)
  }, [points, showCurrentPriceOnly])

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
  const getReferenceProps = (range: Range) =>
    position[range]
      ? {
          onPointerDown: handleMouseDown(range),
          onMouseDown: handleMouseDown(range),
          x1: position[range] - (range === Range.Min ? 1.6 * tickGap : tickGap / 1.5),
          x2: position[range] + (range === Range.Max ? 1.6 * tickGap : tickGap / 1.5),
          y1: 0,
          y2: maxYRef.current,
          style: { cursor: 'grab' },
          fill: 'transparent',
          isFront: true
        }
      : null

  return (
    <>
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
      <div className="w-full h-[250px] select-none">
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
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
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
            <Area {...strokeFillProp} style={{ cursor: isMoving ? 'grab' : 'default' }} type="monotone" dataKey="z" />
            <Tooltip wrapperStyle={{ display: 'none' }} isAnimationActive={false} cursor={false} active={false} />
            <XAxis
              style={{ userSelect: 'none' }}
              type="number"
              tickCount={8}
              tickFormatter={formatTicks}
              domain={xAxisDomain}
              interval="preserveStartEnd"
              allowDataOverflow={true}
              hide={hideXAxis}
              tickLine={false}
              dataKey="x"
            />
            <YAxis allowDataOverflow domain={['dataMin', 'dataMax']} type="number" hide={true} />
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
                fill="transparent"
              />
            )}
            {!hideRangeLine && position[Range.Min] && (
              <ReferenceLine
                {...strokeFillProp}
                className="cursor-grab"
                isFront={true}
                onPointerDown={isMobile ? handleMouseDown(Range.Min) : undefined}
                onMouseDown={handleMouseDown(Range.Min)}
                x={position[Range.Min]}
                strokeWidth={6}
                label={getLabel(Range.Min)}
              >
                {(isHover || isMoving) && (
                  <Label style={{ userSelect: 'none' }} value="10%" offset={15} position="insideTopRight" />
                )}
              </ReferenceLine>
            )}

            {!hideRangeLine && position[Range.Max] && (
              <ReferenceLine
                {...strokeFillProp}
                className="cursor-grab"
                isFront={true}
                onPointerDown={handleMouseDown(Range.Max)}
                onMouseDown={handleMouseDown(Range.Max)}
                x={position[Range.Max]}
                strokeWidth={6}
                label={getLabel(Range.Max)}
              >
                {(isHover || isMoving) && (
                  <Label style={{ userSelect: 'none' }} value="50%" offset={15} position="insideTopLeft" />
                )}
              </ReferenceLine>
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
            <ReferenceArea {...getReferenceProps(Range.Min)} />
            <ReferenceArea {...getReferenceProps(Range.Max)} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </>
  )
}
