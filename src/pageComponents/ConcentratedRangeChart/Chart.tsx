import useConcentrated from '@/application/concentrated/useConcentrated'
import Col from '@/components/Col'
import Icon from '@/components/Icon'
import InputBox from '@/components/InputBox'
import Row from '@/components/Row'
import RowTabs from '@/components/RowTabs'
import { useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { ChartFormBodyComponentHandler, ChartRangeInputOption, ConcentratedChartBody } from './ChartBody'

const mokeChartData = Array.from({ length: 5000000 }, (_, i) => ({ x: i * 0.01, y: 0.01 * Math.random() }))
export function ConcentratedChart({
  className,
  chartOptions
}: {
  className?: string
  chartOptions?: ChartRangeInputOption
}) {
  const coin1 = useConcentrated((s) => s.coin1)
  const coin2 = useConcentrated((s) => s.coin2)
  const [minPrice, setMinPrice] = useState(0.8)
  const [maxPrice, setMaxPrice] = useState(2.8)
  const concentratedChartBodyRef = useRef<ChartFormBodyComponentHandler>(null)
  return (
    <Col className={twMerge('py-4', className)}>
      <Row className="justify-between items-center">
        <div className=" font-bold text-white">Price Range</div>
        <Row className="items-center gap-2">
          {coin1 && coin2 && (
            <RowTabs
              size="sm"
              currentValue={coin1.symbol}
              values={[coin1.symbol ?? '--', coin2?.symbol ?? '--']}
              onChange={() => {
                // ONGOING
              }}
            />
          )}
          <Row className="gap-2">
            <Icon
              className="saturate-50 brightness-125"
              iconSrc="/icons/chart-add-white-space.svg"
              onClick={() => {
                concentratedChartBodyRef.current?.shrinkToView()
              }}
            />
            <Icon
              className="text-[#abc4ff] saturate-50 brightness-125"
              heroIconName="zoom-in"
              onClick={() => {
                concentratedChartBodyRef.current?.zoomIn({ align: 'center' })
              }}
              canLongClick
            />
            <Icon
              className="text-[#abc4ff] saturate-50 brightness-125"
              heroIconName="zoom-out"
              onClick={() => {
                concentratedChartBodyRef.current?.zoomOut({ align: 'center' })
              }}
              canLongClick
            />
          </Row>
        </Row>
      </Row>
      <ConcentratedChartBody
        initMinBoundaryX={minPrice}
        initMaxBoundaryX={maxPrice}
        componentRef={concentratedChartBodyRef}
        points={mokeChartData}
        className="my-2"
        onChangeMinBoundary={(nearestPoint) => {
          setMinPrice(nearestPoint.x)
        }}
        onChangeMaxBoundary={(nearestPoint) => {
          setMaxPrice(nearestPoint.x)
        }}
        {...chartOptions}
      />
      <Row className="gap-4">
        <InputBox
          className="grow"
          label="Min Price"
          decimalMode
          value={minPrice}
          onUserInput={(v) => {
            concentratedChartBodyRef.current?.inputMinBoundaryX(Number(v))
          }}
        />
        <InputBox
          className="grow"
          label="Max Price"
          decimalMode
          value={maxPrice}
          onUserInput={(v) => {
            concentratedChartBodyRef.current?.inputMaxBoundaryX(Number(v))
          }}
        />
      </Row>
    </Col>
  )
}
