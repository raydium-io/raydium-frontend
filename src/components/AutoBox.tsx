import Col, { ColProps } from './Col'
import Grid, { GridProps } from './Grid'
import Row, { RowProps } from './Row'

export interface AutoBoxProps extends ColProps {
  is?: 'Row' | 'Col' | 'Grid' | ''
  ColProps?: ColProps
  RowProps?: RowProps
  GridProps?: GridProps
}

export default function AutoBox({ is, ColProps, RowProps, GridProps, ...restProps }: AutoBoxProps) {
  return is === 'Row' ? (
    <Row {...restProps} {...RowProps} />
  ) : is === 'Col' ? (
    <Col {...restProps} {...ColProps} />
  ) : is === 'Grid' ? (
    <Grid {...restProps} {...GridProps} />
  ) : (
    <>{restProps.children}</>
  )
}
