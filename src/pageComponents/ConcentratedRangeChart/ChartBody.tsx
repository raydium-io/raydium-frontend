import { shakeFalsyItem } from '@/functions/arrayMethods'
import {
  attachPointerMove,
  AttachPointerMovePointMoveFn,
  AttachPointerMovePointUpFn
} from '@/functions/dom/gesture/pointerMove'
import { useEvent } from '@/hooks/useEvent'
import { Dispatch, RefObject, SetStateAction, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'

type ChartPoints = {
  x: number
  y: number
}[]

function polygonChartPoints(points: ChartPoints): ChartPoints {
  /** used in last point */
  const intervalDistance = points[1].x - points[0].x
  const getSqared = (points: ChartPoints) =>
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
  const appandHeadTailZero = (points: ChartPoints) => {
    const firstPoint = points[0]
    const lastPoint = points[points.length - 1]
    return [{ x: firstPoint.x, y: 0 }, ...points, { x: lastPoint.x, y: 0 }]
  }
  return appandHeadTailZero(getSqared(points))
}

export interface ChartFormBodyComponentHandler {
  setZoom: Dispatch<SetStateAction<number>>
  shrinkToView: () => void
}

export function ConcentratedChartBody({
  className,
  points,
  componentRef
}: {
  className?: string
  points: ChartPoints
  componentRef?: RefObject<any>
}) {
  const lineColor = '#abc4ff80'
  const boundaryLineColor = '#abc4ff'
  const xAxisColor = '#abc4ff80'
  const xAxisUnitColor = xAxisColor
  const svgInnerWidth = 300
  const svgInnerHeight = 200
  const xAxisAboveBottom = 30
  const [zoom, setZoom] = useState(1)
  const [offsetX, setOffsetX] = useState(0)
  const wrapperRef = useRef<SVGSVGElement>(null)
  const boundaryLineWidth = 4
  const minBoundaryX = useRef(0)
  const maxBoundaryX = useRef(svgInnerWidth - boundaryLineWidth)

  const minBoundaryRef = useRef<SVGRectElement>(null)
  const maxBoundaryRef = useRef<SVGRectElement>(null)

  //#region ------------------- handle min boundaryLine -------------------
  const handleGrabMinBoundary = ({
    el,
    totalDelta
  }: {
    el: SVGRectElement
    ev: PointerEvent
    pointEvents: PointerEvent[]
    currentDelta: { dx: number; dy: number }
    totalDelta: { dx: number; dy: number }
    isFirstEvent: boolean
  }): void => {
    el.setAttribute('x', String(minBoundaryX.current + totalDelta.dx * zoom))
  }
  const handleGrabMinBoundaryUp = ({
    totalDelta
  }: {
    el: SVGRectElement
    ev: PointerEvent // rightTopPoint:
    // rightTopPoint:
    pointEvents: PointerEvent[]
    currentDelta: { dx: number; dy: number }
    totalDelta: { dx: number; dy: number }
    currentSpeed: { x: number; y: number }
  }): void => {
    const newMinBoundaryX = minBoundaryX.current + totalDelta.dx * zoom
    minBoundaryX.current = newMinBoundaryX
  }
  useEffect(() => {
    if (!minBoundaryRef.current) return
    attachPointerMove(minBoundaryRef.current, {
      move: handleGrabMinBoundary,
      end: handleGrabMinBoundaryUp
    })
  }, [])
  //#endregion

  //#region ------------------- handle max boundaryLine -------------------
  const handleGrabMaxBoundary = ({
    el,
    totalDelta
  }: {
    el: SVGRectElement
    ev: PointerEvent
    pointEvents: PointerEvent[]
    currentDelta: { dx: number; dy: number }
    totalDelta: { dx: number; dy: number }
    isFirstEvent: boolean
  }): void => {
    el.setAttribute('x', String(maxBoundaryX.current + totalDelta.dx * zoom))
  }
  const handleGrabMaxBoundaryUp = ({
    totalDelta
  }: {
    el: SVGRectElement
    ev: PointerEvent // rightTopPoint:
    // rightTopPoint:
    pointEvents: PointerEvent[]
    currentDelta: { dx: number; dy: number }
    totalDelta: { dx: number; dy: number }
    currentSpeed: { x: number; y: number }
  }): void => {
    const newMaxBoundaryX = maxBoundaryX.current + totalDelta.dx * zoom
    maxBoundaryX.current = newMaxBoundaryX
  }
  useEffect(() => {
    if (!maxBoundaryRef.current) return
    attachPointerMove(maxBoundaryRef.current, {
      move: handleGrabMaxBoundary,
      end: handleGrabMaxBoundaryUp
    })
  }, [])
  //#endregion

  //#region ------------------- handle wrapper -------------------
  const handleGrabWrapper: AttachPointerMovePointMoveFn<SVGSVGElement> = useEvent(({ el, totalDelta }) => {
    el.setAttribute('viewBox', `${offsetX - totalDelta.dx * zoom} 0 ${svgInnerWidth} ${svgInnerHeight}`)
  })
  const handleGrabWrapperUp: AttachPointerMovePointUpFn<SVGSVGElement> = useEvent(({ el, totalDelta }) => {
    const newOffsetX = offsetX - totalDelta.dx * zoom
    setOffsetX(newOffsetX)
  })
  useEffect(() => {
    if (!wrapperRef.current) return
    attachPointerMove(wrapperRef.current, {
      move: handleGrabWrapper,
      end: handleGrabWrapperUp
    })
  }, [])
  //#endregion

  const shrinkToView = () => {
    const newZoom = (svgInnerWidth - boundaryLineWidth) / Math.abs(maxBoundaryX.current - minBoundaryX.current)
    setZoom(newZoom)
    setOffsetX(minBoundaryX.current)
  }

  useImperativeHandle<any, ChartFormBodyComponentHandler>(componentRef, () => ({
    setZoom,
    shrinkToView
  }))
  const polygonPoints = polygonChartPoints(points)
  return (
    <svg
      ref={wrapperRef}
      className={twMerge('cursor-grab active:cursor-grabbing select-none', className)}
      viewBox={`${offsetX} 0 ${svgInnerWidth} ${svgInnerHeight}`}
      width={svgInnerWidth}
      height={svgInnerHeight}
    >
      <polygon
        className="pointer-events-none"
        vectorEffect="non-scaling-stroke"
        points={polygonPoints
          .map((p) => `${(p.x * zoom).toFixed(3)},${(svgInnerHeight - p.y - xAxisAboveBottom).toFixed(3)}`)
          .join(' ')}
        fill={lineColor}
      />

      {/* min boundary */}
      <rect
        ref={minBoundaryRef}
        width={boundaryLineWidth}
        height={svgInnerHeight - xAxisAboveBottom}
        x={minBoundaryX.current * zoom}
        y={0}
        fill={boundaryLineColor}
        style={{ cursor: 'pointer' }}
      />

      {/* max boundary */}
      <rect
        ref={maxBoundaryRef}
        width={boundaryLineWidth}
        height={svgInnerHeight - xAxisAboveBottom}
        x={maxBoundaryX.current * zoom}
        y={0}
        fill={boundaryLineColor}
        style={{ cursor: 'pointer' }}
      />

      {/* x axis */}
      <line
        x1="0"
        y1={svgInnerHeight - xAxisAboveBottom}
        x2={1000000}
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
                key={p.x}
                y={svgInnerHeight - (3 / 4) * xAxisAboveBottom} /*  3/4 psition  of  xAxisAboveBottom */
                x={x * zoom}
                fill={xAxisUnitColor}
                style={{ fontSize: 8, transition: '75ms' }}
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
