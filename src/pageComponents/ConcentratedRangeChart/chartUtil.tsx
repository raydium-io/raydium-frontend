import { Fraction } from 'test-r-sdk'
import { ChartPoint } from '../Concentrated/type'
export enum Range {
  Min = 'min',
  Max = 'max'
}
export const smoothCount = 20
export const ZOOM_INTERVAL = 5
export const REFERENCE_LINE_COLOR = '#abc4ff'
export const HIGHLIGHT_COLOR = '#1B365F'
export const strokeFillProp = {
  fill: '#abc4ff',
  stroke: '#abc4ff'
}
export const unitColor = '#abc4ff80'
export const boundaryColor = '#256491'
export const DEFAULT_X_AXIS = ['dataMin', 'dataMax']

export const getConfig = (num: number, totalCount: number) => {
  const config = { precision: 1, smoothCount: 10 }
  if (num < 0.1) config.precision = 4
  else if (num < 1) config.precision = 2
  else if (num < 100) config.precision = 1

  if (totalCount < 100) config.smoothCount = 20
  if (totalCount >= 1000) config.smoothCount = 0

  return config
}
export const toFixedNumber = (num: number | string, digits = 6) => (num ? parseFloat(Number(num).toFixed(digits)) : 0)
export const getLabel =
  (labelProps: { side: Range; onPointerDown?: () => void; onMouseDown?: () => void }) => (props) => {
    const { side, ...rest } = labelProps
    return (
      <g {...rest}>
        <rect
          x={props.viewBox.x - (side === Range.Min ? 12 : 0)}
          y={props.viewBox.y}
          fill={boundaryColor}
          width={12}
          height={28}
          rx="2"
        />
        <rect
          x={props.viewBox.x - (side === Range.Min ? 4 : -4)}
          y={props.viewBox.y + 10}
          fill="#FFF"
          width={1}
          height={10}
        />
        <rect
          x={props.viewBox.x - (side === Range.Min ? 7 : -7)}
          y={props.viewBox.y + 10}
          fill="#FFF"
          width={1}
          height={10}
        />
      </g>
    )
  }

export const getPriceLabel = (price?: number | string) => (props) => {
  return price ? (
    <g>
      <text
        className="break-words"
        fill="#ABC4FF"
        y={props.viewBox.y - 23}
        x={props.viewBox.x - 2}
        style={{
          fontWeight: '500',
          fontSize: 12
        }}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        Current Price:
      </text>
      <text
        className="break-words"
        fill="#ABC4FF"
        y={props.viewBox.y - 10}
        x={props.viewBox.x - 2}
        style={{
          fontWeight: '500',
          fontSize: 12
        }}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {price}
      </text>
    </g>
  ) : (
    <g></g>
  )
}

export const getDefaultPointOffset = (props: {
  points: ChartPoint[]
  defaultMin?: Fraction
  defaultMax?: Fraction
  decimals: number
  showCurrentPriceOnly?: boolean
}): { offsetMin: number; offsetMax: number } => {
  const { points, defaultMin, defaultMax, decimals, showCurrentPriceOnly } = props
  const offsets = { offsetMin: 0, offsetMax: 0 }
  if (showCurrentPriceOnly) {
    const getIndex = (price: Fraction) =>
      points.findIndex((p) => Number(p.x.toFixed(decimals)) === Number(price.toFixed(decimals)))
    if (defaultMin) {
      const idx = getIndex(defaultMin)
      if (idx > 0) offsets.offsetMin = (points[idx].x - points[idx - 1].x) / 2
    }
    if (defaultMax) {
      const idx = getIndex(defaultMax)
      if (idx > 0) offsets.offsetMax = (points[idx].x - points[idx - 1].x) / 2
    }
  }
  return offsets
}
