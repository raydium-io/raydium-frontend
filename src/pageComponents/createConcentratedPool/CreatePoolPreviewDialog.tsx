import * as react from 'react'

import { Fraction } from '@raydium-io/raydium-sdk'
import { twMerge } from 'tailwind-merge'

import { ConcentratedStore } from '@/application/concentrated/useConcentrated'
import { SplToken } from '@/application/token/type'
import Button from '@/components/Button'
import Card from '@/components/Card'
import CoinAvatar from '@/components/CoinAvatar'
import Col from '@/components/Col'
import Dialog from '@/components/Dialog'
import Icon from '@/components/Icon'
import Row from '@/components/Row'
import { shakeZero } from '@/functions/numberish/shakeZero'
import { toString } from '@/functions/numberish/toString'
import { Numberish } from '@/types/constants'
import parseNumberInfo from '@/functions/numberish/parseNumberInfo'

interface Props {
  open: boolean
  coin1?: SplToken
  coin2?: SplToken
  coin1Amount?: Numberish
  coin2Amount?: Numberish
  focusSide?: ConcentratedStore['focusSide']
  decimals: number
  currentPrice?: Fraction
  position?: { min: string; max: string }
  totalDeposit: string
  inRange: boolean
  feeRate: string
  onConfirm?: (close: () => void) => void
  onClose: () => void
}

const maxAcceptPriceDecimal = 15

const maxSignificantCount = (decimals: number) => Math.min(decimals + 2, maxAcceptPriceDecimal)

export default function CreatePoolPreviewDialog({
  open,
  coin1,
  coin2,
  coin1Amount,
  coin2Amount,
  focusSide,
  decimals,
  currentPrice,
  position,
  totalDeposit,
  inRange,
  feeRate,
  onConfirm,
  onClose
}: Props) {
  const hasConfirmed = react.useRef(false)
  const decimalPlace = Math.min(decimals, 6)

  const confirm = react.useCallback(
    (close: () => void) => {
      onConfirm?.(close)
      hasConfirmed.current = true
    },
    [onClose]
  )

  const close = react.useCallback(() => {
    onClose()
  }, [onClose])

  const minPrice = toString(position?.min, {
    decimalLength: maxAcceptPriceDecimal,
    maxSignificantCount: maxSignificantCount(decimalPlace)
  })
  const maxPrice = toString(position?.max, {
    decimalLength: maxAcceptPriceDecimal,
    maxSignificantCount: maxSignificantCount(decimalPlace)
  })

  const minValueDecimalsIsBiggerThan10 = (parseNumberInfo(minPrice).dec?.length ?? 0) > 10
  const maxValueDecimalsIsBiggerThan10 = (parseNumberInfo(maxPrice).dec?.length ?? 0) > 10

  return (
    <Dialog open={open} onClose={close}>
      {({ close }) => (
        <Card
          className={twMerge(
            `p-6 mobile:py-4 mobile:px-2 rounded-3xl w-[min(480px,95vw)] mx-8 border-1.5 border-[rgba(171,196,255,0.2)]  bg-cyberpunk-card-bg shadow-cyberpunk-card`
          )}
          size="lg"
        >
          <Row className="justify-between items-center mb-6 mobile:mb-3">
            <div className="text-xl font-semibold text-white mobile:text-base">
              Preview Deposit to {coin1?.symbol} / {coin2?.symbol}
            </div>
            <Icon className="text-[#ABC4FF] cursor-pointer" heroIconName="x" onClick={close} />
          </Row>
          <div className="mt-4 border-1.5 border-[#abc4ff40] rounded-xl p-3 mobile:p-2 mobile:mt-3">
            <span className="text-sm leading-[18px] text-secondary-title">My Position</span>
            <div className="text-sm flex leading-[18px] flex-col pt-2.5">
              <div className="flex justify-between mb-2.5">
                <span className="flex items-center text-sm text-[#abc4ff]">
                  <CoinAvatar className="inline-block mr-1" size="sm" token={coin1} />
                  {coin1?.symbol}
                </span>
                <span>
                  {toString(coin1Amount)} {coin1?.symbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center text-sm text-[#abc4ff]">
                  <CoinAvatar className="inline-block mr-1" size="sm" token={coin2} />
                  {coin2?.symbol}
                </span>
                <span>
                  {toString(coin2Amount)} {coin2?.symbol}
                </span>
              </div>
              <div className="flex justify-between mt-2 pl-1">
                <span className="flex items-center text-sm text-[#abc4ff]">Fee tier</span>
                <span>{feeRate}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 border-1.5 border-[#abc4ff40] rounded-xl p-3 mobile:p-2 mobile:mt-3">
            <div className="text-sm flex justify-between leading-[18px] mb-2 font-medium mobile:text-xs">
              <span className="flex text-sm leading-[18px] text-secondary-title mr-2">Current Price</span>
              {currentPrice ? shakeZero(toString(currentPrice, { decimalLength: maxAcceptPriceDecimal })) : '0'}{' '}
              {(focusSide === 'coin1' ? coin2 : coin1)?.symbol} per {(focusSide === 'coin1' ? coin1 : coin2)?.symbol}
            </div>
            <div className="flex justify-between mb-3">
              <span className="text-sm leading-[18px] text-secondary-title">Selected Range</span>
              <span>
                {inRange ? (
                  <Row className="items-center bg-[#142B45] rounded text-xs text-[#39D0D8] py-0.5 px-1 ml-2">
                    <Icon size="xs" iconSrc={'/icons/check-circle.svg'} />
                    <div className="mobile:text-2xs font-normal" style={{ marginLeft: 4 }}>
                      In Range
                    </div>
                  </Row>
                ) : (
                  <Row className="items-center bg-[#DA2EEF]/10 rounded text-xs text-[#DA2EEF] py-0.5 px-1 ml-2">
                    <Icon size="xs" iconSrc={'/icons/warn-stick.svg'} />
                    <div className="mobile:text-2xs font-normal" style={{ marginLeft: 4 }}>
                      Out of Range
                    </div>
                  </Row>
                )}
              </span>
            </div>

            <div className="flex gap-3">
              <div className="border-1.5 justify-center text-center flex-1 border-light-blue-opacity rounded-xl p-3 mobile:p-2">
                <span className="text-sm leading-[18px] text-secondary-title">Min Price</span>
                <div
                  className={`my-3 ${
                    minValueDecimalsIsBiggerThan10 ? 'text-lg mobile:text-sm' : 'text-xl mobile:text-base'
                  }`}
                >
                  {minPrice}
                </div>
                <div className="text-sm text-[#abc4ff80]">
                  {coin2?.symbol} per {coin1?.symbol}
                </div>
              </div>
              <div className="border-1.5 justify-center text-center flex-1 border-light-blue-opacity rounded-xl p-3 mobile:p-2">
                <span className="text-sm leading-[18px] text-secondary-title">Max Price</span>
                <div
                  className={`my-3 ${
                    maxValueDecimalsIsBiggerThan10 ? 'text-lg mobile:text-sm' : 'text-xl mobile:text-base'
                  }`}
                >
                  {maxPrice}
                </div>
                <div className="text-sm text-[#abc4ff80]">
                  {coin2?.symbol} per {coin1?.symbol}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 border-1.5 border-[#abc4ff40] rounded-xl p-3 mobile:p-2 mobile:mt-3">
            <div className="flex justify-between items-center">
              <span className="text-sm leading-[18px] text-secondary-title">Total Deposit</span>
              <span className="text-lg">{totalDeposit}</span>
            </div>
          </div>
          <Col className="items-center mt-5 mobile:mt-3">
            <div className="self-stretch">
              <Col>
                <Button className={`frosted-glass-teal`} onClick={() => confirm(close)}>
                  Create Pool and Deposit
                </Button>
              </Col>
            </div>
          </Col>
        </Card>
      )}
    </Dialog>
  )
}
