import { getPriceAndTick, getTickPrice } from '@/application/concentrated/getNearistDataPoint'
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

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea, ReferenceLine } from 'recharts'

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
  const { coin1, coin2, currentAmmPool, priceLower, priceUpper, focusSide } = useConcentrated()
  const focusSideCoin = focusSide === 'coin1' ? coin1 : coin2
  const careDecimalLength = coin1 || coin2 ? Math.max(coin1?.decimals ?? 0, coin2?.decimals ?? 0) : 6
  const concentratedChartBodyRef = useRef<ConcentratedRangeInputChartBodyComponentHandler>(null)

  const recordTickAndPrice = (x: Numberish, boundaryType: 'min' | 'max'): Fraction | undefined => {
    if (!currentAmmPool || !coin1 || !coin2) return
    const targetCoin = focusSide === 'coin1' ? coin1 : coin2
    const trimedX = getMax(x, 1 / 10 ** careDecimalLength)
    const { price, tick } = getPriceAndTick({
      poolInfo: currentAmmPool.state,
      baseIn: isMintEqual(currentAmmPool.state.mintA.mint, targetCoin?.mint),
      price: fractionToDecimal(toFraction(trimedX))
    })

    useConcentrated.setState(
      boundaryType === 'min'
        ? focusSide === 'coin1'
          ? { priceLowerTick: tick, priceLower: price }
          : { priceUpperTick: tick, priceUpper: div(1, price) }
        : focusSide === 'coin1'
        ? { priceUpperTick: tick, priceUpper: price }
        : { priceLowerTick: tick, priceLower: div(1, price) }
    )
    // move svg MIN/MAX line
    if (boundaryType === 'min') {
      concentratedChartBodyRef.current?.inputMinBoundaryX(price)
    } else {
      concentratedChartBodyRef.current?.inputMaxBoundaryX(price)
    }
  }

  const getNextPrevPrice = (boundaryType: 'min' | 'max', direct: 'increase' | 'decrease'): Fraction | undefined => {
    const { priceLowerTick, priceUpperTick } = useConcentrated.getState() // wait for react state refresh is slow
    const prevTick =
      boundaryType === 'max'
        ? focusSide === 'coin1'
          ? priceUpperTick
          : priceLowerTick
        : focusSide === 'coin1'
        ? priceLowerTick
        : priceUpperTick
    if (!currentAmmPool || !coin1 || !coin2 || !prevTick) return
    const targetCoin = focusSide === 'coin1' ? coin1 : coin2
    const tickDiff = direct === 'increase' ? (focusSide === 'coin1' ? +1 : -1) : focusSide === 'coin1' ? -1 : +1
    const { price, tick } = getTickPrice({
      poolInfo: currentAmmPool.state,
      baseIn: isMintEqual(currentAmmPool.state.mintA.mint, targetCoin?.mint),
      tick: prevTick + tickDiff
    })
    useConcentrated.setState(
      boundaryType === 'min'
        ? focusSide === 'coin1'
          ? { priceLowerTick: tick, priceLower: price }
          : { priceUpperTick: tick, priceUpper: div(1, price) }
        : focusSide === 'coin1'
        ? { priceUpperTick: tick, priceUpper: price }
        : { priceLowerTick: tick, priceLower: div(1, price) }
    )
    // move svg MIN/MAX line
    if (boundaryType === 'min') {
      concentratedChartBodyRef.current?.inputMinBoundaryX(price)
    } else {
      concentratedChartBodyRef.current?.inputMaxBoundaryX(price)
    }
    return price
  }

  const revertedPoints = useMemo(
    () =>
      chartOptions?.points?.map((p, idx, ps) => {
        return {
          x: 1 / p.x,
          y: ps[(idx - 1 + ps.length) % ps.length].y
        }
      }), // UI NOTE: need to decrease y to handle idle position
    [chartOptions?.points]
  )

  useEffect(() => {
    if (!currentPrice) return
    recordTickAndPrice(currentPrice ? mul(currentPrice, 1 - 0.5) : 0, 'min')
    recordTickAndPrice(currentPrice ? mul(currentPrice, 1 + 0.5) : 0, 'max')
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
        points={focusSide === 'coin1' ? chartOptions?.points : revertedPoints}
        initMinBoundaryX={focusSide === 'coin1' ? priceLower : div(1, priceUpper)}
        initMaxBoundaryX={focusSide === 'coin1' ? priceUpper : div(1, priceLower)}
        careDecimalLength={careDecimalLength}
        anchorX={focusSide === 'coin1' ? currentPrice : div(1, currentPrice)}
        componentRef={concentratedChartBodyRef}
        className="my-2"
        onChangeMinBoundary={({ dataX }) => {
          const x = focusSide === 'coin1' ? dataX : 1 / dataX
          const price = recordTickAndPrice(x, 'min') ?? x
          concentratedChartBodyRef.current?.inputMinBoundaryX(focusSide === 'coin1' ? price : div(1, price))
        }}
        onChangeMaxBoundary={({ dataX }) => {
          const x = focusSide === 'coin1' ? dataX : 1 / dataX
          const price = recordTickAndPrice(x, 'max') ?? x
          concentratedChartBodyRef.current?.inputMaxBoundaryX(focusSide === 'coin1' ? price : div(1, price))
        }}
      />
      <Row className="gap-4">
        <InputBox
          className="grow border border-light-blue-opacity"
          label="Min Price"
          decimalMode
          showPlusMinusControls
          decimalCount={careDecimalLength}
          value={focusSide === 'coin1' ? priceLower : div(1, priceUpper)}
          increaseFn={() => getNextPrevPrice('min', 'increase')}
          decreaseFn={() => getNextPrevPrice('min', 'decrease')}
          onUserInput={(v, { triggerBy }) => {
            if (triggerBy === 'increase-decrease') return // no need to record again
            if (v == null) return
            recordTickAndPrice(v, focusSide === 'coin1' ? 'min' : 'max')
          }}
        />
        <InputBox
          className="grow"
          label="Max Price"
          decimalMode
          showArrowControls
          decimalCount={careDecimalLength}
          value={focusSide === 'coin1' ? priceUpper : div(1, priceLower)}
          increaseFn={() => getNextPrevPrice('max', 'increase')}
          decreaseFn={() => getNextPrevPrice('max', 'decrease')}
          onUserInput={(v, { triggerBy }) => {
            if (triggerBy === 'increase-decrease') return // no need to record again
            if (v == null) return
            recordTickAndPrice(v, focusSide === 'coin1' ? 'max' : 'min')
          }}
        />
      </Row>
    </Col>
  )
}
