import { shakeFalsyItem } from '@/functions/arrayMethods'
import { Dispatch, RefObject, SetStateAction, useImperativeHandle, useState } from 'react'
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
  const lineColor = '#abc4ff'
  const xAxisColor = '#abc4ff80'
  const xAxisUnitColor = xAxisColor
  const maxPrice = Math.max(...points.map((p) => p.y))
  const minPrice = Math.min(...points.map((p) => p.y))
  const diff = maxPrice - minPrice
  const xLength = points.length
  const svgInnerWidth = 300
  const svgInnerHeight = 200
  const xAxisAboveBottom = 30
  const [zoom, setZoom] = useState(1)

  useImperativeHandle<any, ChartFormBodyComponentHandler>(componentRef, () => ({
    setZoom
  }))
  const polygonPoints = polygonChartPoints(points)
  return (
    <svg
      className={className}
      viewBox={`0 0 ${svgInnerWidth} ${svgInnerHeight}`}
      style={{ outline: '1px solid red !important', transition: '75ms' }}
    >
      <polygon
        vectorEffect="non-scaling-stroke"
        points={polygonPoints.map((p) => `${p.x * zoom},${svgInnerHeight - p.y - xAxisAboveBottom}`).join(' ')}
        fill={lineColor}
      />

      {/* x axis */}
      <line
        x1="0"
        y1={svgInnerHeight - xAxisAboveBottom}
        x2={svgInnerWidth}
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
