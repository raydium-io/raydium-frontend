import { shakeFalsyItem } from '@/functions/arrayMethods'
import {
  attachPointerMove,
  AttachPointerMovePointMoveFn,
  AttachPointerMovePointUpFn
} from '@/functions/dom/gesture/pointerMove'
import { useEvent } from '@/hooks/useEvent'
import { Dispatch, RefObject, SetStateAction, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'

export type ChartPoint = {
  x: number
  y: number
}

function polygonChartPoints(points: ChartPoint[]): ChartPoint[] {
  /** used in last point */
  const intervalDistance = points[1].x - points[0].x
  const getSqared = (points: ChartPoint[]) =>
    points.flatMap((p, idx, points) => [
      {
        // leftTopPoint:
        x: p.x,
        y: p.y
      },
      {
        // rightTopPoint:
        y: p.y,
        x: points[idx + 1]?.x ?? p.x + intervalDistance
      }
    ])
  const appandHeadTailZero = (points: ChartPoint[]) => {
    const firstPoint = points[0]
    const lastPoint = points[points.length - 1]
    return [{ x: firstPoint.x, y: 0 }, ...points, { x: lastPoint.x, y: 0 }]
  }
  return appandHeadTailZero(getSqared(points))
}

export interface ChartFormBodyComponentHandler {
  zoomIn: (options?: { degree?: number; /* TODO imply  */ align?: 'left' | 'center' | 'right' }) => void
  zoomOut: (options?: { degree?: number; /* TODO imply  */ align?: 'left' | 'center' | 'right' }) => void
  moveMinBoundaryX: (options: { forceOffsetFromZero?: boolean; offset: number; setReactState?: boolean }) => void
  moveMaxBoundaryX: (options: { forceOffsetFromZero?: boolean; offset: number; setReactState?: boolean }) => void
  inputMinBoundaryX: (x: number) => void
  inputMaxBoundaryX: (x: number) => void
  shrinkToView: () => void
}

export type ChartRangeInputOption = {
  className?: string
  points: ChartPoint[]
  initMinBoundaryX?: number
  initMaxBoundaryX?: number
  componentRef?: RefObject<any>
  onChangeMinBoundary?: (nearest: ChartPoint) => void
  onChangeMaxBoundary?: (nearest: ChartPoint) => void
}

export function ConcentratedChartBody({
  className,
  points,
  initMinBoundaryX,
  initMaxBoundaryX,
  componentRef,
  onChangeMinBoundary,
  onChangeMaxBoundary
}: ChartRangeInputOption) {
  const polygonPoints = polygonChartPoints(points)

  const lineColor = '#abc4ff80'
  const boundaryLineColor = '#abc4ff'
  const xAxisColor = '#abc4ff80'
  const xAxisUnitColor = xAxisColor
  const [svgInnerWidth, setSvgInnerWidth] = useState(300)
  const [svgInnerHeight, setSvgInnerHeight] = useState(200)
  const xAxisAboveBottom = 30
  const [zoom, setZoom] = useState(1)
  const [offsetX, setOffsetX] = useState(0)
  const boundaryLineWidth = 6
  const minDistanceOfMinBoundaryAndMaxBoundary = boundaryLineWidth
  // const minBoundaryX = useRef(0)
  const [minBoundaryX, setMinBoundaryX] = useState(initMinBoundaryX ?? 0)
  const [maxBoundaryX, setMaxBoundaryX] = useState(initMaxBoundaryX ?? svgInnerWidth - boundaryLineWidth)

  const wrapperRef = useRef<SVGSVGElement>(null)
  const minBoundaryRef = useRef<SVGUseElement>(null)
  const maxBoundaryRef = useRef<SVGUseElement>(null)

  //#region ------------------- handle min boundaryLine -------------------
  const handleGrabMinBoundary: AttachPointerMovePointMoveFn<SVGUseElement> = useEvent(({ totalDelta }): void => {
    moveMinBoundaryX({ offset: totalDelta.dx / zoom })
  })
  const handleGrabMinBoundaryEnd: AttachPointerMovePointUpFn<SVGUseElement> = useEvent(({ totalDelta }): void => {
    moveMinBoundaryX({ offset: totalDelta.dx / zoom, setReactState: true })
  })
  useEffect(() => {
    if (!minBoundaryRef.current) return
    attachPointerMove(minBoundaryRef.current, {
      move: handleGrabMinBoundary,
      end: handleGrabMinBoundaryEnd
    })
  }, [])
  //#endregion

  //#region ------------------- handle max boundaryLine -------------------
  const handleGrabMaxBoundary: AttachPointerMovePointMoveFn<SVGUseElement> = useEvent(({ totalDelta }): void => {
    moveMaxBoundaryX({ offset: totalDelta.dx / zoom })
  })
  const handleGrabMaxBoundaryEnd: AttachPointerMovePointUpFn<SVGUseElement> = useEvent(({ totalDelta }): void => {
    moveMaxBoundaryX({ offset: totalDelta.dx / zoom, setReactState: true })
  })
  useEffect(() => {
    if (!maxBoundaryRef.current) return
    attachPointerMove(maxBoundaryRef.current, {
      move: handleGrabMaxBoundary,
      end: handleGrabMaxBoundaryEnd
    })
  }, [])
  //#endregion

  //#region ------------------- handle wrapper -------------------
  const handleGrabWrapper: AttachPointerMovePointMoveFn<SVGSVGElement> = useEvent(({ el, totalDelta }) => {
    el.setAttribute('viewBox', `${offsetX - totalDelta.dx / zoom} 0 ${svgInnerWidth / zoom} ${svgInnerHeight}`)
  })
  const handleGrabWrapperEnd: AttachPointerMovePointUpFn<SVGSVGElement> = useEvent(({ el, totalDelta }) => {
    const newOffsetX = offsetX - totalDelta.dx / zoom
    setOffsetX(newOffsetX)
  })
  useEffect(() => {
    if (!wrapperRef.current) return
    attachPointerMove(wrapperRef.current, {
      move: handleGrabWrapper,
      end: handleGrabWrapperEnd
    })
  }, [])
  //#endregion

  //#region ------------------- methods -------------------
  const shrinkToView = (forceSvgWidth = svgInnerWidth) => {
    const diff = Math.abs(maxBoundaryX - minBoundaryX)
    const newZoom = forceSvgWidth / (diff * 1.2)
    const newOffsetX = minBoundaryX - (forceSvgWidth / newZoom - diff) / 2
    setZoom(newZoom)
    setOffsetX(newOffsetX)
  }
  const zoomIn = (options?: { degree?: number; /* TODO imply  */ align?: 'left' | 'center' | 'right' }) => {
    setZoom((n) => n * Math.min(1 + 0.1 * (options?.degree ?? 1), 6))
  }
  const zoomOut = (options?: { degree?: number; /* TODO imply  */ align?: 'left' | 'center' | 'right' }) => {
    setZoom((n) => n * Math.max(1 - 0.1 * (options?.degree ?? 1), 0.4))
  }

  /** x is between aPoint and bPoint */
  const getNearestPintByX = (x: number) => {
    const bIndex = points.findIndex((p) => p.x > x)
    if (!bIndex || bIndex === 0) return
    const b = points[bIndex]
    const a = points[bIndex - 1]
    const diffB = Math.abs(b.x - x)
    const diffA = Math.abs(a.x - x)
    return diffB <= diffA ? b : a
  }

  const moveMinBoundaryX = (options: { forceOffsetFromZero?: boolean; offset: number; setReactState?: boolean }) => {
    const clampX = (newX: number) => Math.min(Math.max(newX, 0), maxBoundaryX - minDistanceOfMinBoundaryAndMaxBoundary)
    const clampedX = clampX(options.forceOffsetFromZero ? options.offset : minBoundaryX + options.offset)
    minBoundaryRef.current?.setAttribute('x', String(clampedX))
    if (options.setReactState) {
      setMinBoundaryX(clampedX)
      const nearestPoint = getNearestPintByX(clampedX)
      nearestPoint && onChangeMinBoundary?.(nearestPoint)
    }
  }
  const inputMinBoundaryX = (x: number) =>
    moveMinBoundaryX({ forceOffsetFromZero: true, offset: x, setReactState: true })
  const moveMaxBoundaryX = (options: { forceOffsetFromZero?: boolean; offset: number; setReactState?: boolean }) => {
    const clampX = (newX: number) => Math.max(newX, minBoundaryX + minDistanceOfMinBoundaryAndMaxBoundary)
    const clampedX = clampX(options.forceOffsetFromZero ? options.offset : maxBoundaryX + options.offset)
    maxBoundaryRef.current?.setAttribute('x', String(clampedX))
    if (options.setReactState) {
      setMaxBoundaryX(clampedX)
      const nearestPoint = getNearestPintByX(clampedX)
      nearestPoint && onChangeMaxBoundary?.(nearestPoint)
    }
  }
  const inputMaxBoundaryX = (x: number) =>
    moveMaxBoundaryX({ forceOffsetFromZero: true, offset: x, setReactState: true })

  useImperativeHandle<any, ChartFormBodyComponentHandler>(componentRef, () => ({
    zoomIn,
    zoomOut,
    moveMinBoundaryX,
    moveMaxBoundaryX,
    inputMinBoundaryX,
    inputMaxBoundaryX,
    shrinkToView
  }))
  //#endregion

  useEffect(() => {
    if (!wrapperRef.current) return
    setSvgInnerWidth(wrapperRef.current.clientWidth)
    setSvgInnerHeight(wrapperRef.current.clientHeight)
    if (!initMaxBoundaryX) setMaxBoundaryX(wrapperRef.current.clientWidth - boundaryLineWidth)

    // init shrink to view
    shrinkToView(wrapperRef.current.clientWidth)
  }, [wrapperRef])
  return (
    <svg
      ref={wrapperRef}
      className={twMerge('cursor-grab active:cursor-grabbing select-none', className)}
      viewBox={`${offsetX} 0 ${svgInnerWidth / zoom} ${svgInnerHeight}`}
      preserveAspectRatio="none"
      width={'100%'}
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
          .map((p) => `${p.x.toFixed(3)},${(svgInnerHeight - p.y - xAxisAboveBottom).toFixed(3)}`)
          .join(' ')}
        fill={lineColor}
      />

      {/* min boundary */}
      <use href="#boundary-brush" ref={minBoundaryRef} x={Math.max(minBoundaryX, 0)} y={0} />

      {/* max boundary */}
      <use href="#boundary-brush" ref={maxBoundaryRef} x={Math.max(maxBoundaryX, 0)} y={0} />

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
          points.map((p) => {
            const x = p.x
            const shouldRender = !(x % 40)
            return shouldRender ? (
              <text
                className="no-scale"
                key={p.x}
                y={svgInnerHeight - (3 / 4) * xAxisAboveBottom} /*  3/4 psition  of  xAxisAboveBottom */
                x={x}
                fill={xAxisUnitColor}
                style={{
                  fontSize: 8,
                  transition: '75ms'
                }}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {x}
              </text>
            ) : null
          })
        )}
      </g>
    </svg>
  )
}
