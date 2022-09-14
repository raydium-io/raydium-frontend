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
import { Numberish } from '@/types/constants'
import { useEffect, useMemo, useRef } from 'react'
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
  const { coin1, coin2, focusSide, currentAmmPool, priceLower, priceUpper, tabReversed } = useConcentrated()
  const careDecimalLength = coin1 || coin2 ? Math.max(coin1?.decimals ?? 0, coin2?.decimals ?? 0) : 6
  const focusSideCoin = !tabReversed ? coin1 : coin2
  const concentratedChartBodyRef = useRef<ConcentratedRangeInputChartBodyComponentHandler>(null)

  useEffect(() => {
    concentratedChartBodyRef.current?.shrinkToView()
  }, [currentAmmPool?.state.id, tabReversed])

  const recordTickAndPrice = (x: Numberish, type: 'min' | 'max'): Fraction | undefined => {
    if (!currentAmmPool || !coin1 || !coin2) return
    const targetCoin = tabReversed ? coin2 : coin1
    const dataX = getMax(x, 1 / 10 ** careDecimalLength)
    const { price, tick } = getNearistDataPoint({
      poolInfo: currentAmmPool.state,
      baseIn: isMintEqual(currentAmmPool.state.mintA.mint, targetCoin?.mint),
      price: fractionToDecimal(toFraction(dataX))
    })
    useConcentrated.setState(
      type === 'min'
        ? !tabReversed
          ? { priceLowerTick: tick, priceLower: price }
          : { priceUpperTick: tick, priceUpper: price }
        : !tabReversed
        ? { priceUpperTick: tick, priceUpper: price }
        : { priceLowerTick: tick, priceLower: price }
    )
    return price
  }

  const revertedPoints = useMemo(
    () => chartOptions?.points?.map((p) => ({ x: 1 / p.x, y: p.y })),
    [chartOptions?.points]
  )

  useEffect(() => {
    if (!currentPrice) return
    recordTickAndPrice(currentPrice ? mul(currentPrice, 1 - 0.5) : 0, 'min')
    recordTickAndPrice(currentPrice ? mul(currentPrice, 1 + 0.5) : 0, 'max')
    useConcentrated.setState({ tabReversed: false })
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
                useConcentrated.setState({ tabReversed: value === coin2.symbol })
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
        points={!tabReversed ? chartOptions?.points : revertedPoints}
        initMinBoundaryX={!tabReversed ? priceLower : div(1, priceUpper)}
        initMaxBoundaryX={!tabReversed ? priceUpper : div(1, priceLower)}
        careDecimalLength={careDecimalLength}
        anchorX={!tabReversed ? currentPrice : div(1, currentPrice)}
        componentRef={concentratedChartBodyRef}
        className="my-2"
        onChangeMinBoundary={({ dataX }) => {
          const x = !tabReversed ? dataX : 1 / dataX
          const price = recordTickAndPrice(x, 'min') ?? x
          concentratedChartBodyRef.current?.inputMinBoundaryX(!tabReversed ? price : div(1, price))
        }}
        onChangeMaxBoundary={({ dataX }) => {
          const x = !tabReversed ? dataX : 1 / dataX
          const price = recordTickAndPrice(x, 'max') ?? x
          concentratedChartBodyRef.current?.inputMaxBoundaryX(!tabReversed ? price : div(1, price))
        }}
      />
      <Row className="gap-4">
        <InputBox
          className="grow"
          label="Min Price"
          decimalMode
          showArrowControls
          decimalCount={careDecimalLength}
          value={!tabReversed ? priceLower : div(1, priceUpper)}
          onUserInput={(v) => {
            if (v == null) return
            const price = recordTickAndPrice(v, !tabReversed ? 'min' : 'max')
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
          value={!tabReversed ? priceUpper : div(1, priceLower)}
          onUserInput={(v) => {
            if (v == null) return
            const price = recordTickAndPrice(v, !tabReversed ? 'max' : 'min')
            if (price == null) return
            concentratedChartBodyRef.current?.inputMaxBoundaryX(price)
          }}
        />
      </Row>
    </Col>
  )
}
