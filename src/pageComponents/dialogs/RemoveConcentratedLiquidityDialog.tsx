import { useEffect, useMemo, useRef, useState } from 'react'

import { AmmV3, Token } from '@raydium-io/raydium-sdk'

import { twMerge } from 'tailwind-merge'

import { getEpochInfo } from '@/application/clmmMigration/getEpochInfo'
import { getMultiMintInfos } from '@/application/clmmMigration/getMultiMintInfos'
import useAppSettings from '@/application/common/useAppSettings'
import txDecreaseConcentrated, { MANUAL_ADJUST } from '@/application/concentrated/txDecreaseConcentrated'
import useConcentrated from '@/application/concentrated/useConcentrated'
import { getTransferFeeInfo } from '@/application/token/getTransferFeeInfos'
import { isToken2022 } from '@/application/token/isToken2022'
import { SplToken } from '@/application/token/type'
import useWallet from '@/application/wallet/useWallet'
import { AsyncAwait } from '@/components/AsyncAwait'
import Button, { ButtonHandle } from '@/components/Button'
import Card from '@/components/Card'
import CoinAvatar from '@/components/CoinAvatar'
import CoinInputBox, { CoinInputBoxHandle } from '@/components/CoinInputBox'
import Col from '@/components/Col'
import FadeInStable from '@/components/FadeIn'
import Icon from '@/components/Icon'
import ResponsiveDialogDrawer from '@/components/ResponsiveDialogDrawer'
import Row from '@/components/Row'
import Tooltip from '@/components/Tooltip'
import toPubString from '@/functions/format/toMintString'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import toUsdVolume from '@/functions/format/toUsdVolume'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { gt } from '@/functions/numberish/compare'
import { minus, mul } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'
import useConcentratedPendingYield from '@/hooks/useConcentratedPendingYield'
import { useEvent } from '@/hooks/useEvent'
import useInit from '@/hooks/useInit'
import { Numberish } from '@/types/constants'
import ConcentratedLiquiditySlider from '../ConcentratedRangeChart/ConcentratedLiquiditySlider'
import useAsyncMemo from '@/hooks/useAsyncMemo'

export function RemoveConcentratedLiquidityDialog({ className, onClose }: { className?: string; onClose?(): void }) {
  useInit(() => {
    useConcentrated.setState({
      coin1Amount: undefined,
      coin2Amount: undefined,
      coin1AmountFee: undefined,
      coin2AmountFee: undefined
    })
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
  const originalCoin2 = useConcentrated((s) => s.coin2)
  const originalCoin1Amount = useConcentrated((s) => s.coin1Amount)
  const originalCoin2Amount = useConcentrated((s) => s.coin2Amount)

  const originalCoin1AmountMin = useConcentrated((s) => s.coin1AmountMin)
  const originalCoin2AmountMin = useConcentrated((s) => s.coin2AmountMin)
  const focusSide = isMintEqual(coinBase?.mint, originalCoin1?.mint) ? 'coin1' : 'coin2'
  const [amountBaseIsOutOfMax, setAmountBaseIsOutOfMax] = useState(false)
  const [amountBaseIsNegative, setAmountBaseIsNegative] = useState(false)
  const [amountQuoteIsOutOfMax, setAmountQuoteIsOutOfMax] = useState(false)
  const [amountQuoteIsNegative, setAmountQuoteIsNegative] = useState(false)
  const liquidity = useConcentrated((s) => s.liquidity)
  const { getPendingTotal } = useConcentratedPendingYield(targetUserPositionAccount)
  const pendingTotalVolume = useAsyncMemo(() => (open ? getPendingTotal?.() : undefined), [open, getPendingTotal])
  const isMobile = useAppSettings((s) => s.isMobile)
  const [maxInfo, setMaxInfo] = useState<{
    coin1Amount?: Numberish
    coin2Amount?: Numberish
    coin1AmountFee?: Numberish
    coin2AmountFee?: Numberish
  }>({})

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

  useEffect(() => {
    useConcentrated.setState({
      coin1AmountMin: mul(originalCoin1Amount, MANUAL_ADJUST)
    })
  }, [originalCoin1Amount])
  useEffect(() => {
    useConcentrated.setState({
      coin2AmountMin: mul(originalCoin2Amount, MANUAL_ADJUST)
    })
  }, [originalCoin2Amount])

  const position = useMemo(() => {
    if (currentAmmPool && targetUserPositionAccount) {
      return currentAmmPool.positionAccount?.find(
        (p) => toPubString(p.nftMint) === toPubString(targetUserPositionAccount.nftMint)
      )
    }
    return undefined
  }, [currentAmmPool, targetUserPositionAccount])

  const calculateMaxLiquidity = useEvent(async () => {
    if (!position || !currentAmmPool || !coinBase || !coinQuote) return
    const [token2022Infos, epochInfo] = await Promise.all([
      getMultiMintInfos({ mints: [currentAmmPool.state.mintA.mint, currentAmmPool.state.mintB.mint] }),
      getEpochInfo()
    ])

    try {
      const amountFromLiquidity = AmmV3.getAmountsFromLiquidity({
        poolInfo: currentAmmPool.state,
        // ownerPosition: position,
        liquidity: position.liquidity,
        slippage: 0, // always 0, for remove liquidity only
        add: false,
        tickLower: position.tickLower,
        tickUpper: position.tickUpper,
        token2022Infos,
        epochInfo
      })

      const coin1Amount = toTokenAmount(
        currentAmmPool.base!,
        minus(amountFromLiquidity.amountSlippageA.amount, amountFromLiquidity.amountSlippageA.fee ?? 0)
      )
      const coin2Amount = toTokenAmount(
        currentAmmPool.quote!,
        minus(amountFromLiquidity.amountSlippageB.amount, amountFromLiquidity.amountSlippageB.fee ?? 0)
      )
      const coin1AmountFee = toTokenAmount(currentAmmPool.base!, amountFromLiquidity.amountSlippageA.fee)
      const coin2AmountFee = toTokenAmount(currentAmmPool.quote!, amountFromLiquidity.amountSlippageB.fee)
      setMaxInfo({
        coin1Amount: coin1Amount,
        coin2Amount: coin2Amount,
        coin1AmountFee: coin1AmountFee,
        coin2AmountFee: coin2AmountFee
      })
    } catch (err) {
      console.error(err)
    }
  })

  useEffect(() => {
    calculateMaxLiquidity()
  }, [toPubString(position?.nftMint), position?.liquidity])

  const removeMaxLiquidity = useEvent(() => {
    if (!position?.liquidity || !maxInfo.coin1Amount || !maxInfo.coin2Amount) return
    useConcentrated.setState({
      coin1Amount: maxInfo.coin1Amount,
      coin2Amount: maxInfo.coin2Amount,
      coin1AmountFee: maxInfo.coin1AmountFee,
      coin2AmountFee: maxInfo.coin2AmountFee,
      isInput: true,
      liquidity: position.liquidity
    })
  })

  return (
    <ResponsiveDialogDrawer
      placement="from-bottom"
      open={open}
      onClose={() => {
        useConcentrated.setState({
          isRemoveDialogOpen: false,
          coin1Amount: undefined,
          coin2Amount: undefined,
          coin1AmountFee: undefined,
          coin2AmountFee: undefined
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
              hideTransferFee
              componentRef={coinInputBoxComponentRef1}
              haveCoinIcon
              topLeftLabel={'Base'}
              topRightLabel={`Deposited: ${toString(targetUserPositionAccount?.amountA)}`}
              maxValue={maxInfo.coin1Amount}
              canFillFullBalance
              token={coinBase}
              value={toString(originalCoin1Amount, { decimalLength: `auto ${coinBase?.decimals ?? 10}` })}
              onUserInput={(value) => {
                useConcentrated.setState({ isInput: true })
                if (focusSide === 'coin1') {
                  useConcentrated.setState({ coin1Amount: value, userCursorSide: 'coin1' })
                } else {
                  useConcentrated.setState({ coin2Amount: value, userCursorSide: 'coin2' })
                }
              }}
              onCalculateTransferFee={(fee) => {
                if (focusSide === 'coin1') {
                  useConcentrated.setState({ coin1AmountFee: fee })
                } else {
                  useConcentrated.setState({ coin2AmountFee: fee })
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
              onCustomMax={() => {
                removeMaxLiquidity()
              }}
            />

            {/* input-container-box 2 */}
            <CoinInputBox
              hideTransferFee
              componentRef={coinInputBoxComponentRef2}
              haveCoinIcon
              topLeftLabel={'Quote'}
              topRightLabel={`Deposited: ${toString(targetUserPositionAccount?.amountB)}`}
              maxValue={maxInfo.coin2Amount}
              canFillFullBalance
              token={coinQuote}
              value={toString(originalCoin2Amount, { decimalLength: `auto ${coinQuote?.decimals ?? 10}` })}
              onUserInput={(value) => {
                useConcentrated.setState({ isInput: true })
                if (focusSide === 'coin1') {
                  useConcentrated.setState({ coin2Amount: value, userCursorSide: 'coin2' })
                } else {
                  useConcentrated.setState({ coin1Amount: value, userCursorSide: 'coin1' })
                }
              }}
              onCalculateTransferFee={(fee) => {
                if (focusSide === 'coin1') {
                  useConcentrated.setState({ coin2AmountFee: fee })
                } else {
                  useConcentrated.setState({ coin1AmountFee: fee })
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
              onCustomMax={() => {
                removeMaxLiquidity()
              }}
            />

            <ConcentratedLiquiditySlider />
            <div className="py-3 px-3 ring-1 mobile:ring-1 ring-[#abc4ff40] rounded-xl mobile:rounded-xl ">
              <Col>
                <Row className="flex justify-start items-center text-[#ABC4FF] font-medium text-sm">
                  <div className="text-base mobile:text-sm">Pending Yield</div>
                </Row>
                <Row className="flex justify-end items-center text-[#ABC4FF] font-medium text-sm">
                  {/* <AsyncAwait promise={pendingTotal} fallback="calculating">
                    {(v) => <div className="text-lg text-white">{toUsdVolume(v)}</div>}
                  </AsyncAwait> */}
                  <div className="text-lg text-white">{toUsdVolume(pendingTotalVolume)}</div>
                </Row>
                <FadeInStable show={gt(originalCoin1AmountMin, 0) || gt(originalCoin2AmountMin, 0)}>
                  <Row className="flex justify-start gap-1 items-center text-[#ABC4FF] font-medium text-sm">
                    Minimum Received
                    <Tooltip>
                      <Icon size="xs" heroIconName="question-mark-circle" className="cursor-help" />
                      <Tooltip.Panel>
                        <div className="max-w-[30em]">
                          The least amount of tokens you will receive. Tokens using the Token 2022 program may have
                          transfer fees programmed for token interactions.
                        </div>
                      </Tooltip.Panel>
                    </Tooltip>
                  </Row>
                  <Col className="pt-2 gap-2">
                    <MinWithdrawAmount token={coinBase} amountWithoutFee={originalCoin1AmountMin} className="px-1" />
                    <MinWithdrawAmount token={coinQuote} amountWithoutFee={originalCoin2AmountMin} className="px-1" />
                  </Col>
                </FadeInStable>
              </Col>
              <Row className="flex justify-between items-center text-[#ABC4FF] font-medium text-sm"></Row>
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
                txDecreaseConcentrated().then((res) => {
                  if (res?.allSuccess) {
                    onClose?.()
                    refreshConcentrated()
                    useConcentrated.setState({
                      isRemoveDialogOpen: false,
                      isMyPositionDialogOpen: false,
                      coin1Amount: undefined,
                      coin2Amount: undefined,
                      coin1AmountFee: undefined,
                      coin2AmountFee: undefined
                    })
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

function MinWithdrawAmount({
  token,
  amountWithoutFee: amount,
  className
}: {
  token: Token | SplToken | undefined
  amountWithoutFee: Numberish | undefined
  className?: string
}) {
  const isMobile = useAppSettings((s) => s.isMobile)
  const tokenAmount = token && amount ? toTokenAmount(token, amount, { alreadyDecimaled: true }) : undefined
  const feeInfo = tokenAmount && isToken2022(token) && getTransferFeeInfo({ amount: tokenAmount })
  return (
    <Row className={twMerge('w-full justify-between', className)}>
      <Row className="gap-2 items-center">
        <CoinAvatar size={isMobile ? 'xs' : 'md'} token={token} />
        {token?.symbol ?? '--'}
      </Row>
      <Row className="text-lg text-white items-center">
        {isToken2022(token) ? (
          <AsyncAwait promise={feeInfo} fallback="calculating">
            {(feeInfo) => (feeInfo ? toString(feeInfo.pure) : '--')}
          </AsyncAwait>
        ) : (
          toString(tokenAmount)
        )}
      </Row>
    </Row>
  )
}
