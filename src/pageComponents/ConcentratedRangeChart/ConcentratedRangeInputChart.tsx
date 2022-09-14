import { getNearistDataPoint } from '@/application/concentrated/getNearistDataPoint'
import useConcentrated from '@/application/concentrated/useConcentrated'
import { fractionToDecimal } from '@/application/txTools/decimal2Fraction'
import Col from '@/components/Col'
import Icon from '@/components/Icon'
import InputBox from '@/components/InputBox'
import Row from '@/components/Row'
import RowTabs from '@/components/RowTabs'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { div, getMax, mul } from '@/functions/numberish/operations'
import toFraction from '@/functions/numberish/toFraction'
import { toString } from '@/functions/numberish/toString'
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
  const { coin1, coin2, focusSide, coin1Amount, coin2Amount, currentAmmPool, priceLower, priceUpper } =
    useConcentrated()
  const careDecimalLength = coin1 || coin2 ? Math.max(coin1?.decimals ?? 0, coin2?.decimals ?? 0) : 6
  const focusSideCoin = focusSide === 'coin1' ? coin1 : coin2
  const concentratedChartBodyRef = useRef<ConcentratedRangeInputChartBodyComponentHandler>(null)

  useEffect(() => {
    concentratedChartBodyRef.current?.shrinkToView()
  }, [currentAmmPool?.state.id])

  const recordTickAndPrice = (x: Numberish, type: 'min' | 'max'): Fraction | undefined => {
    if (!currentAmmPool || !coin1 || !coin2) return
    const focusCoin = focusSide === 'coin1' ? coin1 : coin2
    const dataX = getMax(x, 1 / 10 ** careDecimalLength)
    const { price, tick } = getNearistDataPoint({
      poolInfo: currentAmmPool.state,
      baseIn: isMintEqual(currentAmmPool.state.mintA.mint, focusCoin?.mint),
      price: focusSide === 'coin1' ? fractionToDecimal(toFraction(dataX)) : fractionToDecimal(toFraction(div(1, dataX))) // SDK force
    })
    useConcentrated.setState(
      type === 'min'
        ? focusSide === 'coin1'
          ? { priceLowerTick: tick, priceLower: price }
          : { priceUpperTick: tick, priceUpper: price }
        : focusSide === 'coin1'
        ? { priceUpperTick: tick, priceUpper: price }
        : { priceLowerTick: tick, priceLower: price }
    )
    return price
  }

  useEffect(() => {
    if (!currentPrice) return
    recordTickAndPrice(currentPrice ? mul(currentPrice, 1 - 0.5) : 0, 'min')
    recordTickAndPrice(currentPrice ? mul(currentPrice, 1 + 0.5) : 0, 'max')
    useConcentrated.setState({ focusSide: 'coin1' })
  }, [poolId])

  return (
    <Col className={twMerge('py-4', className)}>
      <Row className="justify-between items-center">
        <div className=" font-bold text-white">Price Range</div>
        <Row className="items-center gap-2">
          {coin1 && coin2 && (
            <RowTabs
              size="sm"
              currentValue={focusSideCoin?.symbol}
              values={[coin1.symbol ?? '--', coin2?.symbol ?? '--']}
              onChange={(value) => {
                useConcentrated.setState({ focusSide: value === coin1.symbol ? 'coin1' : 'coin2' })
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
        initMinBoundaryX={priceLower}
        initMaxBoundaryX={priceUpper}
        careDecimalLength={careDecimalLength}
        anchorX={currentPrice ? Number(currentPrice?.toSignificant(12 /* write casually */)) : 0}
        componentRef={concentratedChartBodyRef}
        className="my-2"
        onChangeMinBoundary={({ dataX }) => {
          const price = recordTickAndPrice(dataX, 'min')
          if (price) {
            const realPrice = focusSide === 'coin1' ? price : div(1, price)
            concentratedChartBodyRef.current?.inputMinBoundaryX(realPrice)
          } else {
            concentratedChartBodyRef.current?.inputMinBoundaryX(dataX)
          }
        }}
        onChangeMaxBoundary={({ dataX }) => {
          const price = recordTickAndPrice(dataX, 'max')
          if (price) {
            const realPrice = focusSide === 'coin1' ? price : div(1, price)
            concentratedChartBodyRef.current?.inputMaxBoundaryX(realPrice)
          } else {
            concentratedChartBodyRef.current?.inputMaxBoundaryX(dataX)
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
          decimalCount={careDecimalLength}
          value={focusSide === 'coin1' ? priceLower : div(1, priceUpper)}
          onUserInput={(v) => {
            if (v == null) return
            const price = recordTickAndPrice(v, 'min')
            if (price == null) return
            concentratedChartBodyRef.current?.inputMinBoundaryX(price)
          }}
        />
        <InputBox
          className="grow"
          label="Max Price"
          decimalMode
          showArrowControls
          decimalCount={careDecimalLength}
          value={focusSide === 'coin1' ? priceUpper : div(1, priceLower)}
          onUserInput={(v) => {
            if (v == null) return
            const price = recordTickAndPrice(v, 'max')
            if (price == null) return
            concentratedChartBodyRef.current?.inputMaxBoundaryX(price)
          }}
        />
      </Row>
    </Col>
  )
}
