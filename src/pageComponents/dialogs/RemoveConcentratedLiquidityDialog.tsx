import { useEffect, useRef, useState } from 'react'

import { twMerge } from 'tailwind-merge'

import useAppSettings from '@/application/appSettings/useAppSettings'
import txDecreaseConcentrated from '@/application/concentrated/txDecreaseConcentrated'
import useConcentrated from '@/application/concentrated/useConcentrated'
import useWallet from '@/application/wallet/useWallet'
import Button, { ButtonHandle } from '@/components/Button'
import Card from '@/components/Card'
import CoinInputBox, { CoinInputBoxHandle } from '@/components/CoinInputBox'
import Col from '@/components/Col'
import Icon from '@/components/Icon'
import ResponsiveDialogDrawer from '@/components/ResponsiveDialogDrawer'
import Row from '@/components/Row'
import toUsdVolume from '@/functions/format/toUsdVolume'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { gt } from '@/functions/numberish/compare'
import { toString } from '@/functions/numberish/toString'
import useConcentratedPendingYield from '@/hooks/useConcentratedPendingYield'
import useInit from '@/hooks/useInit'

import ConcentratedLiquiditySlider from '../ConcentratedRangeChart/ConcentratedLiquiditySlider'
import { routeTo } from '@/application/routeTools'

export function RemoveConcentratedLiquidityDialog({ className, onClose }: { className?: string; onClose?(): void }) {
  useInit(() => {
    useConcentrated.setState({ coin1Amount: undefined, coin2Amount: undefined })
  })
  // cache for UI
  const open = useConcentrated((s) => s.isRemoveDialogOpen)
  const refreshConcentrated = useConcentrated((s) => s.refreshConcentrated)
  const walletConnected = useWallet((s) => s.connected)
  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)
  const buttonComponentRef = useRef<ButtonHandle>()
  const coinInputBoxComponentRef1 = useRef<CoinInputBoxHandle>()
  const coinInputBoxComponentRef2 = useRef<CoinInputBoxHandle>()
  const currentAmmPool = useConcentrated((s) => s.currentAmmPool)
  const coinBase = currentAmmPool?.base
  const coinQuote = currentAmmPool?.quote
  const targetUserPositionAccount = useConcentrated((s) => s.targetUserPositionAccount)
  const originalCoin1 = useConcentrated((s) => s.coin1)
  const originalCoin1Amount = useConcentrated((s) => s.coin1Amount)
  const originalCoin2Amount = useConcentrated((s) => s.coin2Amount)
  const focusSide = isMintEqual(coinBase?.mint, originalCoin1?.mint) ? 'coin1' : 'coin2'
  const coinBaseAmount = focusSide === 'coin1' ? originalCoin1Amount : originalCoin2Amount
  const coinQuoteAmount = focusSide === 'coin1' ? originalCoin2Amount : originalCoin1Amount
  const [amountBaseIsOutOfMax, setAmountBaseIsOutOfMax] = useState(false)
  const [amountBaseIsNegative, setAmountBaseIsNegative] = useState(false)
  const [amountQuoteIsOutOfMax, setAmountQuoteIsOutOfMax] = useState(false)
  const [amountQuoteIsNegative, setAmountQuoteIsNegative] = useState(false)
  const liquidity = useConcentrated((s) => s.liquidity)
  const pendingYield = useConcentratedPendingYield(targetUserPositionAccount)
  const isMobile = useAppSettings((s) => s.isMobile)

  useEffect(() => {
    if (!currentAmmPool || !targetUserPositionAccount) return
    const coin1 = currentAmmPool?.base
    const coin2 = currentAmmPool?.quote
    useConcentrated.setState({
      coin1,
      coin2,
      priceLowerTick: targetUserPositionAccount.tickLower,
      priceUpperTick: targetUserPositionAccount.tickUpper
    })
  }, [currentAmmPool, targetUserPositionAccount])

  return (
    <ResponsiveDialogDrawer
      placement="from-bottom"
      open={open}
      onClose={() => {
        useConcentrated.setState({
          isRemoveDialogOpen: false,
          coin1Amount: undefined,
          coin2Amount: undefined
        })
      }}
    >
      {({ close: closeDialog }) => (
        <Card
          className={twMerge(
            'p-8 mobile:p-4 rounded-3xl w-[min(500px,90vw)] mobile:w-full border-1.5 border-[rgba(171,196,255,0.2)] bg-cyberpunk-card-bg shadow-cyberpunk-card',
            className
          )}
          size="lg"
        >
          <Row className="justify-between items-center mb-6 mobile:mb-3">
            <div className="mobile:text-base text-xl font-semibold text-white">
              Remove Liquidity from {coinBase?.symbol} - {coinQuote?.symbol}
            </div>
            <Icon className="text-[#ABC4FF] cursor-pointer" heroIconName="x" onClick={closeDialog} />
          </Row>

          <Col className="gap-3 mb-6 mobile:mb-4">
            {/* input-container-box */}

            <CoinInputBox
              componentRef={coinInputBoxComponentRef1}
              haveCoinIcon
              topLeftLabel={'Base'}
              topRightLabel={`Deposited: ${toString(targetUserPositionAccount?.amountA)}`}
              maxValue={targetUserPositionAccount?.amountA}
              canFillFullBalance
              token={coinBase}
              value={toString(coinBaseAmount)}
              onUserInput={(value) => {
                useConcentrated.setState({ isInput: true })
                if (focusSide === 'coin1') {
                  useConcentrated.setState({ coin1Amount: value, userCursorSide: 'coin1' })
                } else {
                  useConcentrated.setState({ coin2Amount: value, userCursorSide: 'coin2' })
                }
              }}
              onInputAmountClampInBalanceChange={({ negative, outOfMax }) => {
                setAmountBaseIsNegative(negative)
                setAmountBaseIsOutOfMax(outOfMax)
              }}
              onEnter={(input) => {
                if (!input) return
                buttonComponentRef.current?.click?.()
              }}
            />

            {/* input-container-box 2 */}
            <CoinInputBox
              componentRef={coinInputBoxComponentRef2}
              haveCoinIcon
              topLeftLabel={'Quote'}
              topRightLabel={`Deposited: ${toString(targetUserPositionAccount?.amountB)}`}
              maxValue={targetUserPositionAccount?.amountB}
              canFillFullBalance
              token={coinQuote}
              value={toString(coinQuoteAmount)}
              onUserInput={(value) => {
                useConcentrated.setState({ isInput: true })
                if (focusSide === 'coin1') {
                  useConcentrated.setState({ coin2Amount: value, userCursorSide: 'coin2' })
                } else {
                  useConcentrated.setState({ coin1Amount: value, userCursorSide: 'coin1' })
                }
              }}
              onInputAmountClampInBalanceChange={({ negative, outOfMax }) => {
                setAmountQuoteIsNegative(negative)
                setAmountQuoteIsOutOfMax(outOfMax)
              }}
              onEnter={(input) => {
                if (!input) return
                buttonComponentRef.current?.click?.()
              }}
            />
            <ConcentratedLiquiditySlider />
            <div className="py-3 px-3 ring-1 mobile:ring-1 ring-[#abc4ff40] rounded-xl mobile:rounded-xl ">
              <Row className="flex justify-between items-center text-[#ABC4FF] font-medium text-sm">
                <div className="text-base mobile:text-sm">Pending Yield</div>
                <div className="text-lg text-white">{toUsdVolume(pendingYield)}</div>
              </Row>
            </div>
          </Col>
          <Row className="flex-col gap-1">
            <Button
              size={isMobile ? 'sm' : undefined}
              className="frosted-glass frosted-glass-teal mobile:text-sm"
              isLoading={isApprovePanelShown}
              componentRef={buttonComponentRef}
              validators={[
                {
                  should: walletConnected,
                  forceActive: true,
                  fallbackProps: {
                    onClick: () => useAppSettings.setState({ isWalletSelectorShown: true }),
                    children: 'Connect Wallet'
                  }
                },
                {
                  should: !amountBaseIsOutOfMax,
                  fallbackProps: { children: `${coinBase?.symbol ?? ''} Amount Too Large` }
                },
                {
                  should: !amountBaseIsNegative,
                  fallbackProps: { children: `Negative ${coinBase?.symbol ?? ''} Amount` }
                },
                {
                  should: !amountQuoteIsOutOfMax,
                  fallbackProps: { children: `${coinQuote?.symbol ?? ''} Amount Too Large` }
                },
                {
                  should: !amountQuoteIsNegative,
                  fallbackProps: { children: `Negative ${coinQuote?.symbol ?? ''} Amount` }
                },
                {
                  should: gt(liquidity, 0),
                  fallbackProps: { children: `Enter Amount` }
                }
              ]}
              onClick={() => {
                txDecreaseConcentrated().then(({ allSuccess }) => {
                  if (allSuccess) {
                    onClose?.()
                    closeDialog()
                    refreshConcentrated()
                    useConcentrated.setState({
                      isAddDialogOpen: false,
                      coin1Amount: undefined,
                      coin2Amount: undefined
                    })
                    setTimeout(() => {
                      routeTo('/clmm/pools')
                    }, 600)
                  }
                })
              }}
            >
              Withdraw Liquidity
            </Button>
            <Button
              size={isMobile ? 'sm' : undefined}
              type="text"
              className="text-sm mobile:text-xs text-[#ABC4FF] opacity-50 backdrop-filter-none"
              onClick={closeDialog}
            >
              Cancel
            </Button>
          </Row>
        </Card>
      )}
    </ResponsiveDialogDrawer>
  )
}
