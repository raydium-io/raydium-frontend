import useConcentrated from '@/application/concentrated/useConcentrated'
import Col from '@/components/Col'
import Icon from '@/components/Icon'
import InputBox from '@/components/InputBox'
import Row from '@/components/Row'
import RowTabs from '@/components/RowTabs'
import { mul } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'
import { trimUnnecessaryDecimal } from '@/functions/numberish/trimUnnecessaryDecimal'
import { useEffect, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { Fraction } from 'test-r-sdk'
import {
  ChartRangeInputOption,
  ConcentratedRangeInputChartBody,
  ConcentratedRangeInputChartBodyComponentHandler
} from './ConcentratedRangeInputChartBody'

// Temp const mokeChartData = Array.from({ length: 50000 }, (_, i) => ({ x: i * 0.01, y: 0.01 * Math.random() }))
export function ConcentratedRangeInputChart({
  poolId,
  className,
  chartOptions,
  currentPrice
}: {
  poolId?: string
  className?: string
  chartOptions?: ChartRangeInputOption
  currentPrice?: Fraction
}) {
  const coin1 = useConcentrated((s) => s.coin1)
  const coin2 = useConcentrated((s) => s.coin2)
  const [minPrice, setMinPrice] = useState(currentPrice ? Number(toString(mul(currentPrice, 1 - 0.5))) : 0)
  const [maxPrice, setMaxPrice] = useState(currentPrice ? Number(toString(mul(currentPrice, 1 + 0.5))) : 0)
  useEffect(() => {
    setMinPrice(currentPrice ? Number(toString(mul(currentPrice, 1 - 0.5))) : 0)
    setMaxPrice(currentPrice ? Number(toString(mul(currentPrice, 1 + 0.5))) : 0)
  }, [poolId])
  const concentratedChartBodyRef = useRef<ConcentratedRangeInputChartBodyComponentHandler>(null)
  const careDecimalLength = 6 // TEMP
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
              className="saturate-50 brightness-125 hidden" // TEMP
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
      <ConcentratedRangeInputChartBody
        initMinBoundaryX={minPrice}
        initMaxBoundaryX={maxPrice}
        careDecimalLength={careDecimalLength}
        anchorX={currentPrice ? Number(currentPrice?.toSignificant(12 /* write casually */)) : 0}
        componentRef={concentratedChartBodyRef}
        className="my-2"
        onChangeMinBoundary={({ dataX }) => {
          setMinPrice(trimUnnecessaryDecimal(dataX, careDecimalLength))
        }}
        onChangeMaxBoundary={({ dataX }) => {
          setMaxPrice(trimUnnecessaryDecimal(dataX, careDecimalLength))
        }}
        {...chartOptions}
      />
      <Row className="gap-4">
        <InputBox
          className="grow"
          label="Min Price"
          decimalMode
          showArrowControls
          decimalCount={concentratedChartBodyRef.current?.accurateDecimalLength}
          value={minPrice}
          onUserInput={(v) => {
            concentratedChartBodyRef.current?.inputMinBoundaryX(Number(v))
          }}
        />
        <InputBox
          className="grow"
          label="Max Price"
          decimalMode
          showArrowControls
          decimalCount={concentratedChartBodyRef.current?.accurateDecimalLength}
          value={maxPrice}
          onUserInput={(v) => {
            concentratedChartBodyRef.current?.inputMaxBoundaryX(Number(v))
          }}
        />
      </Row>
    </Col>
  )
}
