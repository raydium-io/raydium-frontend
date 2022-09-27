import useAppSettings from '@/application/appSettings/useAppSettings'
import txIncreaseConcentrated from '@/application/concentrated/txIncreaseConcentrated'
import useConcentrated from '@/application/concentrated/useConcentrated'
import useConcentratedAmountCalculator from '@/application/concentrated/useConcentratedAmountCalculator'
import useToken from '@/application/token/useToken'
import useWallet from '@/application/wallet/useWallet'
import Button, { ButtonHandle } from '@/components/Button'
import Card from '@/components/Card'
import CoinAvatar from '@/components/CoinAvatar'
import CoinAvatarPair from '@/components/CoinAvatarPair'
import CoinInputBox, { CoinInputBoxHandle } from '@/components/CoinInputBox'
import Col from '@/components/Col'
import Dialog from '@/components/Dialog'
import FadeInStable, { FadeIn } from '@/components/FadeIn'
import Grid from '@/components/Grid'
import Icon from '@/components/Icon'
import Row from '@/components/Row'
import toPubString from '@/functions/format/toMintString'
import toPercentString from '@/functions/format/toPercentString'
import toUsdCurrency from '@/functions/format/toUsdCurrency'
import toUsdVolume from '@/functions/format/toUsdVolume'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { isMeaningfulNumber } from '@/functions/numberish/compare'
import { add, div, mul } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'
import { useEffect, useRef, useState } from 'react'
import { Price } from 'test-r-sdk'

export function AddConcentratedLiquidityDialog() {
  useConcentratedAmountCalculator()
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
  const tokenPrices = useToken((s) => s.tokenPrices)
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

  const tokenPriceBase: Price | undefined = tokenPrices[toPubString(coinBase?.mint)]
  const tokenPriceQuote: Price | undefined = tokenPrices[toPubString(coinQuote?.mint)]
  const baseVolume = mul(coinBaseAmount, tokenPriceBase)
  const quoteVolume = mul(coinQuoteAmount, tokenPriceQuote)
  const totalVolume = add(baseVolume, quoteVolume)
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
          className="backdrop-filter backdrop-blur-xl p-8 pb-2 rounded-3xl w-[min(456px,90vw)] border-1.5 border-[rgba(171,196,255,0.2)] bg-cyberpunk-card-bg shadow-cyberpunk-card"
          size="lg"
        >
          <Row className="justify-between items-center mb-6">
            <div className="text-xl font-semibold text-white">
              Add Liquidity to {coinBase?.symbol ?? '--'} - {coinQuote?.symbol ?? '--'}{' '}
            </div>
            <Icon className="text-[#ABC4FF] cursor-pointer" heroIconName="x" onClick={closeDialog} />
          </Row>

          <Col className="gap-2 border-1.5 rounded-xl border-[#abc4ff40] py-2.5 px-2.5 mb-4">
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

          <Col className="gap-2 border-1.5 rounded-xl border-[#abc4ff40] py-2.5 px-2.5 mb-4">
            <Row className="items-center py-1">
              <div className="font-medium text-sm text-[#abc4ff] mr-auto">Selected Range</div>
              <Row>
                <div className="text-[#abc4ff80] text-xs mr-2">current Price</div>
                <div className="text-white font-medium text-xs">
                  {0.01} {coinQuote?.symbol ?? '--'} per {coinBase?.symbol ?? '--'}
                </div>
              </Row>
            </Row>
            <Grid className="grid-cols-2 gap-4">
              <Col className="gap-2 border-1.5 rounded-xl border-[#39d0d866] items-center py-3">
                <div className="text-[#abc4ff] text-sm">Min Price</div>
                <div className="text-white text-xl font-medium">{toString(targetUserPositionAccount?.priceLower)}</div>
                <div className="text-[#abc4ff80] text-xs">
                  {coinQuote?.symbol ?? '--'} per {coinBase?.symbol ?? '--'}
                </div>
              </Col>
              <Col className="gap-2 border-1.5 rounded-xl border-[#39d0d866] items-center py-3">
                <div className="text-[#abc4ff] text-sm">Max Price</div>
                <div className="text-white text-xl font-medium">{toString(targetUserPositionAccount?.priceUpper)}</div>
                <div className="text-[#abc4ff80] text-xs">
                  {coinQuote?.symbol ?? '--'} per {coinBase?.symbol ?? '--'}
                </div>
              </Col>
            </Grid>
          </Col>

          <Col className="gap-3 mb-6">
            {/* input-container-box */}
            <CoinInputBox
              className="p-4"
              componentRef={coinInputBoxComponentRef1}
              haveCoinIcon
              topLeftLabel={'Amount'}
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
              topLeftLabel={'Amount'}
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
          </Col>

          <FadeInStable show={isMeaningfulNumber(coinBaseAmount)}>
            <Col className="gap-2 border-1.5 rounded-xl border-[#abc4ff40] py-2.5 px-2.5 mb-4">
              <Row className="items-center">
                <div className="ml-2 mr-auto text-sm text-[#abc4ff]">Total Deposit</div>
                <div className="text-white font-medium text-sm">{toUsdVolume(totalVolume)}</div>
              </Row>
              <Row className="items-center">
                <div className="ml-2 mr-auto text-sm text-[#abc4ff]">Deposit Ratio</div>
                <Row className="items-center">
                  <CoinAvatarPair token1={coinBase} token2={coinQuote} size="sm" className="mr-1" />
                  <div className="text-white font-medium text-xs">
                    {toPercentString(div(baseVolume, totalVolume))} / {toPercentString(div(quoteVolume, totalVolume))}
                  </div>
                </Row>
              </Row>
            </Col>
          </FadeInStable>

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
