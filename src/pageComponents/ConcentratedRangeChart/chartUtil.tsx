export enum Range {
  Min = 'min',
  Max = 'max'
}
export const smoothCount = 20
export const ZOOM_INTERVAL = 4
export const REFERENCE_LINE_COLOR = '#abc4ff'
export const HIGHLIGHT_COLOR = '#1B365F'
export const strokeFillProp = {
  stroke: '#256491',
  fill: '#256491'
}
export const DEFAULT_X_AXIS = ['dataMin', 'dataMax']

export const getConfig = (num: number, totalCount: number) => {
  const config = { precision: 1, smoothCount: 10 }
  if (num < 0.1) config.precision = 6
  else if (num < 1) config.precision = 4
  else if (num < 100) config.precision = 2

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
          fill={strokeFillProp.fill}
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
        y={props.viewBox.y - 10}
        x={props.viewBox.x - 2}
        style={{
          fontWeight: '500',
          fontSize: 10
        }}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        Current Price {price}
      </text>
    </g>
  ) : (
    <g></g>
  )
}
