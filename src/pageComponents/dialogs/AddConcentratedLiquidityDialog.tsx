import { useEffect, useMemo, useRef, useState } from 'react'

import { Price, ZERO } from '@raydium-io/raydium-sdk'

import useAppSettings from '@/application/common/useAppSettings'
import txIncreaseConcentrated from '@/application/concentrated/txIncreaseConcentrated'
import useConcentrated from '@/application/concentrated/useConcentrated'
import useConcentratedAmountCalculator from '@/application/concentrated/useConcentratedAmountCalculator'
import { getTransferFeeInfo } from '@/application/token/getTransferFeeInfos'
import { isToken2022 } from '@/application/token/isToken2022'
import useToken from '@/application/token/useToken'
import useWallet from '@/application/wallet/useWallet'
import { AsyncAwait } from '@/components/AsyncAwait'
import { Token2022Badge } from '@/components/Badge'
import Button, { ButtonHandle } from '@/components/Button'
import Card from '@/components/Card'
import CoinAvatar from '@/components/CoinAvatar'
import CoinInputBox, { CoinInputBoxHandle } from '@/components/CoinInputBox'
import Col from '@/components/Col'
import FadeInStable from '@/components/FadeIn'
import Grid from '@/components/Grid'
import Icon from '@/components/Icon'
import ResponsiveDialogDrawer from '@/components/ResponsiveDialogDrawer'
import Row from '@/components/Row'
import Tooltip from '@/components/Tooltip'
import toPubString from '@/functions/format/toMintString'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import toUsdVolume from '@/functions/format/toUsdVolume'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { gt, isMeaningfulNumber, lt } from '@/functions/numberish/compare'
import { add, mul } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'
import useInit from '@/hooks/useInit'
import { useToken2022FeeTooHighWarningChecker } from '@/hooks/useToken2022FeeTooHighWarningChecker'

export function AddConcentratedLiquidityDialog() {
  useConcentratedAmountCalculator()
  useInit(() => {
    useConcentrated.setState({
      coin1Amount: undefined,
      coin2Amount: undefined,
      coin1AmountFee: undefined,
      coin2AmountFee: undefined,
      coin1ExpirationTime: undefined,
      coin2ExpirationTime: undefined
    })
  })
  const getBalance = useWallet((s) => s.getBalance)
  const open = useConcentrated((s) => s.isAddDialogOpen)
  const refreshConcentrated = useConcentrated((s) => s.refreshConcentrated)
  const walletConnected = useWallet((s) => s.connected)
  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)
  const buttonComponentRef = useRef<ButtonHandle>()
  const coinInputBoxComponentRef1 = useRef<CoinInputBoxHandle>()
  const coinInputBoxComponentRef2 = useRef<CoinInputBoxHandle>()
  const currentAmmPool = useConcentrated((s) => s.currentAmmPool)
  const coinBase = currentAmmPool?.base
  const coinQuote = currentAmmPool?.quote
  const currentPrice = currentAmmPool?.currentPrice
  const targetUserPositionAccount = useConcentrated((s) => s.targetUserPositionAccount)
  const originalCoin1 = useConcentrated((s) => s.coin1)
  const originalCoin2 = useConcentrated((s) => s.coin2)
  const liquidity = useConcentrated((s) => s.liquidity)
  const decimals =
    originalCoin1 || originalCoin2 ? Math.max(originalCoin1?.decimals ?? 0, originalCoin2?.decimals ?? 0) : 6
  const tokenPrices = useToken((s) => s.tokenPrices)
  const originalCoin1Amount = useConcentrated((s) => s.coin1Amount)
  const originalCoin2Amount = useConcentrated((s) => s.coin2Amount)
  const focusSide = isMintEqual(coinBase?.mint, originalCoin1?.mint) ? 'coin1' : 'coin2'
  const coinBaseAmount = focusSide === 'coin1' ? originalCoin1Amount : originalCoin2Amount
  const coinQuoteAmount = focusSide === 'coin1' ? originalCoin2Amount : originalCoin1Amount

  const coinBaseFeeInfo = useMemo(
    () =>
      coinBase && coinBaseAmount && isToken2022(coinBase)
        ? getTransferFeeInfo({ amount: toTokenAmount(coinBase, coinBaseAmount, { alreadyDecimaled: true }) })
        : undefined,
    [coinBase, coinBaseAmount]
  )

  const coinQuoteFeeInfo = useMemo(
    () =>
      coinQuote && coinQuoteAmount && isToken2022(coinQuote)
        ? getTransferFeeInfo({ amount: toTokenAmount(coinQuote, coinQuoteAmount, { alreadyDecimaled: true }) })
        : undefined,
    [coinQuote, coinQuoteAmount]
  )

  const haveAnyToken2022 = isToken2022(coinBase) || isToken2022(coinQuote)

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

  const isMobile = useAppSettings((s) => s.isMobile)

  const { Token2022FeeTooHighWarningChip, isWarningChipOpen } = useToken2022FeeTooHighWarningChecker([
    { token: coinBase, amount: coinBaseAmount },
    { token: coinQuote, amount: coinQuoteAmount }
  ])

  return (
    <ResponsiveDialogDrawer
      placement="from-bottom"
      open={open}
      onClose={() => {
        useConcentrated.setState({
          isAddDialogOpen: false,
          coin1Amount: undefined,
          coin2Amount: undefined
        })
      }}
    >
      {({ close: closeDialog }) => (
        <Card
          className="p-8 mobile:p-4 pb-2 rounded-3xl mobile:rounded-lg w-[min(456px,90vw)] mobile:w-full border-1.5 border-[rgba(171,196,255,0.2)] bg-cyberpunk-card-bg shadow-cyberpunk-card"
          size="lg"
        >
          <Row className="justify-between items-center mb-6 mobile:mb-3">
            <div className="mobile:text-base text-xl font-semibold text-white">
              Add Liquidity to {coinBase?.symbol ?? '--'} - {coinQuote?.symbol ?? '--'}{' '}
            </div>
            <Icon className="text-[#ABC4FF] cursor-pointer" heroIconName="x" onClick={closeDialog} />
          </Row>

          <Col className="gap-2 mobile:gap-1 border-1.5 rounded-xl border-[#abc4ff40] p-2.5 mobile:p-2 mb-4 mobile:mb-2">
            <div className="font-medium text-sm text-[#abc4ff] mobile:pb-1">My Position</div>
            <Row className="items-center">
              <CoinAvatar token={coinBase} size={isMobile ? 'xs' : 'sm'} />
              <div className="ml-2 mr-auto text-sm mobile:text-xs text-[#abc4ff80]">{coinBase?.symbol ?? '--'}</div>
              <div className="text-white font-medium text-sm mobile:text-xs">
                {toString(targetUserPositionAccount?.amountA)} {coinBase?.symbol ?? '--'}
              </div>
            </Row>
            <Row className="items-center">
              <CoinAvatar token={coinQuote} size={isMobile ? 'xs' : 'sm'} />
              <div className="ml-2 mr-auto text-sm mobile:text-xs text-[#abc4ff80]">{coinQuote?.symbol ?? '--'}</div>
              <div className="text-white font-medium text-sm mobile:text-xs">
                {toString(targetUserPositionAccount?.amountB)} {coinQuote?.symbol ?? '--'}
              </div>
            </Row>
          </Col>

          <Col className="gap-2 border-1.5 rounded-xl border-[#abc4ff40] p-2.5 mobile:p-2 mb-4 mobile:mb-2">
            <Row className="items-center py-1">
              <div className="font-medium text-sm text-[#abc4ff] mr-auto">Selected Range</div>
              <Row>
                <div className="text-[#abc4ff80] text-xs mr-2">current Price</div>
                <div className="text-white font-medium text-xs">
                  {currentPrice ? toString(currentPrice, { decimalLength: decimals }) : '0'} {coinQuote?.symbol ?? '--'}{' '}
                  per {coinBase?.symbol ?? '--'}
                </div>
              </Row>
            </Row>
            <Grid className="grid-cols-2 gap-4 mobile:gap-2">
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

          <Col className="gap-3 mobile:gap-2 mb-6 mobile:mb-2">
            {/* input-container-box */}
            <CoinInputBox
              hideTransferFee
              className="p-4 mobile:py-2"
              componentRef={coinInputBoxComponentRef1}
              disabled={gt(currentPrice, targetUserPositionAccount?.priceUpper)}
              renderDisabledMask={<InputLocked />}
              haveCoinIcon
              topLeftLabel={'Amount'}
              token={coinBase}
              maxValue={
                coinBase
                  ? toTokenAmount(coinBase, mul(getBalance(coinBase), 0.985), { alreadyDecimaled: true })
                  : undefined
              }
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
              hideTransferFee
              className="p-4 mobile:py-2"
              componentRef={coinInputBoxComponentRef2}
              disabled={lt(currentPrice, targetUserPositionAccount?.priceLower)}
              renderDisabledMask={<InputLocked />}
              haveCoinIcon
              topLeftLabel={'Amount'}
              token={coinQuote}
              maxValue={
                coinQuote
                  ? toTokenAmount(coinQuote, mul(getBalance(coinQuote), 0.985), { alreadyDecimaled: true })
                  : undefined
              }
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
            {Token2022FeeTooHighWarningChip({ className: 'pt-1' })}
          </Col>

          <FadeInStable show={isMeaningfulNumber(coinBaseAmount)}>
            <Col className="gap-2 mobile:gap-1 border-1.5 rounded-xl border-[#abc4ff40] py-2.5 px-3 mb-4">
              <Col className="justify-between">
                {haveAnyToken2022 ? (
                  <Grid className="mb-1 grid-cols-[2.5fr,2fr,2fr] items-center text-xs text-[#abc4ff]">
                    <div></div>
                    <Row className="justify-self-end items-center">
                      <div>Token2022 Fee</div>
                      <Tooltip>
                        <Icon iconClassName="ml-1" size="xs" heroIconName="question-mark-circle" />
                        <Tooltip.Panel>
                          <div className="max-w-[200px] space-y-1.5 text-[#abc4ff]">
                            Tokens with a transfer fee use the Token2022 program and have a fee programed for all token
                            interactions.
                          </div>
                        </Tooltip.Panel>
                      </Tooltip>
                    </Row>
                    <div className="justify-self-end">Final Deposit</div>
                  </Grid>
                ) : undefined}

                <Col className="gap-1">
                  {[
                    {
                      isToken2022: isToken2022(coinBase),
                      token: coinBase,
                      info: coinBaseFeeInfo,
                      rawAmount: coinBaseAmount
                    },
                    {
                      isToken2022: isToken2022(coinQuote),
                      token: coinQuote,
                      info: coinQuoteFeeInfo,
                      rawAmount: coinQuoteAmount
                    }
                  ].map(({ isToken2022, token, info, rawAmount }) => (
                    <Grid className="grid-cols-[2.5fr,2fr,2fr] items-center" key={toPubString(token?.mint)}>
                      <Row className="items-center gap-1 overflow-hidden">
                        <div className="font-medium text-white">{token?.symbol}</div>
                        <CoinAvatar size="sm" token={token} />
                        {isToken2022 && <Token2022Badge />}
                      </Row>

                      <div className="justify-self-end font-medium text-xs text-[#abc4ff]">
                        {haveAnyToken2022 ? (
                          isToken2022 ? (
                            <AsyncAwait promise={info} fallback="--">
                              {(info) => (info?.fee ? <div>{toString(info.fee)}</div> : '-')}
                            </AsyncAwait>
                          ) : (
                            '-'
                          )
                        ) : (
                          ''
                        )}
                      </div>

                      <div className="justify-self-end font-medium text-white overflow-hidden">
                        {isToken2022 ? (
                          <AsyncAwait promise={info} fallback="--">
                            {(info) =>
                              info?.pure ? <div>{toString(info.pure, { decimalLength: 'auto 5' })}</div> : undefined
                            }
                          </AsyncAwait>
                        ) : (
                          <div>{toString(rawAmount, { decimalLength: 'auto 5' })}</div>
                        )}
                      </div>
                    </Grid>
                  ))}
                </Col>
              </Col>
              <Row className="items-center">
                <div className="mr-auto text-sm mobile:text-xs text-[#abc4ff]">Total Deposit</div>
                <div className="text-white font-medium text-sm">{toUsdVolume(totalVolume)}</div>
              </Row>
            </Col>
          </FadeInStable>

          <Row className="flex-col gap-1">
            <Button
              className="frosted-glass frosted-glass-teal mobile:text-sm"
              size={isMobile ? 'sm' : undefined}
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
                { not: isWarningChipOpen },
                {
                  should: isMeaningfulNumber(coinBaseAmount) || isMeaningfulNumber(coinQuoteAmount)
                },
                {
                  not: liquidity?.eq(ZERO), // this is Rudy's logic, don't know why
                  fallbackProps: { children: 'Token Amount Fail to Create Position' }
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
                txIncreaseConcentrated().then((result) => {
                  if (result?.allSuccess) {
                    refreshConcentrated()
                    useConcentrated.setState({
                      isAddDialogOpen: false,
                      coin1Amount: undefined,
                      coin2Amount: undefined,
                      coin1AmountFee: undefined,
                      coin2AmountFee: undefined,
                      coin1SlippageAmount: undefined,
                      coin2SlippageAmount: undefined,
                      coin1ExpirationTime: undefined,
                      coin2ExpirationTime: undefined
                    })
                  }
                })
              }}
            >
              Add Liquidity
            </Button>
            <Button
              type="text"
              size={isMobile ? 'sm' : undefined}
              className="text-sm text-[#ABC4FF] opacity-50 backdrop-filter-none"
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

function InputLocked() {
  return (
    <div className="absolute text-sm flex flex-col border-1.5 border-[#abc4ff40] text-center justify-center items-center p-2 w-full h-full bg-[#141041] bg-opacity-80 z-10 rounded-xl">
      <Icon className="mb-1" heroIconName="lock-closed" size="sm" />
      Current price is outside your selected range. Single-asset deposit only.
    </div>
  )
}
