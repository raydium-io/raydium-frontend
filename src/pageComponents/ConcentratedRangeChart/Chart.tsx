import useConcentrated from '@/application/concentrated/useConcentrated'
import Col from '@/components/Col'
import Icon from '@/components/Icon'
import InputBox from '@/components/InputBox'
import Row from '@/components/Row'
import RowTabs from '@/components/RowTabs'
import { useRef } from 'react'
import { twMerge } from 'tailwind-merge'
import { ChartFormBodyComponentHandler, ConcentratedChartBody } from './ChartBody'

const mokeChartData = Array.from({ length: 200 }, (_, i) => ({ x: i * 10, y: 180 * Math.random() }))
export function ConcentratedChart({ className }: { className?: string }) {
  const coin1 = useConcentrated((s) => s.coin1)
  const coin2 = useConcentrated((s) => s.coin2)
  const concentratedChartBodyRef = useRef<ChartFormBodyComponentHandler>(null)
  return (
    <Col className={twMerge('py-4', className)}>
      <Row className="justify-between items-center">
        <div className="text-lg text-white">Price Range</div>
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
                concentratedChartBodyRef.current?.setZoom((s) => s * 1.1)
              }}
            />
            <Icon
              className="text-[#abc4ff] saturate-50 brightness-125"
              heroIconName="zoom-out"
              onClick={() => {
                concentratedChartBodyRef.current?.setZoom((s) => s * 0.9)
              }}
            />
          </Row>
        </Row>
      </Row>
      <ConcentratedChartBody componentRef={concentratedChartBodyRef} points={mokeChartData} className="my-2" />
      <Row className="gap-4">
        <InputBox className="grow" label="Min Price" decimalMode />
        <InputBox className="grow" label="Max Price" decimalMode />
      </Row>
    </Col>
  )
}
