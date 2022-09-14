import { useMemo } from 'react'
import { ChartPoint } from './ConcentratedRangeInputChartBody'

export type ZoomedChartPoint = {
  vx: number
  vy: number
  originalDataPoint: ChartPoint
}

function polygonChartPoints(points: ZoomedChartPoint[]): ZoomedChartPoint[] {
  if (!points.length) return []
  const intervalDistance = points.length === 1 ? 1 /* casually */ : points[1].vx - points[0].vx
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
    const lastPoint = points[Math.max(points.length - 1, 0)]
    return [{ ...firstPoint, vx: firstPoint.vx, vy: 0 }, ...points, { ...lastPoint, xv: lastPoint.vx, vy: 0 }]
  }
  return appandHeadTailZero(getSqared(points))
}

export function useCalcVisiablePoints(
  points: ChartPoint[],
  {
    svgInnerWidth,
    zoomVX,
    offsetVX,
    sideHiddenScreenCount = 1
  }: { svgInnerWidth: number; zoomVX: number; offsetVX: number; sideHiddenScreenCount?: number }
) {
  /** to avoid too small point (ETH-RAY may have point {x: 0.00021, y: 0.0003}) */
  const { dataZoomX, dataZoomY, dataZoomedPoints, diffX } = useMemo(() => {
    const diffX =
      points.length > 1
        ? points[1].x - points[0].x
        : points.length === 1
        ? points[0].x - 0 // TEST
        : 1
    const dataZoomX = 1 / diffX
    const diffY = Math.max(...points.map((co) => co.y)) || 1 /* fallback for diffY is zero */
    const dataZoomY = 1 / diffY
    const dataZoomedPoints = points.map(
      (p) => ({ vx: p.x * dataZoomX, vy: p.y * dataZoomY, originalDataPoint: p } as ZoomedChartPoint)
    )
    return { dataZoomX, dataZoomY, dataZoomedPoints, diffX }
  }, [points])
  const screenWidthVX = svgInnerWidth / zoomVX
  const [minVX, maxVX] = [
    offsetVX - sideHiddenScreenCount * screenWidthVX,
    offsetVX + (sideHiddenScreenCount + 1) * screenWidthVX
  ]

  const filteredZoomedOptimizedPoints = useMemo(() => {
    const needRenderedPoints = dataZoomedPoints.filter((p) => minVX < p.vx && p.vx < maxVX)
    const optimized = optimizePoints(needRenderedPoints, zoomVX)
    return optimized
  }, [minVX, maxVX, zoomVX])

  const polygonPoints = useMemo(
    () => polygonChartPoints(filteredZoomedOptimizedPoints),
    [filteredZoomedOptimizedPoints]
  )
  return { filteredZoomedOptimizedPoints, polygonPoints, dataZoomX, dataZoomY, dataZoomedPoints, diffX }
}

type UnitXAxis = {
  vx: number
  unitValue: number | string
}

export function genXAxisUnit(options: { dataZoom: number; viewZoom: number; fromDataX: number; toDataX: number }) {
  const totalZoom = options.dataZoom * options.viewZoom

  // bigger unit zoom, lesser x Axis units
  const baseUnitZoom = 100

  // how many units in data: 0 ~ 1
  const unitDiff = (1 * baseUnitZoom) / totalZoom

  const firstUnit = Math.floor(options.fromDataX / unitDiff) * unitDiff
  const unitCount = Math.floor((options.toDataX - options.fromDataX) / unitDiff)

  const xValues = Array.from({ length: unitCount }, (_, i) => firstUnit + unitDiff * i)
  const units: UnitXAxis[] = xValues.map((value) => ({ vx: options.dataZoom * value, unitValue: value }))
  return units
}

/**
 * get rid of unnecessary points if there is too much points
 */
function optimizePoints(points: ZoomedChartPoint[], zoomVX: number): ZoomedChartPoint[] {
  const tooFewPoints = points.length < 2
  const tooBigZoom = zoomVX >= 1
  if (tooFewPoints || tooBigZoom) return points
  const firstPoint = points[0]
  const lastPoint = points[points.length - 1]
  const optimizedPointCount = Math.ceil(points.length * zoomVX)
  const optimizedPointWidth = (lastPoint.vx - firstPoint.vx) / optimizedPointCount
  const firstFormatPoint = Math.floor(firstPoint.vx / optimizedPointWidth)
  const lastFormatPoint = Math.ceil(lastPoint.vx / optimizedPointWidth)
  const groupBuckets = Array.from({ length: lastFormatPoint - firstFormatPoint + 1 }, (_) => [] as ZoomedChartPoint[])
  for (const item of points) {
    groupBuckets[Math.floor(item.vx / optimizedPointWidth) - firstFormatPoint].push(item)
  }
  const optimizedPoints = groupBuckets.filter((i) => i.length > 0).map((i) => i[Math.floor(i.length / 2)])
  return optimizedPoints
}
