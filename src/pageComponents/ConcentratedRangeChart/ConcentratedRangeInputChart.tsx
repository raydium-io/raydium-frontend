import { getNearistDataPoint } from '@/application/concentrated/getNearistDataPoint'
import useConcentrated from '@/application/concentrated/useConcentrated'
import { fractionToDecimal, recursivelyDecimalToFraction } from '@/application/txTools/decimal2Fraction'
import Col from '@/components/Col'
import Icon from '@/components/Icon'
import InputBox from '@/components/InputBox'
import Row from '@/components/Row'
import RowTabs from '@/components/RowTabs'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { div, mul } from '@/functions/numberish/operations'
import toFraction from '@/functions/numberish/toFraction'
import { toString } from '@/functions/numberish/toString'
import { trimUnnecessaryDecimal } from '@/functions/numberish/trimUnnecessaryDecimal'
import { Numberish } from '@/types/constants'
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
  const { coin1, coin2, focusSide, coin1Amount, coin2Amount, currentAmmPool } = useConcentrated()
  const [minPrice, setMinPrice] = useState<Numberish>(currentPrice ? mul(currentPrice, 1 - 0.5) : 0)
  const [maxPrice, setMaxPrice] = useState<Numberish>(currentPrice ? mul(currentPrice, 1 + 0.5) : 0)
  useEffect(() => {
    setMinPrice(currentPrice ? mul(currentPrice, 1 - 0.5) : 0)
    setMaxPrice(currentPrice ? mul(currentPrice, 1 + 0.5) : 0)
  }, [poolId])
  const concentratedChartBodyRef = useRef<ConcentratedRangeInputChartBodyComponentHandler>(null)
  const careDecimalLength = 6 // TEST TEMP
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
              className="saturate-50 brightness-125" // TEMP
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
          if (coin1 && coin2 && currentAmmPool) {
            const focusCoin = focusSide === 'coin1' ? coin1 : coin2
            const { price, tick } = getNearistDataPoint({
              poolInfo: currentAmmPool.state,
              baseIn: isMintEqual(currentAmmPool.state.mintA.mint, focusCoin?.mint),
              price:
                focusSide === 'coin1' ? fractionToDecimal(toFraction(dataX)) : fractionToDecimal(toFraction(1 / dataX)) // SDK force
            })
            const calcPrice = focusSide === 'coin1' ? price : div(1, price)
            useConcentrated.setState(
              focusSide === 'coin1'
                ? { priceLowerTick: tick, priceLower: calcPrice }
                : { priceUpperTick: tick, priceUpper: calcPrice }
            )
            setMinPrice(price)
            concentratedChartBodyRef.current?.inputMinBoundaryX(price)
          }
        }}
        onChangeMaxBoundary={({ dataX }) => {
          if (coin1 && coin2 && currentAmmPool) {
            const focusCoin = focusSide === 'coin1' ? coin1 : coin2
            const { price, tick } = getNearistDataPoint({
              poolInfo: currentAmmPool.state,
              baseIn: isMintEqual(currentAmmPool.state.mintA.mint, focusCoin?.mint),
              price:
                focusSide === 'coin1' ? fractionToDecimal(toFraction(dataX)) : fractionToDecimal(toFraction(1 / dataX)) // SDK force
            })
            const calcPrice = focusSide === 'coin1' ? price : div(1, price)
            useConcentrated.setState(
              focusSide === 'coin1'
                ? { priceUpperTick: tick, priceUpper: calcPrice }
                : { priceLowerTick: tick, priceLower: calcPrice }
            )
            setMaxPrice(price)
            concentratedChartBodyRef.current?.inputMaxBoundaryX(price)
          }
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
