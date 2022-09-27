import React, * as react from 'react'
import { SplToken } from '@/application/token/type'
import { toString } from '@/functions/numberish/toString'
import { Numberish } from '@/types/constants'
import { twMerge } from 'tailwind-merge'
import CoinAvatar from '@/components/CoinAvatar'
import Button from '@/components/Button'
import Card from '@/components/Card'
import Col from '@/components/Col'
import Dialog from '@/components/Dialog'
import Icon from '@/components/Icon'
import Row from '@/components/Row'
import Decimal from 'decimal.js'

interface Props {
  coin1: SplToken
  coin2: SplToken
  coin1Amount: Numberish
  coin2Amount: Numberish
  decimals: number
  currentPrice: Decimal
  position: { min: number; max: number }
  totalDeposit: string
  onConfirm?: () => void
  onClose: () => void
}

export default function AddLiquidityConfirmDialog({
  coin1,
  coin2,
  coin1Amount,
  coin2Amount,
  decimals,
  currentPrice,
  position,
  totalDeposit,
  onConfirm,
  onClose
}: Props) {
  const hasConfirmed = react.useRef(false)
  const decimalPlace = Math.min(decimals, 6)

  const confirm = react.useCallback(() => {
    onConfirm?.()
    hasConfirmed.current = true
    onClose()
  }, [onClose])

  const close = react.useCallback(() => {
    onClose()
  }, [onClose])

  return (
    <Dialog open={true} onClose={close}>
      <Card
        className={twMerge(
          `p-6 rounded-3xl w-[min(480px,95vw)] mx-8 border-1.5 border-[rgba(171,196,255,0.2)]  bg-cyberpunk-card-bg shadow-cyberpunk-card`
        )}
        size="lg"
      >
        <Row className="justify-between items-center mb-6">
          <Icon className="text-[#ABC4FF] cursor-pointer" heroIconName="chevron-left" onClick={close} />
          <div className="text-xl font-semibold text-white">Preview Deposit to WETH / DAI</div>
          <Icon className="text-[#ABC4FF] cursor-pointer" heroIconName="x" onClick={close} />
        </Row>
        <div className="mt-4 border border-secondary-title border-opacity-50  rounded-xl p-3">
          <span className="text-sm leading-[18px] text-secondary-title">My Position</span>
          <div className="text-sm flex leading-[18px] flex-col pt-2.5">
            <div className="flex justify-between mb-2.5">
              <span className="flex items-center text-sm text-light-blue opacity-50">
                <CoinAvatar className="inline-block mr-1" noCoinIconBorder size="sm" token={coin1} />
                {coin1.symbol}
              </span>
              <span>
                {toString(coin1Amount)} {coin1.symbol}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="flex items-center text-sm text-light-blue opacity-50">
                <CoinAvatar className="inline-block mr-1" noCoinIconBorder size="sm" token={coin2} />
                {coin2.symbol}
              </span>
              <span>
                {toString(coin2Amount)} {coin2.symbol}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 border border-secondary-title border-opacity-50  rounded-xl p-3">
          <div className="flex justify-between mb-3">
            <span className="text-sm leading-[18px] text-secondary-title">Selected Range</span>
            <div className="text-sm flex items-center leading-[18px]">
              <span className="flex items-center text-sm text-light-blue opacity-50 mr-2">Current Price</span>
              {toString(currentPrice.toString(), { decimalLength: decimalPlace })} {coin2.symbol} per {coin1.symbol}
            </div>
          </div>

          <div className="flex gap-2">
            <div className="border justify-center text-center flex-1 border-light-blue-opacity rounded-xl p-3">
              <span className="text-sm leading-[18px] text-secondary-title">Min Price</span>
              <div className="text-xl my-3">{toString(position.min, { decimalLength: decimalPlace })}</div>
              <div className="text-sm text-light-blue opacity-50">
                {coin2.symbol} per {coin1.symbol}
              </div>
            </div>
            <div className="border justify-center text-center flex-1 border-light-blue-opacity rounded-xl p-3">
              <span className="text-sm leading-[18px] text-secondary-title">Max Price</span>
              <div className="text-xl my-3">{toString(position.max, { decimalLength: decimalPlace })}</div>
              <div className="text-sm text-light-blue opacity-50">
                {coin2.symbol} per {coin1.symbol}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 border border-secondary-title border-opacity-50  rounded-xl p-3">
          <div className="flex justify-between items-center">
            <span className="text-sm leading-[18px] text-secondary-title">Total Deposit</span>
            <span className="text-lg">{totalDeposit}</span>
          </div>
        </div>
        <Col className="items-center mt-5">
          <div className="self-stretch">
            <Col>
              <Button className={`frosted-glass-teal`} onClick={confirm}>
                Confirm Deposit
              </Button>
            </Col>
          </div>
        </Col>
      </Card>
    </Dialog>
  )
}
