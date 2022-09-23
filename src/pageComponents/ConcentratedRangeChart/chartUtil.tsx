export enum Range {
  Min = 'min',
  Max = 'max'
}
export const smoothCount = 20
export const ZOOM_INTERVAL = 4
export const REFERENCE_LINE_COLOR = '#abc4ff'
export const HIGHLIGHT_COLOR = '#39D0D8'
export const strokeFillProp = {
  stroke: '#39D0D8',
  fill: '#39D0D8'
}
export const DEFAULT_X_AXIS = ['dataMin - 1', 'dataMax + 1']
export const toFixedNumber = (num: number, digits = 6) => (num ? parseFloat(num.toFixed(digits)) : 0)
export const getLabel = (side: Range) => (props) => {
  return (
    <g>
      <rect
        x={props.viewBox.x - (side === Range.Min ? 12 : 0)}
        y={props.viewBox.y}
        fill={HIGHLIGHT_COLOR}
        width={12}
        height={30}
      />
    </g>
  )
}

export const getPriceLabel = (price?: number | string) => (props) => {
  return price ? (
    <g>
      <text
        className="break-words"
        fill="#FFF"
        y={props.viewBox.y - 10}
        x={props.viewBox.x - 2}
        style={{
          fontWeight: 'bold',
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
