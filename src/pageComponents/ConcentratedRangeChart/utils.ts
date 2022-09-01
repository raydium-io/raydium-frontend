import { useMemo } from 'react'
import { ChartPoint } from './ConcentratedRangeInputChartBody'

export type ZoomedChartPoint = {
  vx: number
  vy: number
  originalDataPoint: ChartPoint
}

function polygonChartPoints(points: ZoomedChartPoint[]): ZoomedChartPoint[] {
  if (!points.length) return []
  if (points.length === 1)
    return points.flatMap((p) => [
      p,
      {
        ...p,
        vy: p.vy,
        vx: p.vx * 2
      }
    ])

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

export function useCalcVisiablePoints(
  points: ChartPoint[],
  {
    svgInnerWidth,
    zoomVX,
    offsetVX,
    sideHiddenScreenCount = 2
  }: { svgInnerWidth: number; zoomVX: number; offsetVX: number; sideHiddenScreenCount?: number }
) {
  /** to avoid too small point (ETH-RAY may have point {x: 0.00021, y: 0.0003}) */
  const { dataZoomX, dataZoomY, zoomedPoints, diffX } = useMemo(() => {
    const diffX = points.length > 1 ? points[1].x - points[0].x : 999 // TEST
    const dataZoomX = 1 / diffX
    const diffY = 0.00006 // TEST
    const dataZoomY = 1 / diffY
    const zoomedPoints = points.map(
      (p) => ({ vx: p.x * dataZoomX, vy: p.y * dataZoomY, originalDataPoint: p } as ZoomedChartPoint)
    )
    return { dataZoomX, dataZoomY, zoomedPoints, diffX }
  }, points)
  const [sideMinVX, sideMaxVX] = [
    offsetVX - Math.max(sideHiddenScreenCount - 1, 0) * (svgInnerWidth / zoomVX),
    offsetVX + (sideHiddenScreenCount + 1) * (svgInnerWidth / zoomVX)
  ]

  const filteredZoomedOptimizedPoints = useMemo(() => {
    const needRenderedPoints = zoomedPoints.filter((p) => sideMinVX < p.vx && p.vx < sideMaxVX)
    return optimizePoints(needRenderedPoints, zoomVX)
  }, [sideMinVX, sideMaxVX, zoomVX])

  const polygonPoints = useMemo(
    () => polygonChartPoints(filteredZoomedOptimizedPoints),
    [filteredZoomedOptimizedPoints]
  )
  return { filteredZoomedOptimizedPoints, polygonPoints, dataZoomX, dataZoomY, zoomedPoints, diffX }
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
  const tooFew = points.length < 2
  const tooLittleView = zoomVX >= 1
  if (tooFew || tooLittleView) return points

  const firstPoint = points[0]
  const lastPoint = points[points.length - 1]
  const optimizedPoints: ZoomedChartPoint[] = []
  let idx = 0
  for (let groupI = Math.floor(firstPoint.vx); groupI <= Math.floor(lastPoint.vx); groupI++) {
    const groupBucket: ZoomedChartPoint[] = []
    while (points[idx] && Math.floor(points[idx].vx / zoomVX) === groupI) {
      groupBucket.push(points[idx])
      idx++
    }
    const mediumPoint = groupBucket[Math.floor(groupBucket.length / 2)]
    mediumPoint && optimizedPoints.push(mediumPoint)
  }
  return optimizedPoints
}
