import { handleMouseWheel, HandleMouseWheelOnWheel } from '@/functions/dom/gesture/handleMouseWheel'
import {
  attachPointerMove,
  AttachPointerMovePointMoveFn,
  AttachPointerMovePointUpFn
} from '@/functions/dom/gesture/pointerMove'
import { isNumber } from '@/functions/judgers/dateType'
import { shrinkToValue } from '@/functions/shrinkToValue'
import { useEvent } from '@/hooks/useEvent'
import useResizeObserver from '@/hooks/useResizeObserver'
import { useSignalState } from '@/hooks/useSignalState'
import { RefObject, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { genXAxisUnit, useCalcVisiablePoints } from './utils'

export type ChartPoint = {
  x: number
  y: number
}

export interface ConcentratedRangeInputChartBodyComponentHandler {
  accurateDecimalLength: number
  zoomIn: (options?: { degree?: number; align?: 'left' | 'center' | 'right' }) => void
  zoomOut: (options?: { degree?: number; align?: 'left' | 'center' | 'right' }) => void
  moveMinBoundaryVX: (options: { forceOffsetFromZero?: boolean; offset: number; setReactState?: boolean }) => void
  moveMaxBoundaryVX: (options: { forceOffsetFromZero?: boolean; offset: number; setReactState?: boolean }) => void
  inputMinBoundaryX: (x: number) => void
  inputMaxBoundaryX: (x: number) => void
  shrinkToView: () => void
}

export type ChartRangeInputOption = {
  className?: string
  points: ChartPoint[]
  /**
   * because ChartRangeInput is through math is through JS Number \
   * it may cause tiny decimal like 3.000000000000000000001 \
   * so trim it will be better
   */
  careDecimalLength?: number
  initMinBoundaryX?: number
  initMaxBoundaryX?: number
  componentRef?: RefObject<any>
  onChangeMinBoundary?: (nearestDataPoint: ChartPoint) => void
  onChangeMaxBoundary?: (nearestDataPoint: ChartPoint) => void
}

/**
 * NOTE:
 * x --> data x \
 * vx --> view x (x in the chart)
 */
export function ConcentratedRangeInputChartBody({
  className,
  points,
  careDecimalLength = 6,
  initMinBoundaryX,
  initMaxBoundaryX,
  componentRef,
  onChangeMinBoundary,
  onChangeMaxBoundary
}: ChartRangeInputOption) {
  //#region ------------------- config -------------------
  const lineColor = '#abc4ff80'
  const minBoundaryLineColor = '#abc4ff'
  const maxBoundaryLineColor = '#abc4ff'
  const xAxisColor = '#abc4ff80'
  const xAxisUnitColor = xAxisColor
  const [svgInnerWidth, setSvgInnerWidth, svgInnerWidthSignal] = useSignalState(300)
  const [svgInnerHeight, setSvgInnerHeight] = useState(200)
  const xAxisAboveBottom = 30
  // zoom won't make data change
  const [zoom, setZoom] = useState(1)
  const [offsetVX, setOffsetVX] = useState(0)
  const boundaryLineWidth = 6
  const minDistanceOfMinBoundaryAndMaxBoundary = 0 // user may have very very little diff
  const {
    polygonPoints,
    filteredZoomedOptimizedPoints: filteredZoomedPoints,
    dataZoomedPoints,
    dataZoomX,
    diffX
  } = useCalcVisiablePoints(points, {
    svgInnerWidth,
    zoomVX: zoom,
    offsetVX
  })
  const accurateDecimalLength = Math.max(String(diffX).length - 2, 0) // TODO this algorithm is very rough

  const units = filteredZoomedPoints.length
    ? genXAxisUnit({
        dataZoom: dataZoomX,
        viewZoom: zoom,
        fromDataX: filteredZoomedPoints[0].originalDataPoint.x,
        toDataX: filteredZoomedPoints[Math.max(filteredZoomedPoints.length - 1, 0)].originalDataPoint.x
      })
    : []
  //#endregion

  const wrapperRef = useRef<SVGSVGElement>(null)
  const minBoundaryRef = useRef<SVGUseElement>(null)
  const maxBoundaryRef = useRef<SVGUseElement>(null)

  const [minBoundaryVX, setMinBoundaryVX] = useState((initMinBoundaryX ?? 0) * dataZoomX)
  const [maxBoundaryVX, setMaxBoundaryVX] = useState(
    (initMaxBoundaryX ?? svgInnerWidth) * dataZoomX - boundaryLineWidth
  )

  //#region ------------------- handle min boundaryLine -------------------
  const handleGrabMinBoundary: AttachPointerMovePointMoveFn<SVGUseElement> = useEvent(({ totalDelta }): void => {
    moveMinBoundaryVX({ offset: totalDelta.dx / zoom })
  })
  const handleGrabMinBoundaryEnd: AttachPointerMovePointUpFn<SVGUseElement> = useEvent(({ totalDelta }): void => {
    moveMinBoundaryVX({ offset: totalDelta.dx / zoom, setReactState: true })
  })
  useEffect(() => {
    if (!minBoundaryRef.current) return
    const { cancel } = attachPointerMove(minBoundaryRef.current, {
      move: handleGrabMinBoundary,
      end: handleGrabMinBoundaryEnd
    })
    return cancel
  }, [])
  //#endregion

  //#region ------------------- handle max boundaryLine -------------------
  const handleGrabMaxBoundary: AttachPointerMovePointMoveFn<SVGUseElement> = useEvent(({ totalDelta }): void => {
    moveMaxBoundaryVX({ offset: totalDelta.dx / zoom })
  })
  const handleGrabMaxBoundaryEnd: AttachPointerMovePointUpFn<SVGUseElement> = useEvent(({ totalDelta }): void => {
    moveMaxBoundaryVX({ offset: totalDelta.dx / zoom, setReactState: true })
  })
  useEffect(() => {
    if (!maxBoundaryRef.current) return
    const { cancel } = attachPointerMove(maxBoundaryRef.current, {
      move: handleGrabMaxBoundary,
      end: handleGrabMaxBoundaryEnd
    })
    return cancel
  }, [])
  //#endregion

  //#region ------------------- handle moving wrapper -------------------
  const handleMoveWrapper: AttachPointerMovePointMoveFn<SVGSVGElement> = useEvent(({ el, totalDelta }) => {
    el.setAttribute('viewBox', `${offsetVX - totalDelta.dx / zoom} 0 ${svgInnerWidth / zoom} ${svgInnerHeight}`)
  })
  const handleMoveWrapperEnd: AttachPointerMovePointUpFn<SVGSVGElement> = useEvent(({ el, totalDelta }) => {
    const newOffsetX = offsetVX - totalDelta.dx / zoom
    setOffsetVX(newOffsetX)
  })
  useEffect(() => {
    if (!wrapperRef.current) return
    const { cancel } = attachPointerMove(wrapperRef.current, {
      move: handleMoveWrapper,
      end: handleMoveWrapperEnd
    })
    return cancel
  }, [])
  //#endregion

  //#region ------------------- handle zooming wrapper -------------------
  const handleZoomWrapper: HandleMouseWheelOnWheel<SVGSVGElement> = useEvent(({ el, totalDelta }) => {
    el.setAttribute('viewBox', `${offsetVX - totalDelta.dx / zoom} 0 ${svgInnerWidth / zoom} ${svgInnerHeight}`)
  })
  useEffect(() => {
    if (!wrapperRef.current) return
    const { cancel } = handleMouseWheel(wrapperRef.current, {
      onWheel: ({ ev }) => (ev.deltaY > 0 ? zoomOut({ align: 'center' }) : zoomIn({ align: 'center' }))
    })
    return cancel
  }, [])
  //#endregion

  //#region ------------------- methods -------------------
  const shrinkToView = (forceSvgWidth = svgInnerWidth) => {
    const diff = Math.abs(maxBoundaryVX - minBoundaryVX)
    const newZoom = forceSvgWidth / (diff * 1.2)
    const newOffsetX = minBoundaryVX - (forceSvgWidth / newZoom - diff) / 2
    setZoom(newZoom)
    setOffsetVX(newOffsetX)
  }

  const zoomIn = useEvent(((options) => {
    const newZoom = zoom * Math.min(1 + 0.1 * (options?.degree ?? 1), 6)
    setZoom(newZoom)
    if (options?.align === 'center') {
      const zoomedOffsetX = svgInnerWidth / zoom / 2 - svgInnerWidth / newZoom / 2
      setOffsetVX((n) => n + zoomedOffsetX)
    } else if (options?.align === 'right') {
      const zoomedOffsetX = svgInnerWidth / zoom - svgInnerWidth / newZoom
      setOffsetVX((n) => n + zoomedOffsetX)
    }
  }) as ConcentratedRangeInputChartBodyComponentHandler['zoomIn'])

  const zoomOut = useEvent(((options) => {
    const newZoom = zoom * Math.max(1 - 0.1 * (options?.degree ?? 1), 0.4)
    setZoom(newZoom)
    if (options?.align === 'center') {
      const zoomedOffsetX = svgInnerWidth / zoom / 2 - svgInnerWidth / newZoom / 2
      setOffsetVX((n) => n + zoomedOffsetX)
    } else if (options?.align === 'right') {
      const zoomedOffsetX = svgInnerWidth / zoom - svgInnerWidth / newZoom
      setOffsetVX((n) => n + zoomedOffsetX)
    }
  }) as ConcentratedRangeInputChartBodyComponentHandler['zoomOut'])

  /** x is between aPoint and bPoint */
  const getNearestZoomedPointByVX = (x: number) => {
    const bIndex = dataZoomedPoints.findIndex((p) => p.vx > x)
    if (bIndex < 0) return dataZoomedPoints[dataZoomedPoints.length - 1]
    if (bIndex === 0) return dataZoomedPoints[0]
    const b = dataZoomedPoints[bIndex]
    const a = dataZoomedPoints[Math.max(bIndex - 1, 0)]
    const diffB = Math.abs(b.vx - x)
    const diffA = Math.abs(a.vx - x)
    return diffB <= diffA ? b : a
  }

  const moveMinBoundaryVX: ConcentratedRangeInputChartBodyComponentHandler['moveMinBoundaryVX'] = (options) => {
    const clampVX = (newVX: number) =>
      Math.min(Math.max(newVX, 0), maxBoundaryVX - minDistanceOfMinBoundaryAndMaxBoundary)
    const clampedVX = clampVX(options.forceOffsetFromZero ? options.offset : minBoundaryVX + options.offset)
    minBoundaryRef.current?.setAttribute('x', String(clampedVX))
    if (options.setReactState) {
      setMinBoundaryVX(clampedVX)
      const nearestPoint = getNearestZoomedPointByVX(clampedVX)
      nearestPoint &&
        onChangeMinBoundary?.({
          x: trimUnnecessaryDecimal(nearestPoint.originalDataPoint.x, careDecimalLength),
          y: trimUnnecessaryDecimal(nearestPoint.originalDataPoint.y, careDecimalLength)
        })
    }
  }

  const inputMinBoundaryX: ConcentratedRangeInputChartBodyComponentHandler['inputMinBoundaryX'] = (dataX) =>
    moveMinBoundaryVX({ forceOffsetFromZero: true, offset: dataX * dataZoomX, setReactState: true })

  const moveMaxBoundaryVX = (options: { forceOffsetFromZero?: boolean; offset: number; setReactState?: boolean }) => {
    const clampVX = (newVX: number) => Math.max(newVX, minBoundaryVX + minDistanceOfMinBoundaryAndMaxBoundary)
    const clampedVX = clampVX(options.forceOffsetFromZero ? options.offset : maxBoundaryVX + options.offset)
    maxBoundaryRef.current?.setAttribute('x', String(clampedVX))
    if (options.setReactState) {
      setMaxBoundaryVX(clampedVX)
      const nearestPoint = getNearestZoomedPointByVX(clampedVX)
      nearestPoint &&
        onChangeMaxBoundary?.({
          x: trimUnnecessaryDecimal(nearestPoint.originalDataPoint.x, careDecimalLength),
          y: trimUnnecessaryDecimal(nearestPoint.originalDataPoint.y, careDecimalLength)
        })
    }
  }

  const inputMaxBoundaryX: ConcentratedRangeInputChartBodyComponentHandler['inputMaxBoundaryX'] = (dataX) =>
    moveMaxBoundaryVX({ forceOffsetFromZero: true, offset: dataX * dataZoomX, setReactState: true })

  useImperativeHandle<any, ConcentratedRangeInputChartBodyComponentHandler>(componentRef, () => ({
    accurateDecimalLength,
    zoomIn,
    zoomOut,
    moveMinBoundaryVX,
    moveMaxBoundaryVX,
    inputMinBoundaryX,
    inputMaxBoundaryX,
    shrinkToView
  }))
  //#endregion

  useResizeObserver(wrapperRef, ({ el, entry }) => {
    // TODO:
    if (el.clientWidth !== svgInnerWidthSignal()) {
      setSvgInnerWidth(el.clientWidth)
      setSvgInnerHeight(el.clientHeight)
      if (!initMaxBoundaryX) setMaxBoundaryVX(el.clientWidth - boundaryLineWidth)
      // init shrink to view
      shrinkToView(el.clientWidth)
    }
  })

  const trimUnnecessaryDecimal = (n: number, careDecimalLength: number) => Number(n.toFixed(careDecimalLength))

  return (
    <svg
      ref={wrapperRef}
      className={twMerge('cursor-grab active:cursor-grabbing select-none', className)}
      viewBox={`${offsetVX} 0 ${svgInnerWidth / zoom} ${svgInnerHeight}`}
      preserveAspectRatio="none"
      width="100%"
      height={svgInnerHeight}
      style={{ touchAction: 'none', transform: 'translateZ(0)' }}
    >
      <defs>
        {/* min boundary */}
        <g id="min-boundary-brush">
          <rect
            className="no-scale-align-center cursor-pointer"
            x={0}
            y={0}
            width={boundaryLineWidth}
            height={svgInnerHeight - xAxisAboveBottom}
            fill={minBoundaryLineColor}
          />
          <rect
            className="no-scale-align-center cursor-pointer"
            rx="2"
            width={16}
            height={32}
            fill={minBoundaryLineColor}
          />
          {/* <text
            className="no-scale break-words"
            fill="#141041"
            y="16"
            x="-1.3"
            style={{
              writingMode: 'vertical-lr',
              fontWeight: 'bold',
              fontSize: 12,
              letterSpacing: 1
            }}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            MIN
          </text> */}
        </g>
        <g id="max-boundary-brush">
          <rect
            className="no-scale-align-center rota cursor-pointer"
            x={0}
            y={0}
            width={boundaryLineWidth}
            height={svgInnerHeight - xAxisAboveBottom}
            fill={maxBoundaryLineColor}
          />
          <rect
            className="no-scale-align-center cursor-pointer"
            rx="2"
            width={16}
            height={32}
            fill={maxBoundaryLineColor}
          />
          {/* <text
            className="no-scale break-words"
            fill="#141041"
            y="16"
            x="-1.3"
            style={{
              writingMode: 'vertical-lr',
              fontWeight: 'bold',
              fontSize: 12,
              letterSpacing: 1
            }}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            MAX
          </text> */}
        </g>
        <style>
          {`
            .no-scale-align-center {
              transform: translate(-50%, 0%) scale(${1 / zoom},1);
              transform-box: fill-box;
              transform-origin: center;
            }
          `}
        </style>
      </defs>

      <polygon
        className="pointer-events-none"
        points={polygonPoints
          .map((p) => `${p.vx.toFixed(0)},${(svgInnerHeight - p.vy - xAxisAboveBottom).toFixed(0)}`)
          .join(' ')}
        fill={lineColor}
      />

      {/* min boundary */}
      <use
        href="#min-boundary-brush"
        style={{ touchAction: 'none' }}
        ref={minBoundaryRef}
        x={Math.max(minBoundaryVX, 0)}
        y={0}
      />

      {/* max boundary */}
      <use
        href="#max-boundary-brush"
        style={{ touchAction: 'none' }}
        ref={maxBoundaryRef}
        x={Math.max(maxBoundaryVX, 0)}
        y={0}
      />

      {/* x axis line */}
      <line
        x1="0"
        y1={svgInnerHeight - xAxisAboveBottom}
        x2={9999999}
        y2={svgInnerHeight - xAxisAboveBottom}
        stroke={xAxisColor}
        fill="none"
        strokeWidth="1"
      ></line>

      {/* x units */}
      <g>
        {units.map(({ vx, unitValue }) => (
          <text
            // className="no-scale"
            key={vx}
            y={svgInnerHeight - (2 / 3) * xAxisAboveBottom} //  3/4 psition  of  xAxisAboveBottom
            x={vx}
            fill={xAxisUnitColor}
            style={{
              fontSize: 10,
              transition: '75ms'
            }}
            // idea from https://stackoverflow.com/questions/61272308/why-does-webkit-safari-ios-macos-render-my-svg-transformations-in-a-different
            transform={`translate(${vx}, ${svgInnerHeight / 2}) scale(${1 / zoom}, 1) translate(${-vx}, ${
              -svgInnerHeight / 2
            })`}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {isNumber(unitValue) ? trimUnnecessaryDecimal(unitValue, careDecimalLength / 3) : unitValue}
          </text>
        ))}
      </g>
    </svg>
  )
}
