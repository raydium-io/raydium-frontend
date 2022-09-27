import useAppSettings from '@/application/appSettings/useAppSettings'
import txIncreaseConcentrated from '@/application/concentrated/txIncreaseConcentrated'
import useConcentrated from '@/application/concentrated/useConcentrated'
import useWallet from '@/application/wallet/useWallet'
import Button, { ButtonHandle } from '@/components/Button'
import Card from '@/components/Card'
import CoinAvatar from '@/components/CoinAvatar'
import CoinInputBox, { CoinInputBoxHandle } from '@/components/CoinInputBox'
import Col from '@/components/Col'
import Dialog from '@/components/Dialog'
import Icon from '@/components/Icon'
import Row from '@/components/Row'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { toString } from '@/functions/numberish/toString'
import { useEffect, useRef, useState } from 'react'

export function AddConcentratedLiquidityDialog() {
  const open = useConcentrated((s) => s.isAddDialogOpen)
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
    <Dialog
      open={open}
      onClose={() => {
        useConcentrated.setState({
          isAddDialogOpen: false
        })
      }}
    >
      {({ close: closeDialog }) => (
        <Card
          className="backdrop-filter backdrop-blur-xl p-8 rounded-3xl w-[min(456px,90vw)] border-1.5 border-[rgba(171,196,255,0.2)] bg-cyberpunk-card-bg shadow-cyberpunk-card"
          size="lg"
        >
          <Row className="justify-between items-center mb-6">
            <div className="text-xl font-semibold text-white">
              Add Concentrated to {coinBase?.symbol ?? '--'} - {coinQuote?.symbol ?? '--'}{' '}
            </div>
            <Icon className="text-[#ABC4FF] cursor-pointer" heroIconName="x" onClick={closeDialog} />
          </Row>

          <Col className="gap-2 border-1.5 rounded-lg border-[#abc4ff40] py-2.5 px-2.5 mb-4">
            <div className="font-medium text-sm text-[#abc4ff]">My Position</div>
            <Row className="items-center">
              <CoinAvatar token={coinBase} size="sm" />
              <div className="ml-2 mr-auto text-sm text-[#abc4ff80]">{coinBase?.symbol ?? '--'}</div>
              <div className="text-white font-medium text-sm">
                {toString(targetUserPositionAccount?.amountA)} {coinBase?.symbol ?? '--'}
              </div>
            </Row>
            <Row className="items-center">
              <CoinAvatar token={coinQuote} size="sm" />
              <div className="ml-2 mr-auto text-sm text-[#abc4ff80]">{coinQuote?.symbol ?? '--'}</div>
              <div className="text-white font-medium text-sm">
                {toString(targetUserPositionAccount?.amountB)} {coinQuote?.symbol ?? '--'}
              </div>
            </Row>
          </Col>

          <Col className="gap-2 border-1.5 rounded-lg border-[#abc4ff40] py-2.5 px-2.5 mb-4">
            <Row className="items-center">
              <div className="font-medium text-sm text-[#abc4ff]">Selected Range</div>
              <Row>
                <div className="text-[#abc4ff80] text-sm">current Price</div>
                <div className="text-white font-medium text-sm">
                  {0.01} {coinQuote?.symbol ?? '--'} / {coinQuote?.symbol ?? '--'}
                </div>
              </Row>
              <Row>
                <Col>
                  <div>Min Price</div>
                  <div>{0.08}</div>
                </Col>
              </Row>
            </Row>
            <Row className="items-center">
              <CoinAvatar token={coinBase} size="sm" />
              <div className="ml-2 mr-auto text-sm text-[#abc4ff80]">{coinBase?.symbol ?? '--'}</div>
              <div className="text-white font-medium text-sm">
                {toString(targetUserPositionAccount?.amountA)} {coinBase?.symbol ?? '--'}
              </div>
            </Row>
            <Row className="items-center">
              <CoinAvatar token={coinQuote} size="sm" />
              <div className="ml-2 mr-auto text-sm text-[#abc4ff80]">{coinQuote?.symbol ?? '--'}</div>
              <div className="text-white font-medium text-sm">
                {toString(targetUserPositionAccount?.amountB)} {coinQuote?.symbol ?? '--'}
              </div>
            </Row>
          </Col>

          <Col className="gap-3 mb-6">
            {/* input-container-box */}
            <CoinInputBox
              componentRef={coinInputBoxComponentRef1}
              haveCoinIcon
              topLeftLabel={'Base'}
              token={coinBase}
              value={toString(coinBaseAmount)}
              onUserInput={(value) => {
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
              token={coinQuote}
              value={toString(coinQuoteAmount)}
              onUserInput={(value) => {
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
            {/* {mode === 'remove' && <ConcentratedLiquiditySlider />} */}
          </Col>
          <Row className="flex-col gap-1">
            <Button
              className="frosted-glass frosted-glass-teal"
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
                }
              ]}
              onClick={() => {
                txIncreaseConcentrated().then(({ allSuccess }) => {
                  if (allSuccess) {
                    useConcentrated.setState({
                      isAddDialogOpen: false,
                      coin1Amount: undefined,
                      coin2Amount: undefined
                    })
                  }
                })
              }}
            >
              Add Liquidity
            </Button>
            <Button
              type="text"
              className="text-sm text-[#ABC4FF] opacity-50 backdrop-filter-none"
              onClick={closeDialog}
            >
              Cancel
            </Button>
          </Row>
        </Card>
      )}
    </Dialog>
  )
}
