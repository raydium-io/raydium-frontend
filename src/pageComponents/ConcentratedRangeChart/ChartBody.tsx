import { shakeFalsyItem } from '@/functions/arrayMethods'
import {
  attachPointerMove,
  AttachPointerMovePointMoveFn,
  AttachPointerMovePointUpFn
} from '@/functions/dom/gesture/pointerMove'
import { useEvent } from '@/hooks/useEvent'
import { RefObject, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'

export type ChartPoint = {
  x: number
  y: number
}

function polygonChartPoints(points: ZoomedChartPoint[]): ZoomedChartPoint[] {
  /** used in last point */
  const intervalDistance = points[1].vx - points[0].vx
  const getSqared = (points: ZoomedChartPoint[]) =>
    points.flatMap((p, idx, points) => [
      p,
      {
        ...p,
        // rightTopPoint:
        vy: p.vy,
        vx: points[idx + 1]?.vx ?? p.vx + intervalDistance
      }
    ])
  const appandHeadTailZero = (points: ZoomedChartPoint[]) => {
    const firstPoint = points[0]
    const lastPoint = points[points.length - 1]
    return [{ ...firstPoint, vx: firstPoint.vx, vy: 0 }, ...points, { ...lastPoint, xv: lastPoint.vx, vy: 0 }]
  }
  return appandHeadTailZero(getSqared(points))
}

export interface ChartFormBodyComponentHandler {
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
export function ConcentratedChartBody({
  className,
  points,
  careDecimalLength = 6,
  initMinBoundaryX,
  initMaxBoundaryX,
  componentRef,
  onChangeMinBoundary,
  onChangeMaxBoundary
}: ChartRangeInputOption) {
  const lineColor = '#abc4ff80'
  const boundaryLineColor = '#abc4ff'
  const xAxisColor = '#abc4ff80'
  const xAxisUnitColor = xAxisColor
  const [svgInnerWidth, setSvgInnerWidth] = useState(300)
  const [svgInnerHeight, setSvgInnerHeight] = useState(200)
  const xAxisAboveBottom = 30
  // zoom won't make data change
  const [zoom, setZoom] = useState(1)
  const [offsetVX, setOffsetVX] = useState(0)
  const boundaryLineWidth = 6
  const minDistanceOfMinBoundaryAndMaxBoundary = boundaryLineWidth
  const { polygonPoints, filteredZoomedPoints, zoomedPoints, dataZoomX, diffX } = useCalcVisiablePoints(points, {
    svgInnerWidth,
    zoom,
    offsetVX
  })
  const accurateDecimalLength = Math.max(String(diffX).length - 2, 0) // TODO this algorithm is very rough
  const [minBoundaryVX, setMinBoundaryVX] = useState((initMinBoundaryX ?? 0) * dataZoomX)
  const [maxBoundaryVX, setMaxBoundaryVX] = useState(
    (initMaxBoundaryX ?? svgInnerWidth) * dataZoomX - boundaryLineWidth
  )

  const wrapperRef = useRef<SVGSVGElement>(null)
  const minBoundaryRef = useRef<SVGUseElement>(null)
  const maxBoundaryRef = useRef<SVGUseElement>(null)

  //#region ------------------- handle min boundaryLine -------------------
  const handleGrabMinBoundary: AttachPointerMovePointMoveFn<SVGUseElement> = useEvent(({ totalDelta }): void => {
    moveMinBoundaryVX({ offset: totalDelta.dx / zoom })
  })
  const handleGrabMinBoundaryEnd: AttachPointerMovePointUpFn<SVGUseElement> = useEvent(({ totalDelta }): void => {
    moveMinBoundaryVX({ offset: totalDelta.dx / zoom, setReactState: true })
  })
  useEffect(() => {
    if (!minBoundaryRef.current) return
    const { detatch } = attachPointerMove(minBoundaryRef.current, {
      move: handleGrabMinBoundary,
      end: handleGrabMinBoundaryEnd
    })
    return detatch
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
    const { detatch } = attachPointerMove(maxBoundaryRef.current, {
      move: handleGrabMaxBoundary,
      end: handleGrabMaxBoundaryEnd
    })
    return detatch
  }, [])
  //#endregion

  //#region ------------------- handle wrapper -------------------
  const handleGrabWrapper: AttachPointerMovePointMoveFn<SVGSVGElement> = useEvent(({ el, totalDelta }) => {
    el.setAttribute('viewBox', `${offsetVX - totalDelta.dx / zoom} 0 ${svgInnerWidth / zoom} ${svgInnerHeight}`)
  })
  const handleGrabWrapperEnd: AttachPointerMovePointUpFn<SVGSVGElement> = useEvent(({ el, totalDelta }) => {
    const newOffsetX = offsetVX - totalDelta.dx / zoom
    setOffsetVX(newOffsetX)
  })
  useEffect(() => {
    if (!wrapperRef.current) return
    const { detatch } = attachPointerMove(wrapperRef.current, {
      move: handleGrabWrapper,
      end: handleGrabWrapperEnd
    })
    return detatch
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

  const zoomIn: ChartFormBodyComponentHandler['zoomIn'] = (options) => {
    const newZoom = zoom * Math.min(1 + 0.1 * (options?.degree ?? 1), 6)
    setZoom(newZoom)
    if (options?.align === 'center') {
      const zoomedOffsetX = svgInnerWidth / zoom / 2 - svgInnerWidth / newZoom / 2
      setOffsetVX((n) => n + zoomedOffsetX)
    } else if (options?.align === 'right') {
      const zoomedOffsetX = svgInnerWidth / zoom - svgInnerWidth / newZoom
      setOffsetVX((n) => n + zoomedOffsetX)
    }
  }

  const zoomOut: ChartFormBodyComponentHandler['zoomOut'] = (options) => {
    const newZoom = zoom * Math.max(1 - 0.1 * (options?.degree ?? 1), 0.4)
    setZoom(newZoom)
    if (options?.align === 'center') {
      const zoomedOffsetX = svgInnerWidth / zoom / 2 - svgInnerWidth / newZoom / 2
      setOffsetVX((n) => n + zoomedOffsetX)
    } else if (options?.align === 'right') {
      const zoomedOffsetX = svgInnerWidth / zoom - svgInnerWidth / newZoom
      setOffsetVX((n) => n + zoomedOffsetX)
    }
  }

  /** x is between aPoint and bPoint */
  const getNearestZoomedPointByVX = (x: number) => {
    const bIndex = zoomedPoints.findIndex((p) => p.vx > x)
    if (!bIndex || bIndex === 0) return
    const b = zoomedPoints[bIndex]
    const a = zoomedPoints[bIndex - 1]
    const diffB = Math.abs(b.vx - x)
    const diffA = Math.abs(a.vx - x)
    return diffB <= diffA ? b : a
  }

  const moveMinBoundaryVX: ChartFormBodyComponentHandler['moveMinBoundaryVX'] = (options) => {
    const clampVX = (newVX: number) =>
      Math.min(Math.max(newVX, 0), maxBoundaryVX - minDistanceOfMinBoundaryAndMaxBoundary)
    const clampedVX = clampVX(options.forceOffsetFromZero ? options.offset : minBoundaryVX + options.offset)
    minBoundaryRef.current?.setAttribute('x', String(clampedVX))
    if (options.setReactState) {
      setMinBoundaryVX(clampedVX)
      const nearestPoint = getNearestZoomedPointByVX(clampedVX)
      nearestPoint &&
        onChangeMinBoundary?.({
          x: trimUnnecessaryDecimal(nearestPoint.originalDataPoint.x),
          y: trimUnnecessaryDecimal(nearestPoint.originalDataPoint.y)
        })
    }
  }

  const inputMinBoundaryX: ChartFormBodyComponentHandler['inputMinBoundaryX'] = (dataX) =>
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
          x: trimUnnecessaryDecimal(nearestPoint.originalDataPoint.x),
          y: trimUnnecessaryDecimal(nearestPoint.originalDataPoint.y)
        })
    }
  }

  const inputMaxBoundaryX: ChartFormBodyComponentHandler['inputMaxBoundaryX'] = (dataX) =>
    moveMaxBoundaryVX({ forceOffsetFromZero: true, offset: dataX * dataZoomX, setReactState: true })

  useImperativeHandle<any, ChartFormBodyComponentHandler>(componentRef, () => ({
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

  useEffect(() => {
    if (!wrapperRef.current) return
    setSvgInnerWidth(wrapperRef.current.clientWidth)
    setSvgInnerHeight(wrapperRef.current.clientHeight)
    if (!initMaxBoundaryX) setMaxBoundaryVX(wrapperRef.current.clientWidth - boundaryLineWidth)

    // init shrink to view
    shrinkToView(wrapperRef.current.clientWidth)
  }, [wrapperRef])

  const trimUnnecessaryDecimal = (n: number) => Number(n.toFixed(careDecimalLength))

  return (
    <svg
      ref={wrapperRef}
      className={twMerge('cursor-grab active:cursor-grabbing select-none', className)}
      viewBox={`${offsetVX} 0 ${svgInnerWidth / zoom} ${svgInnerHeight}`}
      preserveAspectRatio="none"
      width="100%"
      height={svgInnerHeight}
    >
      <defs>
        {/* min boundary */}
        <g id="boundary-brush">
          <rect
            className="no-scale-align-center cursor-pointer"
            width={boundaryLineWidth}
            height={svgInnerHeight - xAxisAboveBottom}
            fill={boundaryLineColor}
          />
        </g>
        <style>
          {`
            .no-scale {
              transform: scale(${1 / zoom},1);
              transform-box: fill-box;
              transform-origin: center;
            }

            .align-center {
              transform: translate(-50%, 0%);
              transform-box: fill-box;
              transform-origin: center;
            }

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
      <use href="#boundary-brush" ref={minBoundaryRef} x={Math.max(minBoundaryVX, 0)} y={0} />

      {/* max boundary */}
      <use href="#boundary-brush" ref={maxBoundaryRef} x={Math.max(maxBoundaryVX, 0)} y={0} />

      {/* x axis */}
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
        {shakeFalsyItem(
          filteredZoomedPoints.map((p) => {
            const vx = p.vx
            const shouldRender = !(vx % 40) // FIXME: % 40 is not intelligense. it support that vx is an interger
            return shouldRender ? (
              <text
                className="no-scale"
                key={p.vx}
                y={svgInnerHeight - (3 / 4) * xAxisAboveBottom} /*  3/4 psition  of  xAxisAboveBottom */
                x={vx}
                fill={xAxisUnitColor}
                style={{
                  fontSize: 8,
                  transition: '75ms'
                }}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {trimUnnecessaryDecimal(p.originalDataPoint.x)}
              </text>
            ) : null
          })
        )}
      </g>
    </svg>
  )
}

type ZoomedChartPoint = {
  vx: number
  vy: number
  originalDataPoint: ChartPoint
}
function useCalcVisiablePoints(
  points: ChartPoint[],
  {
    svgInnerWidth,
    zoom,
    offsetVX,
    sideScreenCount = 6
  }: { svgInnerWidth: number; zoom: number; offsetVX: number; sideScreenCount?: number }
) {
  /** to avoid too small point (ETH-RAY may have point {x: 0.00021, y: 0.0003}) */
  const { dataZoomX, dataZoomY, zoomedPoints, diffX } = useMemo(() => {
    const diffX = points[1].x - points[0].x // TEST
    const dataZoomX = 1 / diffX
    const diffY = 0.00006 // TEST
    const dataZoomY = 1 / diffY
    const zoomedPoints = points.map(
      (p) => ({ vx: p.x * dataZoomX, vy: p.y * dataZoomY, originalDataPoint: p } as ZoomedChartPoint)
    )
    return { dataZoomX, dataZoomY, zoomedPoints, diffX }
  }, points)
  const [sideMinVX, sideMaxVX] = [
    offsetVX - (sideScreenCount - 1) * (svgInnerWidth / zoom),
    offsetVX + (sideScreenCount + 1) * (svgInnerWidth / zoom)
  ]
  const filteredZoomedPoints = useMemo(
    () => zoomedPoints.filter((p) => sideMinVX < p.vx && p.vx < sideMaxVX),
    [sideMinVX, sideMaxVX]
  )
  const polygonPoints = useMemo(() => polygonChartPoints(filteredZoomedPoints), [filteredZoomedPoints])
  return { filteredZoomedPoints, polygonPoints, dataZoomX, dataZoomY, zoomedPoints, diffX }
}
